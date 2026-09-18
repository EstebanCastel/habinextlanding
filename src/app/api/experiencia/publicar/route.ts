import { leerBytes } from "@/lib/almacen";
import { LIMITES } from "@/config/experiencia";
import { anotar, cambiar, marcar, rutaDeCarnet, tokenDeLinkedIn, vistaDe, type Formato } from "@/lib/experiencia";
import { dentroDelLimite, error, mismoOrigen, participanteActual, responder } from "@/lib/experiencia-http";
import { publicar, type Imagen } from "@/lib/linkedin";

/**
 * Publica en el LinkedIn de la persona, con su token. El texto viene editado
 * por ella; las imágenes son su carnet y las fotos que eligió, leídas del
 * store y subidas a LinkedIn desde acá.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Cuerpo = {
  mision?: string;
  texto?: string;
  fotos?: unknown;
  carnet?: string;
};

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);

  const p = await participanteActual();
  if (!p) return error("Sin sesión. Recarga la página.", 401);

  // Publicar de más en LinkedIn es peor que no publicar: dos publicaciones
  // iguales seguidas parecen spam y LinkedIn las penaliza.
  if (!dentroDelLimite(`publicar:${p.id}`, 6, 60 * 60_000)) {
    return error("Ya publicaste varias veces en la última hora. Deja pasar un rato.", 429);
  }

  const cuerpo = (await request.json().catch(() => null)) as Cuerpo | null;
  if (!cuerpo) return error("Petición inválida.");

  const mision: "linkedin_voy" | "linkedin_fotos" = cuerpo.mision === "linkedin_fotos" ? "linkedin_fotos" : "linkedin_voy";
  const texto = String(cuerpo.texto ?? "").trim().slice(0, 2800);
  if (texto.length < 10) return error("Escribe algo en el texto.");

  const token = tokenDeLinkedIn(p);
  if (!token || !p.linkedin) return error("reconectar", 428);

  const hace2min = Date.now() - 2 * 60_000;
  if (p.publicaciones.some((x) => x.red === "linkedin" && new Date(x.en).getTime() > hace2min)) {
    return error("Acabas de publicar. Dale un minuto a LinkedIn antes de la siguiente.", 429);
  }

  const imagenes: Imagen[] = [];
  const formato: Formato | null = cuerpo.carnet === "feed" || cuerpo.carnet === "story" ? cuerpo.carnet : null;
  if (formato && p.carnet?.formatos.includes(formato)) {
    const c = await leerBytes(rutaDeCarnet(p.id, formato));
    if (c) imagenes.push({ bytes: c.bytes, contentType: c.contentType, alt: "Mi carnet de Habi Next Colombia" });
  }

  const pedidas = Array.isArray(cuerpo.fotos) ? cuerpo.fotos.map(String).slice(0, LIMITES.fotosPorPublicacion) : [];
  for (const fotoId of pedidas) {
    const foto = p.fotos.find((f) => f.id === fotoId);
    if (!foto) continue;
    const bytes = await leerBytes(foto.ruta);
    if (bytes) imagenes.push({ bytes: bytes.bytes, contentType: bytes.contentType, alt: "Habi Next Colombia" });
    if (imagenes.length >= LIMITES.fotosPorPublicacion) break;
  }

  const resultado = await publicar({ accessToken: token, sub: p.linkedin.sub, texto, imagenes });

  if (!resultado.ok) {
    await cambiar(p.id, (q) => anotar(q, "LinkedIn rechazó la publicación", `${resultado.motivo}: ${resultado.detalle}`));
    if (resultado.motivo === "reconectar") return error("reconectar", 428);
    if (resultado.motivo === "limite") return error("LinkedIn dice que hoy ya publicaste demasiado. Inténtalo mañana.", 429);
    if (resultado.motivo === "version") return error("Se nos venció la versión de la API de LinkedIn. Ya lo estamos revisando.", 502);
    return error("LinkedIn no aceptó la publicación. Inténtalo de nuevo en un momento.", 502);
  }

  const actualizado = await cambiar(p.id, (q) => {
    const con = {
      ...q,
      publicaciones: [
        ...q.publicaciones,
        { red: "linkedin" as const, mision, en: new Date().toISOString(), urn: resultado.urn, url: resultado.url, fotos: imagenes.length },
      ],
    };
    return marcar(anotar(con, "publicó en LinkedIn", resultado.url || resultado.urn), mision, resultado.url);
  });

  return responder({ ok: true, url: resultado.url, yo: actualizado ? vistaDe(actualizado) : vistaDe(p) });
}
