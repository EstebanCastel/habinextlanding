import { activeStageIndex, EVENT, TICKETS } from "@/config/event";
import { crearSiNoExiste, leer, listarRutas, modificar } from "./almacen";
import { BOTON_DUDA, BOTON_PAGUE, BOTON_VIP } from "./bot";
import { enviarCorreo } from "./correo";
import { anotar, porToken, primerNombre, type Etapa, type Registro, type Tier } from "./registros";
import { enviarSms } from "./sms";
import { enviarPlantilla, type Boton, type Salida } from "./whatsapp";

/**
 * La recuperación de pago: a quien se registró y no ha pagado se le vuelve a
 * poner el link de pago delante, por los tres canales que tenemos, con el
 * argumento que de verdad mueve: el precio sube en una fecha concreta.
 *
 * Tres reglas que gobiernan todo esto:
 *
 * - **Solo pendientes.** Quien ya pagó, mandó comprobante, entró con código o
 *   fue aprobado o rechazado en Luma no recibe nada. Se filtra por la etapa
 *   del embudo y por el estado de aprobación guardado desde Luma.
 * - **Cada canal se anota aparte.** El WhatsApp de bienvenida y el recordatorio
 *   son mensajes distintos; el panel tiene que poder decir «le llegó el
 *   recordatorio por SMS aunque el WhatsApp rebotó».
 * - **Nunca dos veces en dos días.** Una campaña que se relanza salta a quien
 *   ya recibió el recordatorio hace menos de 48 horas.
 */

export type Canal = "whatsapp" | "sms" | "correo";
export const CANALES: Canal[] = ["whatsapp", "sms", "correo"];
export const NOMBRE_CANAL: Record<Canal, string> = { whatsapp: "WhatsApp", sms: "SMS", correo: "Correo" };

const ETAPAS_PENDIENTES = new Set<Etapa>([
  "registrado",
  "mensaje_enviado",
  "mensaje_entregado",
  "mensaje_leido",
  "pago_abierto",
]);

/** Ni aprobados, ni rechazados, ni pagados, ni con código: los que faltan por pagar. */
export function pendientesDePago(registros: Registro[]): Registro[] {
  return registros.filter(
    (r) =>
      ETAPAS_PENDIENTES.has(r.etapa) &&
      !r.cortesia &&
      !/approved|declined|rejected|cancel/i.test(r.luma.estadoAprobacion || "")
  );
}

function sitio(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
}

export const enlaceDePago = (r: Registro) => `${sitio()}/p/${r.token}`;

/** Sin tildes ni eñes raras: para el SMS, que se cobra doble si sale del alfabeto GSM. */
export function sinTildes(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export type Tarifa = {
  tier: Tier;
  nombre: string;
  actual: string;
  siguiente: string | null;
  /** «5 de octubre»: hasta cuándo dura el precio actual. */
  limite: string | null;
  incluye: string[];
};

export function tarifaDe(tier: Tier, ahora = new Date()): Tarifa {
  const t = TICKETS.find((x) => x.id === tier)!;
  const i = activeStageIndex(t.stages, ahora);
  const actual = t.stages[i];
  const siguiente = t.stages[i + 1];
  const limite = actual.until
    ? new Date(actual.until).toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" })
    : null;
  return {
    tier,
    nombre: t.name,
    actual: actual.price,
    siguiente: siguiente?.price ?? null,
    limite,
    incluye: t.includes,
  };
}

/** El número de la línea de WhatsApp, para escribirlo en el correo. */
function lineaBonita(): string {
  const l = (process.env.INFOBIP_LINEA_CO || "").replace(/\D/g, "");
  if (l.length === 12 && l.startsWith("57")) return `+57 ${l.slice(2, 5)} ${l.slice(5, 8)} ${l.slice(8)}`;
  return l ? `+${l}` : "";
}

// ---------- los tres mensajes ----------

export function whatsappDe(r: Registro): {
  plantilla: string | undefined;
  placeholders: string[];
  botones: Boton[];
  imagen: string;
} {
  const esVip = r.tier === "vip";
  const nombre = r.luma.nombreCorto || primerNombre(r.luma.nombre) || "hola";
  const pago = (prefijo: string) => `${prefijo}_${r.token}`;
  return {
    plantilla: esVip ? process.env.INFOBIP_TPL_RECUPERA_VIP : process.env.INFOBIP_TPL_RECUPERA_GENERAL,
    // La plantilla lleva el nombre y el token; el link va escrito en el cuerpo
    // con el token al final, igual que en el mensaje de bienvenida.
    placeholders: [nombre, r.token],
    botones: esVip
      ? [
          { tipo: "QUICK_REPLY", parametro: pago(BOTON_PAGUE) },
          { tipo: "QUICK_REPLY", parametro: pago(BOTON_DUDA) },
        ]
      : [
          { tipo: "QUICK_REPLY", parametro: pago(BOTON_PAGUE) },
          { tipo: "QUICK_REPLY", parametro: pago(BOTON_VIP) },
          { tipo: "QUICK_REPLY", parametro: pago(BOTON_DUDA) },
        ],
    imagen: `${sitio()}/img/recupera-${r.tier}.jpg`,
  };
}

/** El cuerpo de la plantilla, tal como se registró en Meta, para verlo en el panel. */
export function cuerpoWhatsapp(tier: Tier): string {
  const t = tarifaDe(tier);
  const sube = t.siguiente && t.limite ? `Pero el precio no espera: el *${t.limite}* la entrada ${t.nombre} sube de *${t.actual} a ${t.siguiente}*.` : "";
  const que =
    tier === "vip"
      ? "Solo hay 250 cupos VIP: primeras filas, zona VIP con barra de snacks y bebidas, almuerzo, kit premium, material exclusivo y tu avatar digital."
      : "Un día completo para aprender a usar Inteligencia Artificial en tu negocio inmobiliario: atraer más clientes, crear contenido, organizar tus oportunidades y construir un asistente que trabaje por ti 24/7.";
  return [
    `Hola {{1}} 👋 Tu cupo ${t.nombre} en Habi Next Colombia sigue reservado 🎟️`,
    "",
    sube,
    "",
    `📅 ${EVENT.dateLong} · ${EVENT.venue}, ${EVENT.city}`,
    que,
    "",
    "Asegura tu entrada con tu link personal de pago 👇",
    `${sitio()}/p/{{2}}`,
    "",
    "Apenas pagues, mándanos el comprobante por acá y te aprobamos en el momento.",
  ]
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .join("\n");
}

export function smsDe(r: Registro): string {
  const t = tarifaDe(r.tier);
  const nombre = sinTildes(r.luma.nombreCorto || primerNombre(r.luma.nombre) || "").trim();
  const quien = nombre ? `${nombre}, ` : "";
  const sube = t.siguiente && t.limite ? ` El ${sinTildes(t.limite)} sube de ${t.actual} a ${t.siguiente}.` : "";
  return `Habi Next: ${quien}tu cupo ${t.nombre} sigue reservado.${sube} Paga aqui: ${enlaceDePago(r)}`;
}

const escapar = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function correoDe(r: Registro): { asunto: string; html: string; texto: string } {
  const t = tarifaDe(r.tier);
  const nombre = r.luma.nombreCorto || primerNombre(r.luma.nombre) || "";
  const enlace = enlaceDePago(r);
  const esVip = r.tier === "vip";
  const linea = lineaBonita();
  const imagen = `${sitio()}/img/recupera-${r.tier}.jpg`;

  const asunto = t.siguiente && t.limite
    ? `${nombre ? `${nombre}, ` : ""}tu cupo ${t.nombre} en Habi Next sube de precio el ${t.limite}`
    : `${nombre ? `${nombre}, ` : ""}tu cupo ${t.nombre} en Habi Next sigue reservado`;

  const sube = t.siguiente && t.limite
    ? `El <strong>${escapar(t.limite)}</strong> la entrada ${t.nombre} sube de <strong>${t.actual}</strong> a <strong>${t.siguiente}</strong>. Hoy la aseguras al precio de ahora.`
    : `Tu cupo sigue reservado. Asegúralo hoy con tu link personal de pago.`;

  const incluye = t.incluye.map((x) => `<li style="margin:0 0 6px">${escapar(x)}</li>`).join("");

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapar(asunto)}</title></head>
<body style="margin:0;padding:0;background:#ece2fa;font-family:Urbanist,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0410">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapar(sube.replace(/<[^>]+>/g, ""))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece2fa;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden">
  <tr><td><a href="${enlace}" style="display:block"><img src="${imagen}" width="600" alt="Tu cupo ${t.nombre} sigue reservado" style="display:block;width:100%;height:auto;border:0"></a></td></tr>
  <tr><td style="padding:36px 40px 8px">
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:#802ef6;font-weight:700">Habi Next Colombia · ${escapar(EVENT.dateShort)}</p>
    <h1 style="margin:0 0 16px;font-size:30px;line-height:1.1;letter-spacing:-.02em;font-weight:800">${nombre ? `${escapar(nombre)}, ` : ""}tu cupo ${t.nombre} sigue reservado.</h1>
    <p style="margin:0 0 22px;font-size:17px;line-height:1.55;color:#3a2f4a">${sube}</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#802ef6">
      <a href="${enlace}" style="display:inline-block;padding:16px 30px;font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">Pagar mi entrada ${t.nombre} · ${t.actual}</a>
    </td></tr></table>
    <p style="margin:14px 0 0;font-size:13px;color:#7a6f8c">Este link es tuyo: te lleva al pago seguro en Wompi con tu entrada ya identificada.</p>
  </td></tr>
  <tr><td style="padding:28px 40px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1ff;border-radius:16px">
      <tr><td style="padding:22px 24px">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#802ef6;font-weight:700">El evento</p>
        <p style="margin:0 0 4px;font-size:17px;font-weight:700">${escapar(EVENT.dateLong)}</p>
        <p style="margin:0 0 14px;font-size:15px;color:#3a2f4a">${escapar(EVENT.venue)} · ${escapar(EVENT.city)} · ${escapar(EVENT.durationLabel)}</p>
        <p style="margin:0;font-size:15px;line-height:1.55;color:#3a2f4a">Un día completo para aprender a usar Inteligencia Artificial en el negocio inmobiliario: atraer más clientes, crear contenido, organizar tus oportunidades y construir un asistente que trabaje por ti 24/7.</p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:26px 40px 0">
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#802ef6;font-weight:700">${esVip ? "Tu entrada VIP incluye todo lo de General, más" : "Tu entrada General incluye"}</p>
    <ul style="margin:0;padding:0 0 0 20px;font-size:15px;line-height:1.5;color:#3a2f4a">${incluye}</ul>
    ${esVip ? `<p style="margin:14px 0 0;font-size:14px;color:#7a6f8c;font-style:italic">Solo 250 cupos VIP. Es posible que se agoten antes de cerrar la etapa.</p>` : ""}
  </td></tr>
  <tr><td style="padding:28px 40px 36px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#802ef6">
      <a href="${enlace}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">Asegurar mi entrada</a>
    </td></tr></table>
    <p style="margin:22px 0 0;font-size:14px;line-height:1.55;color:#3a2f4a">¿Ya pagaste? Mándanos el comprobante por WhatsApp${linea ? ` al <strong>${linea}</strong>` : ""} y te aprobamos en el momento. Tu entrada con el código QR te llega a este correo.</p>
  </td></tr>
</table>
<p style="max-width:600px;margin:18px auto 0;font-size:12px;line-height:1.6;color:#7a6f8c;text-align:center">Recibes este correo porque te registraste en ${escapar(EVENT.fullName)} en Luma. Si ya no te interesa, responde este correo y te sacamos de la lista.<br>Un evento de Habi · habinext.com</p>
</td></tr></table>
</body></html>`;

  const texto = [
    `${nombre ? `${nombre}, ` : ""}tu cupo ${t.nombre} en Habi Next Colombia sigue reservado.`,
    "",
    sube.replace(/<[^>]+>/g, ""),
    "",
    `Paga tu entrada ${t.nombre} (${t.actual}) con tu link personal: ${enlace}`,
    "",
    `${EVENT.dateLong} · ${EVENT.venue}, ${EVENT.city}.`,
    `${esVip ? "Tu entrada VIP incluye todo lo de General, más" : "Tu entrada General incluye"}: ${t.incluye.join("; ")}.`,
    "",
    `¿Ya pagaste? Mándanos el comprobante por WhatsApp${linea ? ` al ${linea}` : ""} y te aprobamos en el momento.`,
    "",
    `Recibes este correo porque te registraste en ${EVENT.fullName} en Luma. Si ya no te interesa, responde este correo y te sacamos de la lista.`,
  ].join("\n");

  return { asunto, html, texto };
}

// ---------- el envío ----------

export type ResultadoCanal = { ok: boolean; messageId?: string | null; error?: string; omitido?: string };
export type Resultado = Partial<Record<Canal, ResultadoCanal>>;

const HORAS_ENTRE_RECORDATORIOS = 48;

function recienRecordado(r: Registro): boolean {
  const ultimo = r.recordatorio?.ultimoEn;
  return Boolean(ultimo && Date.now() - new Date(ultimo).getTime() < HORAS_ENTRE_RECORDATORIOS * 3_600_000);
}

const aResultado = (s: Salida): ResultadoCanal => ({
  ok: s.ok,
  messageId: s.messageId,
  ...(s.ok ? {} : { error: s.error || `HTTP ${s.status}` }),
});

/**
 * Manda el recordatorio a una persona por los canales pedidos y lo deja
 * anotado en su registro. Con `prueba` los mensajes salen al teléfono y correo
 * del operador, con el contenido de esa persona, y no se anota nada.
 */
export async function enviarRecordatorio(
  r: Registro,
  canales: Canal[],
  prueba?: { telefono?: string; email?: string }
): Promise<Resultado> {
  const resultado: Resultado = {};
  const ahora = new Date().toISOString();

  if (canales.includes("whatsapp")) {
    const w = whatsappDe(r);
    const a = prueba ? prueba.telefono : r.telefono;
    if (!w.plantilla) resultado.whatsapp = { ok: false, error: "sin plantilla configurada (INFOBIP_TPL_RECUPERA_*)" };
    else if (!a) resultado.whatsapp = { ok: false, omitido: "sin celular" };
    else {
      resultado.whatsapp = aResultado(
        await enviarPlantilla({
          a,
          plantilla: w.plantilla,
          placeholders: w.placeholders,
          botones: w.botones,
          encabezadoImagen: w.imagen,
          callbackData: { token: r.token, canal: "whatsapp", recordatorio: true, ...(prueba ? { prueba: true } : {}) },
        }).catch((e: Error) => ({ ok: false, status: 0, messageId: null, estado: null, error: e.message }))
      );
    }
  }

  if (canales.includes("sms")) {
    const a = prueba ? prueba.telefono : r.telefono;
    if (!a) resultado.sms = { ok: false, omitido: "sin celular" };
    else {
      resultado.sms = aResultado(
        await enviarSms({
          a,
          texto: smsDe(r),
          callbackData: { token: r.token, canal: "sms", ...(prueba ? { prueba: true } : {}) },
        }).catch((e: Error) => ({ ok: false, status: 0, messageId: null, estado: null, error: e.message }))
      );
    }
  }

  if (canales.includes("correo")) {
    const a = prueba ? prueba.email : r.luma.email;
    if (!a) resultado.correo = { ok: false, omitido: "sin correo" };
    else {
      const c = correoDe(r);
      resultado.correo = aResultado(
        await enviarCorreo({
          a,
          asunto: prueba ? `[Prueba] ${c.asunto}` : c.asunto,
          html: c.html,
          texto: c.texto,
          callbackData: { token: r.token, canal: "correo", ...(prueba ? { prueba: true } : {}) },
        }).catch((e: Error) => ({ ok: false, status: 0, messageId: null, estado: null, error: e.message }))
      );
    }
  }

  if (!prueba) {
    const plantilla = whatsappDe(r).plantilla;
    await anotar(
      r.token,
      "recordatorio de pago",
      (reg) => {
        const previo = reg.recordatorio ?? {};
        const estado = (canal: Canal) => {
          const x = resultado[canal];
          if (!x || x.omitido) return previo[canal];
          return {
            ...previo[canal],
            enviadoEn: x.ok ? ahora : previo[canal]?.enviadoEn,
            ...(x.messageId ? { messageId: x.messageId } : {}),
            ...(canal === "whatsapp" && plantilla ? { plantilla } : {}),
            ...(x.ok ? { error: undefined } : { error: x.error }),
          };
        };
        return {
          recordatorio: {
            ...previo,
            ...(resultado.whatsapp ? { whatsapp: estado("whatsapp") } : {}),
            ...(resultado.sms ? { sms: estado("sms") } : {}),
            ...(resultado.correo ? { correo: estado("correo") } : {}),
            ultimoEn: ahora,
            veces: (previo.veces ?? 0) + 1,
          },
        };
      },
      CANALES.filter((c) => resultado[c])
        .map((c) => `${NOMBRE_CANAL[c]}: ${resultado[c]!.ok ? "enviado" : resultado[c]!.omitido || resultado[c]!.error}`)
        .join(" · ")
    );
  }

  return resultado;
}

// ---------- campañas ----------

export type Campana = {
  id: string;
  creadaEn: string;
  canales: Canal[];
  tokens: string[];
  hechos: Record<string, Resultado>;
  terminadaEn?: string;
  nota?: string;
};

const rutaCampana = (id: string) => `campanas/${id}.json`;

export async function crearCampana(canales: Canal[], tokens: string[]): Promise<Campana> {
  const c: Campana = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    creadaEn: new Date().toISOString(),
    canales,
    tokens,
    hechos: {},
  };
  await crearSiNoExiste(rutaCampana(c.id), c);
  return c;
}

export async function traerCampana(id: string): Promise<Campana | null> {
  if (!/^[0-9]+-[a-z0-9]+$/.test(id)) return null;
  return leer<Campana>(rutaCampana(id));
}

export async function ultimaCampana(): Promise<Campana | null> {
  const rutas = await listarRutas("campanas/", 500);
  if (!rutas.length) return null;
  const ultima = rutas.sort().at(-1)!;
  return leer<Campana>(ultima);
}

/**
 * Corre lo que falte de una campaña, de a tres personas a la vez, y va
 * guardando el avance para poder continuar si el proceso se corta. Devuelve
 * cuántas quedaron hechas en esta pasada.
 */
export async function correrCampana(id: string, presupuestoMs = 240_000): Promise<number> {
  const inicio = Date.now();
  const c = await traerCampana(id);
  if (!c || c.terminadaEn) return 0;

  const pendientes = c.tokens.filter((t) => !c.hechos[t]);
  const hechos: Record<string, Resultado> = {};
  let indice = 0;

  const guardar = async (final: boolean) => {
    const copia = { ...hechos };
    await modificar<Campana>(rutaCampana(id), (actual) => {
      if (!actual) return null;
      const todos = { ...actual.hechos, ...copia };
      const completa = actual.tokens.every((t) => todos[t]);
      return { ...actual, hechos: todos, ...(final && completa ? { terminadaEn: new Date().toISOString() } : {}) };
    });
  };

  const trabajador = async () => {
    while (indice < pendientes.length && Date.now() - inicio < presupuestoMs) {
      const token = pendientes[indice++];
      const r = await porToken(token);
      if (!r) {
        hechos[token] = { whatsapp: { ok: false, omitido: "registro no encontrado" } };
        continue;
      }
      // Se vuelve a comprobar en el momento: pudo pagar entre que se armó la
      // lista y le tocó el turno.
      if (!pendientesDePago([r]).length) {
        hechos[token] = Object.fromEntries(c.canales.map((k) => [k, { ok: false, omitido: "ya no está pendiente" }]));
        continue;
      }
      if (recienRecordado(r)) {
        hechos[token] = Object.fromEntries(c.canales.map((k) => [k, { ok: false, omitido: "recordado hace menos de 48 h" }]));
        continue;
      }
      hechos[token] = await enviarRecordatorio(r, c.canales).catch((e: Error) =>
        Object.fromEntries(c.canales.map((k) => [k, { ok: false, error: e.message }]))
      );
      if (Object.keys(hechos).length % 6 === 0) await guardar(false).catch(() => null);
    }
  };

  await Promise.all([trabajador(), trabajador(), trabajador()]);
  await guardar(true);
  return Object.keys(hechos).length;
}

export type ResumenCampana = {
  total: number;
  hechos: number;
  porCanal: Record<Canal, { ok: number; fallo: number; omitido: number }>;
  terminada: boolean;
};

export function resumirCampana(c: Campana): ResumenCampana {
  const porCanal = Object.fromEntries(CANALES.map((k) => [k, { ok: 0, fallo: 0, omitido: 0 }])) as ResumenCampana["porCanal"];
  for (const r of Object.values(c.hechos)) {
    for (const k of CANALES) {
      const x = r[k];
      if (!x) continue;
      if (x.ok) porCanal[k].ok += 1;
      else if (x.omitido) porCanal[k].omitido += 1;
      else porCanal[k].fallo += 1;
    }
  }
  return { total: c.tokens.length, hechos: Object.keys(c.hechos).length, porCanal, terminada: Boolean(c.terminadaEn) };
}

export type ResumenPendientes = {
  total: number;
  general: number;
  vip: number;
  conCelular: number;
  conCorreo: number;
  recordados: number;
  abrieronPago: number;
};

export function resumirPendientes(registros: Registro[]): ResumenPendientes {
  const p = pendientesDePago(registros);
  return {
    total: p.length,
    general: p.filter((r) => r.tier === "general").length,
    vip: p.filter((r) => r.tier === "vip").length,
    conCelular: p.filter((r) => r.telefono).length,
    conCorreo: p.filter((r) => r.luma.email).length,
    recordados: p.filter((r) => (r.recordatorio?.veces ?? 0) > 0).length,
    abrieronPago: p.filter((r) => r.etapa === "pago_abierto").length,
  };
}
