import { NextResponse } from "next/server";
import { haySesion } from "@/lib/sesion";
import { armarPadron, conteo, deshacer, ultimas, validar, type Modo, type Tipo } from "@/lib/validacion";

/**
 * La puerta, por dentro.
 *
 * Todo pasa por acá: leer un QR, pedir las cuentas y refrescar el padrón. Va
 * detrás de la misma clave del panel —quien valida entradas es el equipo de
 * boletería, no cualquiera con el enlace.
 *
 * Nunca se cachea. Un conteo de hace treinta segundos en una puerta con fila
 * es peor que no tener conteo: hace creer que algo falla cuando lo único viejo
 * es la pantalla.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Armar el padrón son catorce llamadas a Luma y hay que esperarlas.
export const maxDuration = 60;

const sinCache = { "Cache-Control": "no-store" };
const responder = (dato: unknown, status = 200) => NextResponse.json(dato, { status, headers: sinCache });

const esModo = (v: unknown): v is Modo => v === "entrada" || v === "almuerzo";
const esTipo = (v: unknown): v is Tipo => v === "general" || v === "vip" || v === "equipo";

export async function GET(request: Request) {
  if (!(await haySesion())) return responder({ error: "Entra al panel primero." }, 401);

  const q = new URL(request.url).searchParams;
  const modo = esModo(q.get("modo")) ? (q.get("modo") as Modo) : "entrada";

  const [cuentas, recientes] = await Promise.all([
    conteo().catch(() => null),
    ultimas(modo, 12).catch(() => []),
  ]);
  if (!cuentas) return responder({ error: "No se pudieron leer las cuentas." }, 503);
  return responder({ ok: true, conteo: cuentas, ultimas: recientes });
}

export async function POST(request: Request) {
  if (!(await haySesion())) return responder({ error: "Entra al panel primero." }, 401);

  const cuerpo = (await request.json().catch(() => null)) as {
    accion?: unknown;
    texto?: unknown;
    modo?: unknown;
    por?: unknown;
    tipo?: unknown;
    id?: unknown;
  } | null;

  const accion = String(cuerpo?.accion ?? "validar");
  const modo: Modo = esModo(cuerpo?.modo) ? cuerpo.modo : "entrada";
  const por = String(cuerpo?.por ?? "").trim().slice(0, 40) || "puerta";
  const secreto = process.env.EXPERIENCIA_SECRET ?? "";

  if (accion === "refrescar-padron") {
    const p = await armarPadron().catch((e: Error) => ({ error: e.message }) as never);
    if ("error" in (p as object)) return responder({ error: "No se pudo leer la lista de Luma." }, 503);
    return responder({ ok: true, padron: (p as { gente: unknown[] }).gente.length });
  }

  if (accion === "deshacer") {
    if (!esTipo(cuerpo?.tipo) || typeof cuerpo?.id !== "string") {
      return responder({ error: "Falta a quién deshacer." }, 400);
    }
    await deshacer(modo, cuerpo.tipo, cuerpo.id);
    return responder({ ok: true });
  }

  const texto = String(cuerpo?.texto ?? "").trim();
  if (!texto) return responder({ error: "No llegó ningún código." }, 400);
  if (texto.length > 500) return responder({ error: "Ese código no tiene forma de entrada." }, 400);

  const veredicto = await validar(texto, { modo, por, secreto }).catch(() => null);
  if (!veredicto) return responder({ error: "No se pudo leer ese código. Intenta otra vez." }, 503);
  return responder(veredicto);
}
