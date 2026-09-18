import { guardarArchivo } from "@/lib/almacen";
import { anotar, cambiar, marcar, rutaDeCarnet, vistaDe, type Formato } from "@/lib/experiencia";
import {
  dentroDelLimite,
  error,
  ipDe,
  mismoOrigen,
  participanteOCrear,
  responder,
  tipoDeImagen,
} from "@/lib/experiencia-http";

/**
 * Guarda el carnet que la persona armó en su navegador. El dibujo se hace en
 * el cliente —es lo que le permite verlo cambiar mientras escribe—; acá solo
 * llega la imagen final, se valida que sea una imagen y se anota la misión.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limpiar = (v: unknown, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);
  if (!dentroDelLimite(`carnet:${ipDe(request)}`, 40, 10 * 60_000)) return error("Demasiados intentos. Espera un momento.", 429);

  const form = await request.formData().catch(() => null);
  if (!form) return error("No pudimos leer el formulario.");

  const imagen = form.get("imagen");
  const formato: Formato = form.get("formato") === "story" ? "story" : "feed";
  const nombre = limpiar(form.get("nombre"), 40);
  const apellido = limpiar(form.get("apellido"), 40);

  if (!(imagen instanceof Blob)) return error("Falta la imagen del carnet.");
  if (imagen.size > 4 * 1024 * 1024) return error("El carnet pesa demasiado.");
  const bytes = new Uint8Array(await imagen.arrayBuffer());
  const tipo = tipoDeImagen(bytes);
  if (!tipo || tipo.tipo !== "image/jpeg") return error("El carnet tiene que ser una imagen JPG.");

  const sesion = await participanteOCrear();
  const id = sesion.participante.id;

  await guardarArchivo(rutaDeCarnet(id, formato), bytes, "image/jpeg");
  const p = await cambiar(id, (q) => {
    const formatos = Array.from(new Set([...(q.carnet?.formatos ?? []), formato]));
    const conCarnet = {
      ...q,
      nombre: nombre || q.nombre,
      apellido: apellido || q.apellido,
      carnet: { renderizadoEn: new Date().toISOString(), formatos, veces: (q.carnet?.veces ?? 0) + 1 },
    };
    return marcar(anotar(conCarnet, "guardó su carnet", formato), "carnet");
  });
  if (!p) return error("No encontramos tu sesión. Recarga la página.", 404);

  return responder({ ok: true, yo: vistaDe(p) }, sesion);
}
