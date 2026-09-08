import { after, NextResponse } from "next/server";
import {
  BOTON_VIP,
  escalarAUnaPersona,
  pasarAVip,
  RESPUESTA_COMPROBANTE,
  RESPUESTA_DUDA,
  RESPUESTA_ESCALADA,
} from "@/lib/bot";
import { tokenValido } from "@/lib/seguridad";
import { anotar, normalizarTelefono, porTelefono, porToken, type Registro } from "@/lib/registros";
import { enviarTexto } from "@/lib/whatsapp";

/**
 * Webhook de Infobip. Una sola URL para las dos cosas que WhatsApp devuelve:
 *
 * - **Reportes de entrega** (`?dlr=1`): si el mensaje llegó, si lo leyeron o si
 *   falló. Es lo que convierte «mandamos 300 mensajes» en «280 llegaron y 190
 *   los leyeron», que es la única forma de notar a tiempo que una línea se
 *   cayó o que media base tiene el número mal.
 * - **Mensajes entrantes**: la persona manda el comprobante del pago o
 *   pregunta algo. El comprobante queda pegado a su registro y el equipo lo ve
 *   en el panel.
 *
 * Infobip no firma sus callbacks. La autenticación es un token en la query
 * (`?k=…`) que solo conocen Infobip y este servicio, comparado en tiempo
 * constante. Sin ese token esto quedaría abierto a que cualquiera inyecte
 * comprobantes falsos y marque pagos como recibidos.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Resultado = {
  messageId?: string;
  to?: string;
  from?: string;
  callbackData?: string;
  status?: { groupName?: string; name?: string; description?: string };
  error?: { id?: number; name?: string; description?: string };
  seenAt?: string;
  doneAt?: string;
  receivedAt?: string;
  cleanText?: string;
  message?: Mensaje;
  content?: Mensaje;
};

type Mensaje = {
  type?: string;
  text?: string;
  url?: string;
  caption?: string;
  payload?: string;
  button?: { payload?: string; text?: string };
  content?: { text?: string; url?: string };
};

/**
 * Infobip no entrega los entrantes en una sola forma: según el renderer que
 * quede configurado en la línea, el cuerpo viene en `message` o en `content`,
 * el texto en `text`, en `content.text` o en `cleanText`, y el payload de un
 * botón en `payload` o en `button.payload`. Se leen todas las variantes en vez
 * de apostar por una: equivocarse aquí significa que el bot se queda mudo justo
 * cuando alguien le contesta.
 */
function leerMensaje(r: Resultado): {
  tipo: string;
  texto: string;
  url: string | null;
  payload: string;
} {
  const m = r.message ?? r.content ?? {};
  return {
    tipo: String(m.type ?? "").toUpperCase(),
    texto: String(m.text ?? m.content?.text ?? m.caption ?? r.cleanText ?? "").trim(),
    url: m.url ?? m.content?.url ?? null,
    payload: String(m.payload ?? m.button?.payload ?? "").toUpperCase(),
  };
}

/** El token del registro viaja en `callbackData`; si no, se busca por número. */
async function registroDe(r: Resultado): Promise<Registro | null> {
  try {
    const cb = r.callbackData ? (JSON.parse(r.callbackData) as { token?: string }) : null;
    if (cb?.token) {
      const porCb = await porToken(cb.token);
      if (porCb) return porCb;
    }
  } catch {
    // callbackData de otro sistema: se ignora y se cae a la búsqueda por número.
  }
  const numero = normalizarTelefono(r.from || r.to);
  return numero ? porTelefono(numero) : null;
}

/** ---------- reportes de entrega ---------- */
async function procesarDlr(resultados: Resultado[]): Promise<number> {
  let vistos = 0;
  for (const r of resultados) {
    const registro = await registroDe(r);
    if (!registro) continue;

    const grupo = String(r.status?.groupName || r.status?.name || "").toUpperCase();
    const leido = Boolean(r.seenAt) || grupo === "SEEN" || grupo === "READ";
    const entregado = grupo === "DELIVERED";
    const fallo = ["UNDELIVERABLE", "EXPIRED", "REJECTED", "FAILED"].includes(grupo);
    if (!leido && !entregado && !fallo) continue; // PENDING y demás: nada que anotar

    const ahora = new Date().toISOString();
    await anotar(
      registro.token,
      leido ? "WhatsApp leído" : entregado ? "WhatsApp entregado" : "WhatsApp no se pudo entregar",
      (reg) => ({
        // `avanzar` impide que un DLR fuera de orden devuelva "leído" a
        // "entregado": los reportes de Infobip no llegan siempre en orden.
        etapa: leido ? ("mensaje_leido" as const) : entregado ? ("mensaje_entregado" as const) : reg.etapa,
        whatsapp: {
          ...reg.whatsapp,
          ...(leido ? { leidoEn: reg.whatsapp.leidoEn ?? ahora, entregadoEn: reg.whatsapp.entregadoEn ?? ahora } : {}),
          ...(entregado ? { entregadoEn: reg.whatsapp.entregadoEn ?? ahora } : {}),
          ...(fallo
            ? { error: r.error?.description || r.status?.description || grupo }
            : {}),
        },
      }),
      fallo ? r.error?.description || grupo : undefined
    );
    vistos += 1;
  }
  return vistos;
}

/** ---------- mensajes entrantes ---------- */

function pareceComprobante(tipo: string, texto: string): boolean {
  if (["IMAGE", "DOCUMENT", "VIDEO"].includes(tipo)) return true;
  return /comprobante|pagu[eé]|transferenc|nequi|daviplata|pse|consign|recibo|soporte del pago/i.test(
    texto
  );
}

/**
 * Reconoce la intención sin acentos ni mayúsculas. El texto del botón es el
 * respaldo del payload: algunos renderers de Infobip entregan la respuesta a un
 * QUICK_REPLY como texto plano y sin payload, y en ese caso lo único que llega
 * es exactamente la etiqueta del botón.
 */
function sinAcentos(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function quiereVip(payload: string, texto: string): boolean {
  if (payload.startsWith(`${BOTON_VIP}_`)) return true;
  const t = sinAcentos(texto);
  return /^(prefiero el vip|quiero el vip|quiero ser vip|me paso a vip|vip)$/.test(t);
}

function pideAyuda(payload: string, texto: string): boolean {
  if (payload.startsWith("DUDA")) return true;
  return /^(tengo una duda|una duda|ayuda|tengo una pregunta)$/.test(sinAcentos(texto));
}

async function procesarEntrantes(resultados: Resultado[]): Promise<number> {
  let vistos = 0;
  for (const r of resultados) {
    const registro = await registroDe(r);
    if (!registro) continue;
    vistos += 1;

    const m = leerMensaje(r);
    const esBotonVip = quiereVip(m.payload, m.texto);
    const esBotonDuda = pideAyuda(m.payload, m.texto);
    const ahora = r.receivedAt || new Date().toISOString();

    if (pareceComprobante(m.tipo, m.texto)) {
      await anotar(
        registro.token,
        "mandó comprobante por WhatsApp",
        (reg) => ({
          etapa: "comprobante_recibido" as const,
          pago: {
            ...reg.pago,
            comprobantes: [
              ...reg.pago.comprobantes,
              {
                en: ahora,
                tipo: m.tipo || "TEXTO",
                ...(m.url ? { url: m.url } : {}),
                ...(m.texto ? { texto: m.texto.slice(0, 500) } : {}),
              },
            ].slice(-10),
          },
        }),
        m.tipo
      );

      // Responder está permitido: la persona acaba de escribir, así que la
      // ventana de 24 horas de Meta está abierta.
      if (registro.telefono) {
        after(() =>
          enviarTexto({ a: registro.telefono!, texto: RESPUESTA_COMPROBANTE }).catch((e: Error) =>
            console.warn("[infobip] no se pudo acusar el comprobante:", e.message)
          )
        );
      }
      continue;
    }

    // «Prefiero el VIP»: la única respuesta que cambia el rumbo de alguien.
    // Se hace en línea y no en `after` porque toca Luma en dos eventos y hay
    // que saber si salió bien antes de responderle.
    if (esBotonVip) {
      const res = await pasarAVip(registro);
      if (!res.ok) {
        console.warn("[bot] no se pudo pasar a VIP:", res.nota);
        await escalarAUnaPersona(registro, `quiso pasarse a VIP y no se pudo: ${res.nota}`);
        if (registro.telefono) {
          await enviarTexto({
            a: registro.telefono,
            texto:
              "¡Gracias por avisarnos! Tuvimos un problema al pasarte a VIP. " +
              "Una persona del equipo te escribe por acá para dejarlo listo.",
          }).catch(() => null);
        }
      }
      continue;
    }

    const texto = m.texto.slice(0, 500);

    // Botón de ayuda: se le responde y se avisa, pero sin alarma — todavía no
    // ha dicho qué necesita.
    if (esBotonDuda) {
      await anotar(registro.token, "pidió ayuda desde el botón", () => ({}), texto || undefined);
      if (registro.telefono) {
        after(() => enviarTexto({ a: registro.telefono!, texto: RESPUESTA_DUDA }).catch(() => null));
      }
      continue;
    }

    // Cualquier otra cosa: el bot no la sabe resolver. En vez de contestar una
    // torpeza, se la pasa a una persona y se lo dice de frente a quien escribió.
    await anotar(registro.token, "escribió algo que el bot no resuelve", () => ({}), texto || undefined);
    after(async () => {
      await escalarAUnaPersona(
        registro,
        texto ? `escribió: «${texto}»` : `mandó un mensaje de tipo ${m.tipo || "desconocido"}`
      );
      if (registro.telefono) {
        await enviarTexto({ a: registro.telefono, texto: RESPUESTA_ESCALADA }).catch(() => null);
      }
    });
  }
  return vistos;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!tokenValido(url.searchParams.get("k"), process.env.INFOBIP_WEBHOOK_TOKEN)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const cuerpo = (await request.json().catch(() => null)) as { results?: Resultado[] } | null;
  const resultados = Array.isArray(cuerpo?.results) ? cuerpo.results : [];
  if (!resultados.length) return NextResponse.json({ ok: true, procesados: 0 });

  const esDlr = url.searchParams.get("dlr") === "1" || Boolean(resultados[0]?.status);

  try {
    const procesados = esDlr
      ? await procesarDlr(resultados)
      : await procesarEntrantes(resultados);
    return NextResponse.json({ ok: true, procesados });
  } catch (error) {
    // 200 igual: Infobip reintenta ante un 5xx y duplicaría comprobantes.
    console.error("[infobip] fallo procesando el callback:", (error as Error).message);
    return NextResponse.json({ ok: true, nota: "anotado con error" });
  }
}
