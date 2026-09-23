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
  /** Clics por variante (`/l/<slug>?c=a`), cuando la pieza se prueba en dos versiones. */
  clicsPor?: Record<string, number>;
  /**
   * Clics que parecen de una persona (celular o escritorio real), total y por
   * variante. Los robots de revisión de Meta y los escáneres de enlaces de los
   * celulares abren el link sin que nadie lo haya tocado, y en una campaña de
   * WhatsApp pueden ser la mitad del conteo bruto.
   */
  clicsHumanos?: number;
  clicsHumanosPor?: Record<string, number>;
  ultimoClic?: string;
  nota?: string;
  /** Quién reparte este enlace, cuando es de una persona y no de un canal. */
  persona?: { nombre: string; email?: string };
  /**
   * Cuántos registros se espera que traiga, por tipo de entrada. Van separadas
   * porque no cuestan lo mismo de conseguir: quince Generales y cinco VIP son
   * dos trabajos distintos, y una sola cifra los esconde.
   */
  metas: { general: number; vip: number };
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
  persona?: { nombre: string; email?: string };
  metaGeneral?: number;
  metaVip?: number;
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
    ...(datos.persona?.nombre?.trim()
      ? {
          persona: {
            nombre: datos.persona.nombre.trim(),
            ...(datos.persona.email?.trim() ? { email: datos.persona.email.trim().toLowerCase() } : {}),
          },
        }
      : {}),
    metas: {
      general: Math.max(0, Math.trunc(datos.metaGeneral ?? 0)),
      vip: Math.max(0, Math.trunc(datos.metaVip ?? 0)),
    },
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

export async function contarClic(
  slug: string,
  variante?: string,
  clase: "movil" | "escritorio" | "robot" = "movil"
): Promise<void> {
  await modificar<Enlace>(ruta(slug), (e) => {
    if (!e) return null;
    const clicsPor = variante ? { ...(e.clicsPor ?? {}), [variante]: (e.clicsPor?.[variante] ?? 0) + 1 } : e.clicsPor;
    const humano = clase !== "robot";
    const clicsHumanos = (e.clicsHumanos ?? 0) + (humano ? 1 : 0);
    const clicsHumanosPor =
      humano && variante
        ? { ...(e.clicsHumanosPor ?? {}), [variante]: (e.clicsHumanosPor?.[variante] ?? 0) + 1 }
        : e.clicsHumanosPor;
    return {
      ...e,
      clics: e.clics + 1,
      ...(clicsPor ? { clicsPor } : {}),
      clicsHumanos,
      ...(clicsHumanosPor ? { clicsHumanosPor } : {}),
      ultimoClic: new Date().toISOString(),
    };
  });
}

export async function todos(): Promise<Enlace[]> {
  const rutas = await listarRutas("enlaces/", 300);
  const salida: Enlace[] = [];
  const TANDA = 40;
  for (let i = 0; i < rutas.length; i += TANDA) {
    const trozo = await Promise.all(rutas.slice(i, i + TANDA).map((r) => leer<Enlace>(r)));
    // Los enlaces de canal se crearon antes de que existieran las metas.
    for (const e of trozo) if (e) salida.push({ ...e, metas: e.metas ?? { general: 0, vip: 0 } });
  }
  return salida.sort((a, b) => b.clics - a.clics);
}

/** Cambia las metas de un enlace que ya circula, sin tocar sus clics. */
export async function fijarMetas(
  slug: string,
  metas: { general: number; vip: number }
): Promise<boolean> {
  const res = await modificar<Enlace>(ruta(normalizar(slug)), (e) =>
    e ? { ...e, metas: { general: Math.max(0, metas.general), vip: Math.max(0, metas.vip) } } : null
  );
  return Boolean(res);
}
