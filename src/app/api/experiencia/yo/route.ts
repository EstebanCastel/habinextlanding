import { vistaDe } from "@/lib/experiencia";
import { dentroDelLimite, error, ipDe, mismoOrigen, participanteOCrear, responder } from "@/lib/experiencia-http";

/**
 * Abre la sesión de la experiencia sin pedir nada: la página lo llama cuando
 * la persona toca una misión que necesita un identificador —su link de
 * invitación, por ejemplo— antes de haber guardado su carnet.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);
  if (!dentroDelLimite(`yo:${ipDe(request)}`, 30, 10 * 60_000)) return error("Demasiados intentos.", 429);
  const sesion = await participanteOCrear();
  return responder({ ok: true, yo: vistaDe(sesion.participante) }, sesion);
}
