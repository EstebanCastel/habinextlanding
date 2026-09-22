import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { configurado, urlDeAutorizacion } from "@/lib/linkedin";
import { sitio } from "@/lib/experiencia-http";

/**
 * Arranque del inicio de sesión con LinkedIn. El `state` es aleatorio y viaja
 * en una cookie que solo el servidor lee: al volver, LinkedIn tiene que traer
 * el mismo, o la respuesta se descarta. Es lo que impide que alguien le
 * "pegue" a otra persona una cuenta de LinkedIn que no es suya.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const COOKIE_ESTADO = "hn_li";

export async function GET(request: Request) {
  const base = sitio(request);
  if (!configurado()) {
    return NextResponse.redirect(`${base}/experiencia?li=sin-configurar`, { status: 303 });
  }

  const volver = new URL(request.url).searchParams.get("volver") ?? "";
  // `carnet`, `mapa` o `redes` vuelven a esa experiencia; cualquier otra cosa, a la portada.
  const destino = /^[a-z_-]{0,40}$/.test(volver) ? volver : "";

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(urlDeAutorizacion(state, `${base}/api/experiencia/linkedin/callback`), {
    status: 303,
  });
  res.cookies.set(COOKIE_ESTADO, `${state}|${destino}`, {
    path: "/api/experiencia/linkedin",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
  });
  return res;
}
