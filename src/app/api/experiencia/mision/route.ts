import { LIMITES } from "@/config/experiencia";
import { anotar, cambiar, fase, marcar, vistaDe } from "@/lib/experiencia";
import { dentroDelLimite, error, ipDe, mismoOrigen, participanteOCrear, responder } from "@/lib/experiencia-http";

/**
 * Las misiones que se completan en el aparato de la persona y no en nuestro
 * servidor: compartir a Instagram por la hoja del sistema, mandar la
 * invitación por WhatsApp, guardar la frase. La página avisa acá cuando pasó.
 *
 * No hay forma de comprobar desde afuera que la historia de Instagram salió,
 * y no se pretende: el premio es simbólico y la trampa cuesta más que hacerlo.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Cuerpo = { mision?: string; detalle?: string; frase?: string; nombre?: string; apellido?: string };

const limpiar = (v: unknown, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);
  if (!dentroDelLimite(`mision:${ipDe(request)}`, 60, 10 * 60_000)) return error("Demasiados intentos.", 429);

  const cuerpo = (await request.json().catch(() => null)) as Cuerpo | null;
  if (!cuerpo) return error("Petición inválida.");

  const sesion = await participanteOCrear();
  const id = sesion.participante.id;
  const ahora = new Date().toISOString();
  const detalle = limpiar(cuerpo.detalle, 80) || undefined;

  let actualizado = null;

  switch (cuerpo.mision) {
    case "instagram_voy":
    case "instagram_fotos": {
      const mision = cuerpo.mision;
      if (mision === "instagram_fotos" && fase() !== "evento") return error("Esa misión se abre el día del evento.", 403);
      actualizado = await cambiar(id, (p) => {
        const con = {
          ...p,
          publicaciones: [...p.publicaciones, { red: "instagram" as const, mision, en: ahora, fotos: Number(detalle?.match(/\d+/)?.[0] ?? 1) }],
        };
        return marcar(anotar(con, "compartió a Instagram", detalle), mision, detalle);
      });
      break;
    }
    case "invitar": {
      actualizado = await cambiar(id, (p) => {
        const con = {
          ...p,
          publicaciones: [...p.publicaciones, { red: "whatsapp" as const, mision: "invitar" as const, en: ahora, fotos: 0 }],
        };
        return marcar(anotar(con, "mandó su invitación por WhatsApp"), "invitar");
      });
      break;
    }
    case "frase": {
      if (fase() !== "evento") return error("Esa misión se abre el día del evento.", 403);
      const frase = limpiar(cuerpo.frase, LIMITES.frase);
      if (frase.length < 8) return error("Escribe una frase un poco más larga.");
      actualizado = await cambiar(id, (p) => marcar(anotar({ ...p, frase }, "escribió su frase", frase), "frase"));
      break;
    }
    case "nombre": {
      const nombre = limpiar(cuerpo.nombre, 40);
      const apellido = limpiar(cuerpo.apellido, 40);
      if (!nombre) return error("Falta el nombre.");
      actualizado = await cambiar(id, (p) => ({ ...p, nombre, apellido }));
      break;
    }
    default:
      return error("Misión desconocida.");
  }

  if (!actualizado) return error("No encontramos tu sesión. Recarga la página.", 404);
  return responder({ ok: true, yo: vistaDe(actualizado) }, sesion);
}
