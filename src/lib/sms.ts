import { urlDeReportes, type Salida } from "./whatsapp";

/**
 * SMS por Infobip, cuenta Colombia. Es el canal de respaldo del recordatorio:
 * le llega a quien no tiene WhatsApp o no lo abre, y el operador lo entrega
 * en segundos con un remitente numérico local (probado: entregado al
 * teléfono en 3 segundos).
 *
 * El texto va sin tildes fuera del alfabeto GSM: una sola «ó» convierte el
 * mensaje a UCS-2 y lo parte en dos, que se cobra doble y a veces llega
 * desordenado.
 */

function base(): string {
  const b = String(process.env.INFOBIP_BASE_URL || "").replace(/\/+$/, "");
  if (!b) throw new Error("falta INFOBIP_BASE_URL");
  return b.startsWith("http") ? b : `https://${b}`;
}

export async function enviarSms(opciones: { a: string; texto: string; callbackData?: unknown }): Promise<Salida> {
  const k = process.env.INFOBIP_API_KEY;
  if (!k) throw new Error("falta INFOBIP_API_KEY");
  const notifyUrl = urlDeReportes();
  const mensaje: Record<string, unknown> = {
    destinations: [{ to: opciones.a.replace(/\D/g, "") }],
    text: opciones.texto,
    ...(process.env.INFOBIP_SMS_FROM ? { from: process.env.INFOBIP_SMS_FROM } : {}),
    ...(notifyUrl ? { notifyUrl } : {}),
    ...(opciones.callbackData !== undefined ? { callbackData: JSON.stringify(opciones.callbackData) } : {}),
  };
  const res = await fetch(`${base()}/sms/2/text/advanced`, {
    method: "POST",
    headers: { Authorization: `App ${k}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ messages: [mensaje] }),
    signal: AbortSignal.timeout(15_000),
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
