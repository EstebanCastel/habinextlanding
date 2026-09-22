import { randomBytes } from "node:crypto";
import { guardarArchivo } from "@/lib/almacen";
import { PARADAS, RECINTO } from "@/config/experiencia";
import { cambiar, distanciaM, fase, marcarParada, rutaDeArchivo, vistaDe, type Foto } from "@/lib/experiencia";
import { dentroDelLimite, error, ipDe, mismoOrigen, participanteActual, responder, tipoDeImagen } from "@/lib/experiencia-http";

/**
 * Check-in en una parada del mapa del tesoro: la foto del stand y, si el
 * celular la da, la ubicación. La ubicación se compara con el recinto; la
 * foto queda guardada como prueba y se puede ver en el panel.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);
  if (!dentroDelLimite(`parada:${ipDe(request)}`, 60, 10 * 60_000)) return error("Demasiados intentos. Espera un momento.", 429);

  const p = await participanteActual();
  if (!p) return error("Sin sesión. Entra de nuevo.", 401);

  const form = await request.formData().catch(() => null);
  if (!form) return error("No pudimos leer el formulario.");

  const paradaId = String(form.get("parada") ?? "");
  const parada = PARADAS.find((x) => x.id === paradaId);
  if (!parada) return error("Esa parada no existe.");
  if (p.mapa?.paradas?.[paradaId]) return error("Esta parada ya la tienes hecha.", 409);

  if (fase() !== "evento") return error("El mapa se juega el día del evento, el 20 de octubre.", 403);

  const archivo = form.get("foto");
  if (!(archivo instanceof Blob)) return error("Falta la foto del stand.");
  if (archivo.size > 6 * 1024 * 1024) return error("Esa foto pesa demasiado.");
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const tipo = tipoDeImagen(bytes);
  if (!tipo) return error("Solo aceptamos JPG, PNG o WebP.");

  // La ubicación es opcional (bajo techo el GPS falla), pero si viene tiene
  // que estar cerca del recinto.
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  const conGeo = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
  let distancia: number | undefined;
  if (conGeo) {
    distancia = distanciaM(lat, lng);
    if (process.env.EXPERIENCIA_GEO !== "off" && distancia > RECINTO.radioM) {
      return error(`Parece que no estás en ${RECINTO.nombre}: el check-in se hace desde el recinto.`, 403);
    }
  }

  const fotoId = randomBytes(8).toString("base64url");
  const ruta = rutaDeArchivo(p.id, fotoId, tipo.ext);
  await guardarArchivo(ruta, bytes, tipo.tipo);
  const foto: Foto = { id: fotoId, ruta, tipo: tipo.tipo, bytes: bytes.byteLength, subidaEn: new Date().toISOString(), clase: "parada", de: paradaId };

  const actualizado = await cambiar(p.id, (q) =>
    marcarParada({ ...q, fotos: [...q.fotos, foto] }, paradaId, {
      en: foto.subidaEn,
      fotoId,
      ...(conGeo ? { lat, lng, distanciaM: distancia } : {}),
    })
  );
  if (!actualizado) return error("No encontramos tu sesión. Recarga la página.", 404);
  return responder({ ok: true, yo: vistaDe(actualizado) });
}
