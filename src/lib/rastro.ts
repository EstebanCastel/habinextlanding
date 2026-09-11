import { put } from "@vercel/blob";
import { listarRutas, leer } from "./almacen";

/**
 * Rastro de visitas: de dónde llega la gente y qué hace en la página.
 *
 * No es Segment ni pretende serlo. Es un cuaderno: cada lote de eventos se
 * escribe como un archivo JSON suelto en el mismo store privado donde vive la
 * boletería, y el panel los lee todos y saca las cuentas.
 *
 * **Un archivo por lote, con nombre aleatorio, y nunca se reescribe.** Esa es
 * la decisión que hace que esto aguante: si en vez de eso se fuera sumando
 * todo a un mismo archivo, dos visitas en el mismo segundo se pisarían y habría
 * que releer y reintentar en cada evento. Archivos independientes no tienen
 * concurrencia que resolver.
 *
 * Lo que **no** se guarda: la IP. Vercel entrega el país y la región ya
 * resueltos en las cabeceras de la petición, que es el dato que sirve para
 * decidir dónde pautar, sin quedarse con un identificador personal.
 */

export type Evento = {
  /** `visita`, `scroll`, `clic`, `salida`… */
  tipo: string;
  en: string;
  /** Detalle libre del evento: qué CTA, qué profundidad, cuántos segundos. */
  valor?: string | number;
};

export type Lote = {
  /** Anónimo y estable por navegador, para distinguir visitas de personas. */
  visitante: string;
  sesion: string;
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  /** De dónde venía cuando llegó, si el navegador lo dice. */
  referente?: string;
  entrada: string;
  dispositivo: {
    tipo: "movil" | "tableta" | "escritorio";
    sistema?: string;
    navegador?: string;
    ancho?: number;
    idioma?: string;
    zona?: string;
  };
  geo?: { pais?: string; region?: string; ciudad?: string };
  eventos: Evento[];
  recibidoEn: string;
};

const carpeta = (iso: string) => `rastro/${iso.slice(0, 10)}`;

/** Guarda un lote. Nombre irrepetible, sin lecturas previas ni reescrituras. */
export async function guardarLote(lote: Lote): Promise<void> {
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await put(`${carpeta(lote.recibidoEn)}/${nombre}.json`, JSON.stringify(lote), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
}

/** Todos los lotes de los últimos días, del más reciente al más viejo. */
export async function lotes(dias = 45, tope = 4000): Promise<Lote[]> {
  const rutas = await listarRutas("rastro/", tope);
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
  const vigentes = rutas.filter((r) => (r.split("/")[1] ?? "") >= desde);

  const salida: Lote[] = [];
  const tanda = 25;
  for (let i = 0; i < vigentes.length; i += tanda) {
    const trozo = await Promise.all(vigentes.slice(i, i + tanda).map((r) => leer<Lote>(r)));
    for (const l of trozo) if (l) salida.push(l);
  }
  return salida.sort((a, b) => b.recibidoEn.localeCompare(a.recibidoEn));
}

export type Resumen = {
  visitantes: number;
  sesiones: number;
  porFuente: { nombre: string; sesiones: number; visitantes: number; clicsBoleteria: number }[];
  porDispositivo: { nombre: string; sesiones: number }[];
  porPais: { nombre: string; sesiones: number }[];
  profundidad: { hasta25: number; hasta50: number; hasta75: number; hasta100: number };
  clics: { nombre: string; veces: number }[];
  segundosMediana: number;
};

/**
 * Cuentas del rastro.
 *
 * Se cuenta por **sesión** y no por evento: alguien que recarga cinco veces no
 * son cinco visitas, y contar eventos sueltos inflaría cualquier lectura. La
 * fuente sale de la UTM, y si no hay UTM se deduce del referente — porque la
 * mitad del tráfico real llega sin que nadie le haya puesto una etiqueta.
 */
export function resumir(lista: Lote[]): Resumen {
  const porSesion = new Map<string, Lote[]>();
  for (const l of lista) {
    const previo = porSesion.get(l.sesion);
    if (previo) previo.push(l);
    else porSesion.set(l.sesion, [l]);
  }

  const fuente = (l: Lote): string => {
    if (l.utm.source) return l.utm.source.toLowerCase();
    const r = (l.referente ?? "").toLowerCase();
    if (!r) return "directo";
    if (r.includes("google")) return "google";
    if (r.includes("instagram")) return "instagram";
    if (r.includes("linkedin")) return "linkedin";
    if (r.includes("facebook")) return "facebook";
    if (r.includes("whatsapp") || r.includes("wa.me")) return "whatsapp";
    try {
      return new URL(r).hostname.replace(/^www\./, "");
    } catch {
      return "otro";
    }
  };

  const acum = <T extends string>(pares: T[]) => {
    const m = new Map<T, number>();
    for (const p of pares) m.set(p, (m.get(p) ?? 0) + 1);
    return [...m.entries()]
      .map(([nombre, sesiones]) => ({ nombre, sesiones }))
      .sort((a, b) => b.sesiones - a.sesiones);
  };

  const sesiones = [...porSesion.values()];
  const primeroDe = (ls: Lote[]) => ls[ls.length - 1];
  const eventosDe = (ls: Lote[]) => ls.flatMap((l) => l.eventos);

  const clicsPorNombre = new Map<string, number>();
  const profundidad = { hasta25: 0, hasta50: 0, hasta75: 0, hasta100: 0 };
  const duraciones: number[] = [];
  const porFuenteMap = new Map<string, { sesiones: number; visitantes: Set<string>; clics: number }>();

  for (const ls of sesiones) {
    const base = primeroDe(ls);
    const f = fuente(base);
    const acc = porFuenteMap.get(f) ?? { sesiones: 0, visitantes: new Set<string>(), clics: 0 };
    acc.sesiones += 1;
    acc.visitantes.add(base.visitante);

    const evs = eventosDe(ls);
    let max = 0;
    let segundos = 0;
    for (const e of evs) {
      if (e.tipo === "scroll") max = Math.max(max, Number(e.valor) || 0);
      if (e.tipo === "salida") segundos = Math.max(segundos, Number(e.valor) || 0);
      if (e.tipo === "clic") {
        const n = String(e.valor ?? "");
        clicsPorNombre.set(n, (clicsPorNombre.get(n) ?? 0) + 1);
        if (n.startsWith("boleteria")) acc.clics += 1;
      }
    }
    porFuenteMap.set(f, acc);

    if (max >= 25) profundidad.hasta25 += 1;
    if (max >= 50) profundidad.hasta50 += 1;
    if (max >= 75) profundidad.hasta75 += 1;
    if (max >= 100) profundidad.hasta100 += 1;
    if (segundos > 0) duraciones.push(segundos);
  }

  duraciones.sort((a, b) => a - b);

  return {
    visitantes: new Set(lista.map((l) => l.visitante)).size,
    sesiones: sesiones.length,
    porFuente: [...porFuenteMap.entries()]
      .map(([nombre, v]) => ({
        nombre,
        sesiones: v.sesiones,
        visitantes: v.visitantes.size,
        clicsBoleteria: v.clics,
      }))
      .sort((a, b) => b.sesiones - a.sesiones),
    porDispositivo: acum(sesiones.map((ls) => primeroDe(ls).dispositivo.tipo)),
    porPais: acum(sesiones.map((ls) => primeroDe(ls).geo?.pais ?? "—")),
    profundidad,
    clics: [...clicsPorNombre.entries()]
      .map(([nombre, veces]) => ({ nombre, veces }))
      .sort((a, b) => b.veces - a.veces),
    segundosMediana: duraciones.length ? duraciones[Math.floor(duraciones.length / 2)] : 0,
  };
}

/** Una fila por sesión, para bajarlo a Excel. */
export function aCsv(lista: Lote[]): string {
  const cabecera = [
    "Fecha",
    "Visitante",
    "Sesión",
    "Fuente (utm_source)",
    "Medio",
    "Campaña",
    "Contenido",
    "Referente",
    "Entrada",
    "Dispositivo",
    "Sistema",
    "Navegador",
    "Ancho",
    "Idioma",
    "País",
    "Región",
    "Ciudad",
    "Scroll máx (%)",
    "Segundos",
    "Clics",
  ];

  const porSesion = new Map<string, Lote[]>();
  for (const l of lista) {
    const previo = porSesion.get(l.sesion);
    if (previo) previo.push(l);
    else porSesion.set(l.sesion, [l]);
  }

  // Excel en español lee el punto y coma como separador; con coma mete todo en
  // una sola columna. Y cada campo se entrecomilla porque una campaña con coma
  // o un referente con punto y coma parten la fila.
  const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const filas = [...porSesion.values()].map((ls) => {
    const base = ls[ls.length - 1];
    const evs = ls.flatMap((l) => l.eventos);
    const scroll = Math.max(0, ...evs.filter((e) => e.tipo === "scroll").map((e) => Number(e.valor) || 0));
    const seg = Math.max(0, ...evs.filter((e) => e.tipo === "salida").map((e) => Number(e.valor) || 0));
    const clics = evs.filter((e) => e.tipo === "clic").map((e) => e.valor).join(" · ");
    return [
      base.recibidoEn.slice(0, 19).replace("T", " "),
      base.visitante,
      base.sesion,
      base.utm.source ?? "",
      base.utm.medium ?? "",
      base.utm.campaign ?? "",
      base.utm.content ?? "",
      base.referente ?? "",
      base.entrada,
      base.dispositivo.tipo,
      base.dispositivo.sistema ?? "",
      base.dispositivo.navegador ?? "",
      base.dispositivo.ancho ?? "",
      base.dispositivo.idioma ?? "",
      base.geo?.pais ?? "",
      base.geo?.region ?? "",
      base.geo?.ciudad ?? "",
      scroll,
      seg,
      clics,
    ].map(celda).join(";");
  });

  // El BOM es lo que hace que Excel abra el archivo en UTF-8 y no destroce los
  // acentos ni los nombres de campaña.
  return "﻿" + [cabecera.map(celda).join(";"), ...filas].join("\r\n");
}
