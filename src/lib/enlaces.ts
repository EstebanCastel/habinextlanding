import { crearSiNoExiste, leer, listarRutas, modificar } from "./almacen";

/**
 * Enlaces cortos propios: `habinext.com/l/li` en vez de una URL con cinco
 * parámetros colgando.
 *
 * Van en el dominio del evento y no en un acortador de terceros por tres
 * razones prácticas: se ve que es de Habi (nadie duda antes de tocarlo), no
 * depende de un servicio que puede caerse o empezar a cobrar justo antes del
 * evento, y el clic queda contado acá mismo — que es la diferencia entre saber
 * cuánta gente tocó el link de Instagram y cuánta llegó de verdad a la página.
 */

export type Enlace = {
  /** Corto y en minúsculas: es lo que se escribe a mano en una historia. */
  slug: string;
  /** Ruta de destino dentro del sitio. */
  destino: string;
  utm: { source: string; medium: string; campaign: string; content?: string; term?: string };
  clics: number;
  ultimoClic?: string;
  nota?: string;
  creadoEn: string;
};

const ruta = (slug: string) => `enlaces/${normalizar(slug)}.json`;

export function normalizar(slug: string): string {
  return String(slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export async function traer(slug: string): Promise<Enlace | null> {
  const limpio = normalizar(slug);
  return limpio ? leer<Enlace>(ruta(limpio)) : null;
}

export async function crear(datos: {
  slug: string;
  destino?: string;
  source: string;
  medium?: string;
  campaign?: string;
  content?: string;
  nota?: string;
}): Promise<{ ok: boolean; nota: string }> {
  const slug = normalizar(datos.slug);
  if (slug.length < 1) return { ok: false, nota: "El enlace necesita un nombre corto" };
  if (!datos.source.trim()) return { ok: false, nota: "Falta la fuente (utm_source)" };

  const enlace: Enlace = {
    slug,
    destino: (datos.destino || "/").startsWith("/") ? datos.destino || "/" : `/${datos.destino}`,
    utm: {
      source: datos.source.trim().toLowerCase(),
      medium: (datos.medium || "social").trim().toLowerCase(),
      campaign: (datos.campaign || "habinext-2026").trim().toLowerCase(),
      ...(datos.content?.trim() ? { content: datos.content.trim().toLowerCase() } : {}),
    },
    clics: 0,
    ...(datos.nota?.trim() ? { nota: datos.nota.trim() } : {}),
    creadoEn: new Date().toISOString(),
  };

  // Sin pisar: reescribir uno que ya circula le pondría los clics en cero y,
  // peor, cambiaría a dónde lleva un link que ya está publicado.
  const gano = await crearSiNoExiste(ruta(slug), enlace);
  return gano
    ? { ok: true, nota: `Enlace /l/${slug} creado` }
    : { ok: false, nota: `El enlace /l/${slug} ya existe` };
}

/** Arma la URL final con sus UTM. */
export function destinoDe(enlace: Enlace, base: string): string {
  const url = new URL(enlace.destino, base);
  url.searchParams.set("utm_source", enlace.utm.source);
  url.searchParams.set("utm_medium", enlace.utm.medium);
  url.searchParams.set("utm_campaign", enlace.utm.campaign);
  if (enlace.utm.content) url.searchParams.set("utm_content", enlace.utm.content);
  if (enlace.utm.term) url.searchParams.set("utm_term", enlace.utm.term);
  return url.toString();
}

export async function contarClic(slug: string): Promise<void> {
  await modificar<Enlace>(ruta(slug), (e) =>
    e ? { ...e, clics: e.clics + 1, ultimoClic: new Date().toISOString() } : null
  );
}

export async function todos(): Promise<Enlace[]> {
  const rutas = await listarRutas("enlaces/", 300);
  const salida: Enlace[] = [];
  for (const r of rutas) {
    const e = await leer<Enlace>(r);
    if (e) salida.push(e);
  }
  return salida.sort((a, b) => b.clics - a.clics);
}
