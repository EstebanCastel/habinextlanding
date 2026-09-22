import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { guardarArchivo } from "@/lib/almacen";
import {
  COOKIE_SESION,
  cambiar,
  conectarLinkedIn,
  firmarSesion,
  idDeSesion,
  opcionesDeCookie,
  rutaDeArchivo,
  vincularRegistro,
} from "@/lib/experiencia";
import { sitio, tipoDeImagen } from "@/lib/experiencia-http";
import { canjearCodigo, configurado, perfil } from "@/lib/linkedin";
import { igualSeguro } from "@/lib/seguridad";
import { COOKIE_ESTADO } from "../route";

/**
 * Vuelta de LinkedIn. Con el código se pide el token, con el token el perfil,
 * y con el perfil se deja a la persona conectada: nombre y apellido para el
 * carnet, su foto de LinkedIn como primera foto, y su entrada si el correo
 * coincide con un registro.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPERIENCIAS = new Set(["carnet", "mapa", "redes"]);

function volverCon(base: string, params: Record<string, string>, ancla = "") {
  const url = new URL(EXPERIENCIAS.has(ancla) ? `${base}/experiencia/${ancla}` : `${base}/experiencia`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (!EXPERIENCIAS.has(ancla)) url.hash = ancla;
  const res = NextResponse.redirect(url.toString(), { status: 303 });
  res.cookies.set(COOKIE_ESTADO, "", { path: "/api/experiencia/linkedin", maxAge: 0 });
  return res;
}

/** Baja la foto de perfil y la guarda como una foto más de la persona. */
async function guardarFotoDePerfil(id: string, url: string): Promise<void> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!res?.ok) return;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > 3 * 1024 * 1024) return;
  const tipo = tipoDeImagen(bytes);
  if (!tipo) return;
  const fotoId = randomBytes(8).toString("base64url");
  const ruta = rutaDeArchivo(id, fotoId, tipo.ext);
  await guardarArchivo(ruta, bytes, tipo.tipo);
  await cambiar(id, (p) => ({
    ...p,
    fotos: [
      ...p.fotos.filter((f) => f.clase !== "perfil"),
      { id: fotoId, ruta, tipo: tipo.tipo, bytes: bytes.byteLength, subidaEn: new Date().toISOString(), clase: "perfil" },
    ],
    linkedin: p.linkedin ? { ...p.linkedin, fotoId } : p.linkedin,
  }));
}

export async function GET(request: Request) {
  const base = sitio(request);
  const q = new URL(request.url).searchParams;
  const tienda = await cookies();
  const estado = tienda.get(COOKIE_ESTADO)?.value ?? "";
  const [stateEsperado = "", volver = ""] = estado.split("|");

  if (!configurado()) return volverCon(base, { li: "sin-configurar" });
  if (q.get("error")) return volverCon(base, { li: "cancelado" }, volver);

  const code = q.get("code") ?? "";
  const state = q.get("state") ?? "";
  if (!code || !state || !stateEsperado || !igualSeguro(state, stateEsperado)) {
    return volverCon(base, { li: "estado" }, volver);
  }

  try {
    const { accessToken, expiraEnSegundos } = await canjearCodigo(code, `${base}/api/experiencia/linkedin/callback`);
    const quien = await perfil(accessToken);
    const idSesion = idDeSesion(tienda.get(COOKIE_SESION)?.value);
    const p = await conectarLinkedIn({ idSesion, perfil: quien, accessToken, expiraEnSegundos });

    // La foto de LinkedIn y la entrada se buscan acá y no en cada página:
    // cuestan una petición externa y una lectura de todos los registros.
    await Promise.all([
      quien.foto && !p.linkedin?.fotoId ? guardarFotoDePerfil(p.id, quien.foto).catch(() => null) : null,
      vincularRegistro(p.id, quien.email).catch(() => null),
    ]);

    const res = volverCon(base, { li: "ok" }, volver || "");
    res.cookies.set(COOKIE_SESION, firmarSesion(p.id), opcionesDeCookie());
    return res;
  } catch (error) {
    console.error("[experiencia] LinkedIn falló:", (error as Error).message);
    return volverCon(base, { li: "fallo" }, volver);
  }
}
