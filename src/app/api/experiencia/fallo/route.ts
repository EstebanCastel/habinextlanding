import { anotar, cambiar } from "@/lib/experiencia";
import { dentroDelLimite, error, ipDe, mismoOrigen, participanteActual, responder } from "@/lib/experiencia-http";

/**
 * Lo que se rompió del lado de la persona.
 *
 * El carnet se arma en el navegador: si la foto no se puede leer o el guardado
 * no llega, hasta ahora eso solo lo veía quien estaba al frente de la pantalla
 * y nosotros nunca nos enterábamos. Acá queda anotado en su bitácora, con el
 * paso y el motivo, para poder llamar a quien se quedó atascado.
 *
 * No cambia nada más del participante: es una nota, no un estado.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PASOS: Record<string, string> = {
  foto: "no pudo cargar su foto",
  carnet: "no pudo guardar su carnet",
  piezas: "no pudo cargar las piezas del carnet",
};

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);
  // Generoso con los intentos: un fallo que no se puede anotar no sirve de nada.
  if (!dentroDelLimite(`fallo:${ipDe(request)}`, 30, 10 * 60_000)) return responder({ ok: true });

  const cuerpo = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const que = PASOS[String(cuerpo.paso ?? "")];
  if (!que) return responder({ ok: true });
  const detalle = String(cuerpo.detalle ?? "").replace(/\s+/g, " ").slice(0, 200) || undefined;

  const p = await participanteActual();
  // Sin sesión no hay a quién anotárselo; igual queda en los registros del
  // servidor, que es lo único que podemos hacer por esa persona.
  if (!p) {
    console.warn("[experiencia] fallo sin sesión:", que, detalle ?? "");
    return responder({ ok: true });
  }
  await cambiar(p.id, (q) => anotar(q, que, detalle)).catch(() => null);
  return responder({ ok: true });
}
