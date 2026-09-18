import { NextResponse } from "next/server";
import { COOKIE_SESION } from "@/lib/experiencia";
import { mismoOrigen, sitio } from "@/lib/experiencia-http";

/** Cierra la sesión en este navegador. El avance queda guardado; se recupera conectando LinkedIn. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return NextResponse.json({ ok: false }, { status: 403 });
  const res = NextResponse.redirect(`${sitio(request)}/experiencia`, { status: 303 });
  res.cookies.set(COOKIE_SESION, "", { path: "/", maxAge: 0 });
  return res;
}
