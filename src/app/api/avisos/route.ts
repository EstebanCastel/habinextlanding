import { arrancanEn, salonDe, type Sesion } from "@/config/agenda";
import { crearSiNoExiste, escribir, leer } from "@/lib/almacen";
import { todos } from "@/lib/experiencia";
import { porToken as registroPorToken } from "@/lib/registros";
import { enviarSms } from "@/lib/sms";

/**
 * El aviso de «tu charla empieza ya».
 *
 * Quien marcó una sesión con el corazón —o reservó un taller— recibe un SMS
 * cinco minutos antes diciéndole a qué salón ir y quién la dicta. Es el
 * único aviso del día que llega sin que la persona abra nada: en un recinto
 * con dos salones corriendo en paralelo, la agenda guardada en el teléfono
 * no sirve de nada si hay que acordarse de mirarla.
 *
 * Va por SMS y no por WhatsApp a propósito: una plantilla de Meta se aprueba
 * en horas y esto se decidió la madrugada del evento. El SMS entra en la
 * pantalla de bloqueo sin app de por medio y se entrega en segundos.
 *
 * Lo dispara un cron cada minuto. Es **idempotente**: antes de mandar nada
 * escribe `avisos/<sesión>.json` con creación atómica, así que si dos
 * invocaciones coinciden —el cron de Vercel y el respaldo de la máquina del
 * equipo— solo una gana y nadie recibe el mensaje dos veces.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cuántos minutos antes avisa. */
const ANTES = 5;

const ruta = (id: string) => `avisos/${id}.json`;

type Bitacora = {
  sesion: string;
  disparadoEn: string;
  destinatarios: number;
  enviados: number;
  fallos: number;
  detalle: { a: string; ok: boolean; error?: string }[];
};

/**
 * El texto, sin tildes y en una sola parte de SMS.
 *
 * Fuera del alfabeto GSM una sola «ó» convierte el mensaje a UCS-2, lo parte
 * en dos y lo cobra doble.
 */
function texto(s: Sesion): string {
  const salon = salonDe(s.salon);
  const quien = s.ponente || s.ponentes?.[0] || "";
  const base = `Habi Next: en ${ANTES} min arranca "${gsm(s.titulo)}" en el Salon ${gsm(salon.rotulo)}.`;
  const conQuien = quien ? `${base} Con ${gsm(quien)}.` : base;
  // 160 caracteres es una parte de SMS; pasado eso se cobra y se parte.
  return conQuien.length <= 160 ? conQuien : `${base.slice(0, 157)}...`;
}

/**
 * Deja el texto dentro del alfabeto GSM de 7 bits.
 *
 * Un solo caracter fuera de el -y el punto medio que usamos en toda la
 * agenda es uno- convierte el SMS a UCS-2: el limite baja de 160 a 70
 * caracteres, el mensaje se parte en tres, se cobra triple y las partes
 * pueden llegar desordenadas. En un aviso de «arranca en cinco minutos» eso
 * es peor que no mandarlo.
 */
const gsm = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u00b7\u2022]/g, "-")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u00ab\u00bb\u201c\u201d"]/g, "")
    .replace(/\u2026/g, "...")
    .replace(/[^\n\r A-Za-z0-9@£$¥èéùìòÇØøÅåÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\\[~\]|]/g, "");

const digitos = (t: string | undefined | null) => String(t ?? "").replace(/\D/g, "");

/** A «57XXXXXXXXXX», que es lo único que Infobip acepta para Colombia. */
function telefonoBueno(crudo: string | undefined | null): string | null {
  const d = digitos(crudo);
  if (d.length === 10 && d.startsWith("3")) return `57${d}`;
  if (d.length === 12 && d.startsWith("57")) return d;
  return null;
}

async function avisarDe(s: Sesion): Promise<Bitacora | null> {
  // Creación atómica: el que gana manda, el resto se va en silencio.
  const marca: Bitacora = {
    sesion: s.id,
    disparadoEn: new Date().toISOString(),
    destinatarios: 0,
    enviados: 0,
    fallos: 0,
    detalle: [],
  };
  if (!(await crearSiNoExiste(ruta(s.id), marca))) return null;

  const gente = await todos().catch(() => []);
  const interesados = gente.filter(
    (p) => Boolean(p.agenda?.[s.id]) || (p.talleres ?? []).some((t) => t.id === s.id)
  );

  // El teléfono vive en el registro de boletería, no en el participante.
  const conTelefono = await Promise.all(
    interesados.map(async (p) => {
      if (!p.registro?.token) return null;
      const r = await registroPorToken(p.registro.token).catch(() => null);
      const tel = telefonoBueno(r?.luma.telefonoCrudo);
      return tel ? { tel, nombre: p.nombre ?? "" } : null;
    })
  );

  // Un mismo teléfono puede estar en dos documentos: se avisa una vez.
  const unicos = new Map<string, string>();
  for (const x of conTelefono) if (x) unicos.set(x.tel, x.nombre);

  marca.destinatarios = unicos.size;
  const cuerpo = texto(s);

  // En tandas y no en fila: el aviso vale por llegar antes de que arranque la
  // charla, y trescientos SMS de a uno no caben en el minuto que hay.
  const lista = [...unicos.keys()];
  const TANDA = 25;
  for (let i = 0; i < lista.length; i += TANDA) {
    const salidas = await Promise.all(
      lista.slice(i, i + TANDA).map(async (tel) => {
        const r = await enviarSms({ a: tel, texto: cuerpo, callbackData: { aviso: s.id } }).catch((e) => ({
          ok: false,
          error: e instanceof Error ? e.message : "falló",
        }));
        return { tel, ok: Boolean(r.ok), error: r.ok ? undefined : String((r as { error?: string }).error ?? "") };
      })
    );
    for (const x of salidas) {
      if (x.ok) marca.enviados += 1;
      else marca.fallos += 1;
      marca.detalle.push({ a: x.tel, ok: x.ok, ...(x.ok ? {} : { error: x.error ?? "" }) });
    }
  }

  await escribir(ruta(s.id), marca).catch(() => null);
  return marca;
}

export async function GET(request: Request) {
  const esperado = process.env.ADMIN_TOKEN ?? "";
  const dado = new URL(request.url).searchParams.get("k") ?? "";
  const porCron = request.headers.get("user-agent")?.includes("vercel-cron");
  if (!porCron && (!esperado || dado !== esperado)) {
    return Response.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }

  const sesiones = arrancanEn(ANTES);
  if (!sesiones.length) return Response.json({ ok: true, nada: true });

  const hechas = await Promise.all(sesiones.map((s) => avisarDe(s).catch(() => null)));
  return Response.json({
    ok: true,
    sesiones: sesiones.map((s) => s.id),
    resultado: hechas.map((h, i) =>
      h ? { sesion: h.sesion, destinatarios: h.destinatarios, enviados: h.enviados, fallos: h.fallos } : { sesion: sesiones[i].id, yaEstaba: true }
    ),
  });
}

/** Para mirar qué se mandó, sin volver a mandarlo. */
export async function POST(request: Request) {
  const esperado = process.env.ADMIN_TOKEN ?? "";
  const dado = new URL(request.url).searchParams.get("k") ?? "";
  if (!esperado || dado !== esperado) return Response.json({ ok: false }, { status: 401 });
  const cuerpo = (await request.json().catch(() => null)) as { sesion?: string } | null;
  if (!cuerpo?.sesion) return Response.json({ ok: false, error: "falta la sesión" }, { status: 400 });
  return Response.json({ ok: true, bitacora: await leer<Bitacora>(ruta(cuerpo.sesion)) });
}
