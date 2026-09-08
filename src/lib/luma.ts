import type { Tier } from "./registros";

/**
 * Lo justo de la API de Luma para operar la boletería: saber a qué entrada
 * corresponde un evento y aprobar o rechazar a una persona.
 *
 * Aprobar en Luma no es un cambio de estado cualquiera: es el momento en que
 * Luma le manda a la persona su entrada con el código QR. Por eso solo se
 * llama después de confirmar el pago.
 */

const BASE = "https://public-api.luma.com";

function llave(): string {
  const k = process.env.LUMA_API_KEY;
  if (!k) throw new Error("falta LUMA_API_KEY");
  return k;
}

/** A qué entrada corresponde cada evento configurado. */
export function tierDeEvento(eventId: string): Tier | null {
  if (eventId && eventId === process.env.LUMA_EVENT_GENERAL) return "general";
  if (eventId && eventId === process.env.LUMA_EVENT_VIP) return "vip";
  return null;
}

export function eventoDeTier(tier: Tier): string | undefined {
  return tier === "vip" ? process.env.LUMA_EVENT_VIP : process.env.LUMA_EVENT_GENERAL;
}

async function pedir(ruta: string, cuerpo: unknown) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: "POST",
    headers: { "x-luma-api-key": llave(), "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(15_000),
  });
  const texto = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, cuerpo: texto.slice(0, 400) };
}

/**
 * Aprueba a la persona. `send_email: true` a propósito: ese correo es la
 * entrada, y es el único artefacto que la persona presenta en la puerta.
 */
export async function aprobarInvitado(eventId: string, guestId: string, mensaje?: string) {
  return pedir("/v1/events/guests/update-status", {
    event_id: eventId,
    guest_id: guestId,
    status: "approved",
    send_email: true,
    // Luma corta el mensaje en 200 caracteres.
    ...(mensaje ? { message: mensaje.slice(0, 200) } : {}),
  });
}

export async function rechazarInvitado(eventId: string, guestId: string, mensaje?: string) {
  return pedir("/v1/events/guests/update-status", {
    event_id: eventId,
    guest_id: guestId,
    status: "declined",
    send_email: true,
    ...(mensaje ? { message: mensaje.slice(0, 200) } : {}),
  });
}

/** Datos completos de un invitado, para reconciliar si un webhook llegó cojo. */
export async function traerInvitado(eventId: string, guestId: string) {
  const url = new URL(`${BASE}/v1/events/guests/get`);
  url.searchParams.set("event_id", eventId);
  url.searchParams.set("api_id", guestId);
  const res = await fetch(url, {
    headers: { "x-luma-api-key": llave() },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
}
