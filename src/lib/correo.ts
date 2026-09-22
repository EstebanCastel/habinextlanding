import { urlDeReportes, type Salida } from "./whatsapp";

/**
 * Correo por Infobip (Email API v3), desde el dominio que Habi ya tiene
 * verificado en la cuenta: `notifications.habi.co`. No hace falta tocar el
 * DNS de habinext.com, que vive en Route 53 y no controlamos desde acá.
 *
 * Cada correo sale con su propio `callbackData` para que el reporte de
 * entrega, y los de apertura y clic, vuelvan a `/api/infobip` y queden
 * anotados en el registro de la persona.
 */

function base(): string {
  const b = String(process.env.INFOBIP_BASE_URL || "").replace(/\/+$/, "");
  if (!b) throw new Error("falta INFOBIP_BASE_URL");
  return b.startsWith("http") ? b : `https://${b}`;
}

export function remitente(): string {
  return process.env.INFOBIP_EMAIL_FROM || "Habi Next <habinext@notifications.habi.co>";
}

export async function enviarCorreo(opciones: {
  a: string;
  asunto: string;
  html: string;
  texto: string;
  callbackData?: unknown;
}): Promise<Salida> {
  const k = process.env.INFOBIP_API_KEY;
  if (!k) throw new Error("falta INFOBIP_API_KEY");

  const fd = new FormData();
  fd.append("from", remitente());
  fd.append("to", opciones.a);
  fd.append("subject", opciones.asunto);
  fd.append("html", opciones.html);
  fd.append("text", opciones.texto);
  if (process.env.CAMPANA_REPLY_TO) fd.append("replyTo", process.env.CAMPANA_REPLY_TO);
  fd.append("trackClicks", "true");
  fd.append("trackOpens", "true");
  const notifyUrl = urlDeReportes();
  if (notifyUrl) {
    fd.append("notifyUrl", notifyUrl);
    fd.append("trackingUrl", notifyUrl);
    fd.append("intermediateReport", "true");
  }
  if (opciones.callbackData !== undefined) fd.append("callbackData", JSON.stringify(opciones.callbackData));

  const res = await fetch(`${base()}/email/3/send`, {
    method: "POST",
    headers: { Authorization: `App ${k}`, Accept: "application/json" },
    body: fd,
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => null)) as {
    messages?: { messageId?: string; status?: { name?: string; groupName?: string; description?: string } }[];
    requestError?: { serviceException?: { text?: string } };
  } | null;
  const m = data?.messages?.[0];
  const rechazado = m?.status?.groupName === "REJECTED";
  return {
    ok: res.status === 200 && !rechazado,
    status: res.status,
    messageId: m?.messageId ?? null,
    estado: m?.status?.name ?? null,
    ...(res.status !== 200 || rechazado
      ? { error: data?.requestError?.serviceException?.text || m?.status?.description || `HTTP ${res.status}` }
      : {}),
  };
}
