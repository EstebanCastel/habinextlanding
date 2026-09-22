import { randomBytes } from "node:crypto";
import { guardarArchivo } from "@/lib/almacen";
import { LIMITES, MISIONES } from "@/config/experiencia";
import { agregarFoto, anotar, cambiar, fase, marcar, quitarFoto, rutaDeArchivo, vistaDe, type Foto } from "@/lib/experiencia";
import {
  dentroDelLimite,
  error,
  ipDe,
  mismoOrigen,
  participanteActual,
  participanteOCrear,
  responder,
  tipoDeImagen,
} from "@/lib/experiencia-http";

/**
 * Las fotos del evento. Llegan de a una, ya reducidas en el navegador, y se
 * guardan en el store privado bajo la carpeta de la persona. Se comprueba el
 * formato por los bytes y no por lo que diga el nombre del archivo.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);
  if (!dentroDelLimite(`fotos:${ipDe(request)}`, 120, 10 * 60_000)) return error("Demasiadas subidas. Espera un momento.", 429);

  const form = await request.formData().catch(() => null);
  if (!form) return error("No pudimos leer el archivo.");

  const archivo = form.get("foto");
  const claseCruda = String(form.get("clase") ?? "foto");
  const clase: Foto["clase"] = claseCruda === "frase" ? "frase" : claseCruda === "prueba" ? "prueba" : "foto";
  // Una prueba es la captura de una publicación: va atada a su misión.
  const mision = clase === "prueba" ? MISIONES.find((m) => m.id === String(form.get("mision") ?? "")) : undefined;
  if (clase === "prueba" && !mision) return error("¿De qué misión es la prueba?");
  if (!(archivo instanceof Blob)) return error("Falta la foto.");
  if (archivo.size > LIMITES.bytesPorArchivo) return error("Esa foto pesa demasiado.");

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const tipo = tipoDeImagen(bytes);
  if (!tipo) return error("Solo aceptamos JPG, PNG o WebP.");

  // Las fotos del evento son del evento: antes de ese día la misión está
  // cerrada también acá, no solo en la pantalla. Las pruebas siguen la fase
  // de su misión.
  const requiereEvento = clase === "prueba" ? mision!.fase === "evento" : true;
  if (requiereEvento && fase() !== "evento") return error("Esto se abre el día del evento, el 20 de octubre.", 403);

  const sesion = await participanteOCrear();
  const p = sesion.participante;
  if (clase === "foto" && p.fotos.filter((f) => f.clase === "foto").length >= LIMITES.fotos) {
    return error(`Ya subiste ${LIMITES.fotos} fotos, que es el máximo.`, 409);
  }

  const fotoId = randomBytes(8).toString("base64url");
  const ruta = rutaDeArchivo(p.id, fotoId, tipo.ext);
  await guardarArchivo(ruta, bytes, tipo.tipo);

  const foto: Foto = { id: fotoId, ruta, tipo: tipo.tipo, bytes: bytes.byteLength, subidaEn: new Date().toISOString(), clase, ...(mision ? { de: mision.id } : {}) };
  const actualizado =
    clase === "prueba"
      ? await cambiar(p.id, (q) => marcar(anotar({ ...q, fotos: [...q.fotos, foto] }, "subió una prueba", mision!.titulo), mision!.id, "prueba subida"))
      : await agregarFoto(p.id, foto, clase === "foto" ? "fotos" : undefined);
  if (!actualizado) return error("No encontramos tu sesión. Recarga la página.", 404);

  return responder({ ok: true, foto: { id: fotoId, tipo: tipo.tipo, clase }, yo: vistaDe(actualizado) }, sesion);
}

export async function DELETE(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);
  const p = await participanteActual();
  if (!p) return error("Sin sesión.", 401);
  const fotoId = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(fotoId)) return error("Foto inválida.");
  const actualizado = await quitarFoto(p.id, fotoId);
  return responder({ ok: true, yo: vistaDe(actualizado ?? p) });
}
