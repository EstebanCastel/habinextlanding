import { sesionDe } from "@/config/agenda";
import { interesPorSesion, marcarInteres, vistaDe } from "@/lib/experiencia";
import { dentroDelLimite, error, ipDe, mismoOrigen, participanteActual, responder } from "@/lib/experiencia-http";

/**
 * «Me interesa» en una sesión de la agenda. No da puntos: es para que la
 * persona arme su día y para que el equipo vea qué charlas tienen más
 * expectativa. GET devuelve los conteos; POST marca o desmarca.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return responder({ ok: true, conteos: await interesPorSesion() });
}

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);
  if (!dentroDelLimite(`agenda:${ipDe(request)}`, 120, 10 * 60_000)) return error("Demasiados intentos. Espera un momento.", 429);
  const p = await participanteActual();
  if (!p) return error("Entra con tu correo y cédula para guardar lo que te interesa.", 401);

  const cuerpo = (await request.json().catch(() => null)) as { sesion?: unknown; gusta?: unknown } | null;
  const sesion = typeof cuerpo?.sesion === "string" ? sesionDe(cuerpo.sesion) : undefined;
  if (!sesion || sesion.tipo) return error("Esa sesión no existe.");

  const r = await marcarInteres(p.id, sesion.id, Boolean(cuerpo?.gusta));
  if (!r.participante) return error("No encontramos tu sesión. Recarga la página.", 404);
  return responder({ ok: true, yo: vistaDe(r.participante), conteos: r.conteos });
}
