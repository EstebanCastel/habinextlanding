import { CUPO_TALLER, SESIONES } from "@/config/agenda";
import { cuposDeTalleres, reservarTaller, vistaDe } from "@/lib/experiencia";
import { dentroDelLimite, error, ipDe, mismoOrigen, participanteActual, responder } from "@/lib/experiencia-http";
import { urlDePase } from "@/lib/pases";

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
const secreto = () => process.env.EXPERIENCIA_SECRET ?? "";

/**
 * El pase de cada taller reservado.
 *
 * Uno por taller y no uno solo para todos: en la puerta del salón se valida
 * una sesión concreta, y un pase genérico obligaría a preguntar «¿a cuál
 * vienes?» justo cuando hay fila.
 */
const pases = (id: string, talleres: string[]) =>
  Object.fromEntries(talleres.map((t) => [t, urlDePase("taller", id, secreto(), SITIO, t)]));

/**
 * Las reservas del Salón Taller.
 *
 * La sala tiene mesas con corriente y acompañamiento de verdad, así que tiene
 * tope. Sin reserva la gente llegaba a una sesión sin puesto; saber de
 * antemano que no alcanzó es mejor que descubrirlo en la puerta de la sala.
 *
 * GET devuelve los talleres con lo que queda libre; POST reserva o suelta. A
 * diferencia del almuerzo, acá entra cualquiera: el Salón Taller es parte de
 * las dos entradas.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const talleres = () =>
  SESIONES.filter((s) => s.salon === "taller" && s.tipo !== "pausa" && s.tipo !== "bloqueo");

const conCupo = (conteos: Record<string, number>) =>
  talleres().map((t) => ({
    id: t.id,
    titulo: t.titulo,
    desde: t.desde ?? "",
    ponente: t.ponente ?? "",
    detallePonente: t.detallePonente ?? "",
    resumen: t.resumen ?? "",
    necesitas: t.necesitas ?? "",
    libres: Math.max(0, CUPO_TALLER - (conteos[t.id] ?? 0)),
    cupo: CUPO_TALLER,
  }));

export async function GET() {
  const [p, conteos] = await Promise.all([participanteActual(), cuposDeTalleres()]);
  const mios = (p?.talleres ?? []).map((t) => t.id);
  return responder({
    ok: true,
    talleres: conCupo(conteos),
    mios,
    ...(p ? { pases: pases(p.id, mios) } : {}),
  });
}

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);
  if (!dentroDelLimite(`taller:${ipDe(request)}`, 40, 10 * 60_000)) {
    return error("Demasiados intentos. Espera un momento.", 429);
  }
  const p = await participanteActual();
  if (!p) return error("Entra con tu correo y cédula para reservar.", 401);

  const cuerpo = (await request.json().catch(() => null)) as { taller?: unknown } | null;
  const taller = typeof cuerpo?.taller === "string" ? cuerpo.taller : "";
  if (!taller) return error("Escoge un taller.");

  const r = await reservarTaller(p.id, taller);
  if (!r.participante) return error(r.motivo ?? "No se pudo guardar tu reserva.", 404);
  const mios = (r.participante.talleres ?? []).map((t) => t.id);
  return responder({
    ok: !r.motivo,
    ...(r.motivo ? { motivo: r.motivo } : {}),
    yo: vistaDe(r.participante),
    talleres: conCupo(r.cupos),
    mios,
    pases: pases(r.participante.id, mios),
  });
}
