import { NextResponse } from "next/server";
import { COOKIE_SESION, entrar, firmarSesion, opcionesDeCookie, vistaDe } from "@/lib/experiencia";
import { dentroDelLimite, error, ipDe, mismoOrigen, sitio } from "@/lib/experiencia-http";

/**
 * Entrar con correo y cédula. La cédula es la clave: un número corto, así que
 * el límite de intentos es lo que impide adivinarla, por IP y por correo.
 *
 * Responde JSON al formulario de la página (que navega después) y con un
 * redirect al formulario sin JavaScript.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MENSAJES: Record<string, string> = {
  datos: "Revisa el correo y la cédula: la cédula va solo en números.",
  cedula: "Esa cédula no coincide con la que quedó fijada para este correo.",
  linkedin: "Este correo entró con LinkedIn. Entra con el botón de LinkedIn.",
  limite: "Demasiados intentos. Espera unos minutos.",
};

function destinoSeguro(v: unknown): string {
  const d = String(v ?? "");
  return /^\/experiencia(\/[a-z]+)?$/.test(d) ? d : "/experiencia";
}

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);
  const base = sitio(request);
  const quiereJson = (request.headers.get("accept") ?? "").includes("application/json");

  const tipo = request.headers.get("content-type") ?? "";
  let email = "";
  let cedula = "";
  let destino = "/experiencia";
  if (tipo.includes("application/json")) {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    email = String(b.email ?? "");
    cedula = String(b.cedula ?? "");
    destino = destinoSeguro(b.destino);
  } else {
    const f = await request.formData().catch(() => null);
    email = String(f?.get("email") ?? "");
    cedula = String(f?.get("cedula") ?? "");
    destino = destinoSeguro(f?.get("destino"));
  }

  const fallar = (motivo: string, status = 400) => {
    if (quiereJson) return error(MENSAJES[motivo] ?? motivo, status);
    const u = new URL(`${base}/experiencia`);
    u.searchParams.set("entrar", destino);
    u.searchParams.set("error", motivo);
    return NextResponse.redirect(u.toString(), { status: 303 });
  };

  const ip = ipDe(request);
  if (!dentroDelLimite(`entrar:${ip}`, 12, 15 * 60_000) || !dentroDelLimite(`entrar:${email.trim().toLowerCase()}`, 6, 15 * 60_000)) {
    await new Promise((r) => setTimeout(r, 800));
    return fallar("limite", 429);
  }

  const r = await entrar({ email, cedula });
  if (!r.ok) {
    await new Promise((res) => setTimeout(res, 500));
    return fallar(r.motivo, r.motivo === "cedula" ? 401 : 400);
  }

  const res = quiereJson
    ? NextResponse.json({ ok: true, destino, yo: vistaDe(r.participante) }, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.redirect(`${base}${destino}`, { status: 303 });
  res.cookies.set(COOKIE_SESION, firmarSesion(r.participante.id), opcionesDeCookie());
  return res;
}
