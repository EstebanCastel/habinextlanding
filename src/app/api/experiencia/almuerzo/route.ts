import { ALMUERZOS } from "@/config/agenda";
import { cuposDeAlmuerzo, escogerAlmuerzo, vistaDe } from "@/lib/experiencia";
import { dentroDelLimite, error, ipDe, mismoOrigen, participanteActual, responder } from "@/lib/experiencia-http";
import { urlDePase } from "@/lib/pases";

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";

/**
 * El pase del almuerzo: un QR propio, distinto al de la entrada.
 *
 * En el restaurante se comprueba el turno, que es algo que el QR de Luma no
 * lleva. Y separa los errores: quien enseña el de la entrada recibe «ese no
 * es el pase del almuerzo» en vez de un «ya entró» que no le dice nada.
 */
const paseDe = (id: string) =>
  urlDePase("almuerzo", id, process.env.EXPERIENCIA_SECRET ?? "", SITIO);

/**
 * El turno de almuerzo de quien tiene entrada VIP.
 *
 * El almuerzo va de 12:30 a 2:00 y la sala no da para todos a la vez, así que
 * se parte en tres turnos de media hora con cupo. Escoger turno es escoger qué
 * charla no te pierdes, porque al mediodía va el bloque del futuro de Habi.
 *
 * GET devuelve los turnos con lo que queda libre; POST guarda el que escogió.
 * La entrada General no llega acá: el almuerzo va con la VIP y ofrecérselo a
 * quien no lo compró sería prometer algo que no tiene.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const conCupo = (conteos: Record<string, number>) =>
  ALMUERZOS.map((t) => ({
    id: t.id,
    rotulo: t.rotulo,
    desde: t.desde,
    hasta: t.hasta,
    teAlcanza: t.teAlcanza,
    libres: Math.max(0, t.cupo - (conteos[t.id] ?? 0)),
  }));

export async function GET() {
  const p = await participanteActual();
  const conteos = await cuposDeAlmuerzo();
  return responder({
    ok: true,
    turnos: conCupo(conteos),
    mio: p?.almuerzo?.turno ?? null,
    puede: p?.registro?.tier === "vip",
    ...(p ? { pase: paseDe(p.id) } : {}),
  });
}

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);
  if (!dentroDelLimite(`almuerzo:${ipDe(request)}`, 30, 10 * 60_000)) {
    return error("Demasiados intentos. Espera un momento.", 429);
  }
  const p = await participanteActual();
  if (!p) return error("Entra con tu correo y cédula para escoger tu turno.", 401);
  if (p.registro?.tier !== "vip") return error("El almuerzo va con la entrada VIP.", 403);

  const cuerpo = (await request.json().catch(() => null)) as { turno?: unknown } | null;
  const turno = typeof cuerpo?.turno === "string" ? cuerpo.turno : "";
  if (!turno) return error("Escoge un turno.");

  const r = await escogerAlmuerzo(p.id, turno);
  if (!r.participante) return error(r.motivo ?? "No se pudo guardar tu turno.", 404);
  return responder({
    ok: !r.motivo,
    ...(r.motivo ? { motivo: r.motivo } : {}),
    yo: vistaDe(r.participante),
    turnos: conCupo(r.cupos),
    mio: r.participante.almuerzo?.turno ?? null,
    pase: paseDe(r.participante.id),
  });
}
