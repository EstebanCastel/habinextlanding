import { cookies } from "next/headers";
import { tokenValido } from "./seguridad";

/**
 * Sesión del panel de operación. Es deliberadamente mínima: una sola clave
 * compartida por el equipo que atiende la boletería, guardada en una cookie
 * que el navegador no deja leer por JavaScript.
 *
 * `SameSite=Strict` es lo que cubre el CSRF: los formularios del panel aprueban
 * y rechazan entradas, y sin eso una página cualquiera podría hacer que el
 * navegador de un operador con sesión abierta aprobara a alguien.
 */

export const COOKIE = "habinext_panel";

export function claveAdmin(): string | undefined {
  const k = process.env.ADMIN_TOKEN;
  return k && k.length >= 16 ? k : undefined;
}

export async function haySesion(): Promise<boolean> {
  const clave = claveAdmin();
  if (!clave) return false;
  const cookie = (await cookies()).get(COOKIE)?.value ?? null;
  return tokenValido(cookie, clave);
}

export function cabecerasDeCookie(valor: string, segundos: number): Record<string, string> {
  return {
    "Set-Cookie": [
      `${COOKIE}=${valor}`,
      "Path=/",
      "HttpOnly",
      "Secure",
      "SameSite=Strict",
      `Max-Age=${segundos}`,
    ].join("; "),
  };
}
