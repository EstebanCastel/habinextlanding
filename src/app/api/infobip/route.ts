import { after, NextResponse } from "next/server";
import { reflejar } from "@/lib/hoja";
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
  message?: {
    type?: string;
    text?: string;
    url?: string;
    caption?: string;
    payload?: string;
  };
};

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
    const actualizado = await anotar(
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
    if (actualizado) after(() => reflejar(actualizado));
    vistos += 1;
  }
  return vistos;
}

/** ---------- mensajes entrantes ---------- */

const RESPUESTA_COMPROBANTE =
  "¡Gracias! 🙌 Ya recibimos tu comprobante y lo estamos validando con el equipo. " +
  "Apenas quede confirmado te llega tu entrada de Habi Next a tu correo, con tu código QR. " +
  "Te escribimos por acá mismo cuando esté lista.";

const RESPUESTA_DUDA =
  "¡Hola! 👋 Con gusto te ayudamos. Cuéntanos por acá qué necesitas saber de Habi Next y " +
  "una persona del equipo te responde en el transcurso del día.";

function pareceComprobante(m: Resultado["message"]): boolean {
  const tipo = String(m?.type || "").toUpperCase();
  if (["IMAGE", "DOCUMENT", "VIDEO"].includes(tipo)) return true;
  const texto = `${m?.text || ""} ${m?.caption || ""}`.toLowerCase();
  return /comprobante|pagu[eé]|transferenc|nequi|daviplata|pse|consign|recibo|soporte del pago/.test(texto);
}

async function procesarEntrantes(resultados: Resultado[]): Promise<number> {
  let vistos = 0;
  for (const r of resultados) {
    const registro = await registroDe(r);
    if (!registro) continue;
    vistos += 1;

    const m = r.message;
    const esBotonDuda = String(m?.payload || "").toUpperCase().includes("DUDA");
    const ahora = r.receivedAt || new Date().toISOString();

    if (pareceComprobante(m)) {
      const actualizado = await anotar(
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
                tipo: String(m?.type || "TEXTO"),
                ...(m?.url ? { url: m.url } : {}),
                ...(m?.text || m?.caption ? { texto: String(m.text || m.caption).slice(0, 500) } : {}),
              },
            ].slice(-10),
          },
        }),
        String(m?.type || "")
      );
      if (actualizado) after(() => reflejar(actualizado));

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

    const texto = String(m?.text || m?.caption || "").slice(0, 500);
    const actualizado = await anotar(
      registro.token,
      esBotonDuda ? "pidió ayuda desde el botón" : "escribió por WhatsApp",
      () => ({}),
      texto || undefined
    );
    if (actualizado) after(() => reflejar(actualizado));

    if (esBotonDuda && registro.telefono) {
      after(() =>
        enviarTexto({ a: registro.telefono!, texto: RESPUESTA_DUDA }).catch(() => {})
      );
    }
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
