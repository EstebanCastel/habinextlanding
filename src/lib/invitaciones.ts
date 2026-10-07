import crypto from "node:crypto";

/**
 * Las invitaciones personalizadas (la pieza con el código de cada persona)
 * que viajan como cabecera del mensaje de WhatsApp.
 *
 * Meta tiene que poder bajar la imagen desde una URL pública, pero el store
 * de Blob es privado y el código es un secreto de un solo uso: la pieza se
 * sirve desde nuestra API en `/api/invitacion/<código>?k=<firma>`, con una
 * firma HMAC del código que impide recorrer la ruta probando códigos. La
 * pieza se guarda en `invitaciones/<CÓDIGO>.jpg` con el script de envío.
 */

const CODIGO = /^[A-Z0-9-]{4,40}$/;

function secreto(): string {
  const s = process.env.EXPERIENCIA_SECRET;
  if (!s || s.length < 32) throw new Error("EXPERIENCIA_SECRET falta o es demasiado corto");
  return s;
}

export function codigoValido(codigo: string): boolean {
  return CODIGO.test(codigo);
}

export function rutaInvitacion(codigo: string): string {
  return `invitaciones/${codigo.toUpperCase()}.jpg`;
}

export function firmaInvitacion(codigo: string): string {
  return crypto.createHmac("sha256", secreto()).update(`invitacion:${codigo.toUpperCase()}`).digest("base64url").slice(0, 20);
}

export function firmaValida(codigo: string, firma: string): boolean {
  const buena = Buffer.from(firmaInvitacion(codigo));
  const dada = Buffer.from(String(firma));
  return buena.length === dada.length && crypto.timingSafeEqual(buena, dada);
}

export function urlInvitacion(sitio: string, codigo: string): string {
  return `${sitio}/api/invitacion/${encodeURIComponent(codigo.toUpperCase())}?k=${firmaInvitacion(codigo)}`;
}
