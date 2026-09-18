import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  COOKIE_SESION,
  configurada,
  crear,
  firmarSesion,
  idDeSesion,
  opcionesDeCookie,
  porId,
  type Participante,
} from "./experiencia";

/**
 * Lo que comparten los endpoints de la experiencia: leer la sesión, crearla si
 * hace falta, rechazar peticiones que no vengan de la propia página y frenar
 * a quien insista demasiado.
 */

export function sitio(request: Request): string {
  if (process.env.NODE_ENV !== "production") return new URL(request.url).origin;
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}

/**
 * Las peticiones que escriben tienen que venir de nuestra página. La cookie
 * es `SameSite=Lax`, que ya corta los POST desde otros sitios; esto es la
 * segunda cerradura, por si un navegador viejo no la respeta.
 */
export function mismoOrigen(request: Request): boolean {
  const sitioPeticion = request.headers.get("sec-fetch-site");
  if (sitioPeticion) return sitioPeticion === "same-origin" || sitioPeticion === "none";
  const origen = request.headers.get("origin");
  if (!origen) return true;
  try {
    return new URL(origen).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function ipDe(request: Request): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconocida"
  );
}

const intentos = new Map<string, { n: number; hasta: number }>();

/** Límite por clave y ventana. Mejor esfuerzo: vive en memoria de cada instancia. */
export function dentroDelLimite(clave: string, maximo: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const previo = intentos.get(clave);
  if (!previo || ahora > previo.hasta) {
    intentos.set(clave, { n: 1, hasta: ahora + ventanaMs });
    if (intentos.size > 5000) {
      for (const [k, v] of intentos) if (ahora > v.hasta) intentos.delete(k);
    }
    return true;
  }
  previo.n += 1;
  return previo.n <= maximo;
}

export type Sesion = { participante: Participante; nueva: boolean };

/** El participante de la cookie, si la hay y es válida. */
export async function participanteActual(): Promise<Participante | null> {
  if (!configurada()) return null;
  const id = idDeSesion((await cookies()).get(COOKIE_SESION)?.value);
  return id ? porId(id) : null;
}

/** El participante de la cookie, o uno nuevo si todavía no tiene. */
export async function participanteOCrear(): Promise<Sesion> {
  const actual = await participanteActual();
  if (actual) return { participante: actual, nueva: false };
  return { participante: await crear(), nueva: true };
}

/** Responde JSON y, si la sesión es nueva, deja la cookie puesta. */
export function responder(cuerpo: unknown, sesion?: Sesion, status = 200): NextResponse {
  const res = NextResponse.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });
  if (sesion?.nueva) res.cookies.set(COOKIE_SESION, firmarSesion(sesion.participante.id), opcionesDeCookie());
  return res;
}

export function error(mensaje: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: mensaje }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Firma de los formatos de imagen que se aceptan, por sus primeros bytes. */
export function tipoDeImagen(bytes: Uint8Array): { tipo: string; ext: string } | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { tipo: "image/jpeg", ext: "jpg" };
  }
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { tipo: "image/png", ext: "png" };
  }
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { tipo: "image/webp", ext: "webp" };
  }
  return null;
}
