import { todos as todosLosEnlaces, type Enlace } from "./enlaces";
import { lotes, type Lote } from "./rastro";
import { todos as todosLosRegistros, type Registro } from "./registros";

/**
 * Cuánta gente trajo cada quien.
 *
 * Se cruzan tres capas, todas por el mismo `utm_source`:
 *
 * 1. **El enlace corto** cuenta cuántos lo tocaron.
 * 2. **El rastro de la landing** cuenta cuántos llegaron de verdad a la página
 *    y cuántos tocaron boletería — es nuestro dato, no depende de nadie.
 * 3. **El registro en Luma**, que guarda el `utm_source` de su URL y lo
 *    devuelve en el webhook.
 *
 * Tenerlas las tres es lo que hace útil el tablero: entre los clics y las
 * visitas se ve quién comparte un enlace que nadie abre, y entre las visitas y
 * los registros, quién trae gente que mira y no se inscribe. Son dos problemas
 * distintos y se arreglan de forma distinta.
 *
 * Lo que se cuenta como logro es el **registro**. Un clic dice que alguien
 * compartió bien el enlace; un registro dice que la persona del otro lado
 * quiso ir. La meta se mide contra lo segundo.
 */

export type Marcador = {
  enlace: Enlace;
  /** Nombre visible: el de la persona si la hay, si no el del canal. */
  quien: string;
  /** Del rastro propio de la landing. */
  visitas: number;
  personas: number;
  clicsBoleteria: number;
  /** De Luma. */
  registros: number;
  general: number;
  vip: number;
  pagados: number;
  /** Porcentaje contra la meta de cada tipo, o null si el enlace no tiene meta. */
  avance: number | null;
  avanceGeneral: number | null;
  avanceVip: number | null;
  meta: number;
};

export type Tablero = {
  marcadores: Marcador[];
  /** Registros que no vinieron por ningún enlace conocido. */
  sinAtribuir: number;
  totalRegistros: number;
  metaTotal: number;
  traidosTotal: number;
};

export async function tablero(): Promise<Tablero> {
  const [enlaces, registros, rastro] = await Promise.all([
    todosLosEnlaces().catch(() => [] as Enlace[]),
    todosLosRegistros().catch(() => [] as Registro[]),
    lotes().catch(() => [] as Lote[]),
  ]);

  // Rastro propio, agrupado por sesión y por la fuente con la que entró.
  const visitasPorFuente = new Map<string, { sesiones: Set<string>; visitantes: Set<string>; clics: number }>();
  const sesionesVistas = new Map<string, Lote[]>();
  for (const l of rastro) {
    if (!sesionesVistas.has(l.sesion)) sesionesVistas.set(l.sesion, []);
    sesionesVistas.get(l.sesion)!.push(l);
  }
  for (const ls of sesionesVistas.values()) {
    const base = ls[ls.length - 1];
    const f = (base.utm.source ?? "").trim().toLowerCase();
    if (!f) continue;
    if (!visitasPorFuente.has(f)) {
      visitasPorFuente.set(f, { sesiones: new Set(), visitantes: new Set(), clics: 0 });
    }
    const acc = visitasPorFuente.get(f)!;
    acc.sesiones.add(base.sesion);
    acc.visitantes.add(base.visitante);
    for (const l of ls) {
      for (const e of l.eventos) {
        if (e.tipo === "clic" && String(e.valor ?? "").startsWith("boleteria")) acc.clics += 1;
      }
    }
  }

  const porOrigen = new Map<string, Registro[]>();
  for (const r of registros) {
    const o = (r.luma.origen ?? "").trim().toLowerCase();
    if (!o) continue;
    if (!porOrigen.has(o)) porOrigen.set(o, []);
    porOrigen.get(o)!.push(r);
  }

  const marcadores: Marcador[] = enlaces.map((enlace) => {
    const suyos = porOrigen.get(enlace.utm.source) ?? [];
    const metas = enlace.metas ?? { general: 0, vip: 0 };
    const meta = metas.general + metas.vip;
    const generales = suyos.filter((r) => r.tier === "general").length;
    const vips = suyos.filter((r) => r.tier === "vip").length;
    const trafico = visitasPorFuente.get(enlace.utm.source);
    return {
      enlace,
      quien: enlace.persona?.nombre ?? enlace.utm.source,
      visitas: trafico?.sesiones.size ?? 0,
      personas: trafico?.visitantes.size ?? 0,
      clicsBoleteria: trafico?.clics ?? 0,
      registros: suyos.length,
      general: generales,
      vip: vips,
      pagados: suyos.filter((r) => r.pago.confirmadoEn || r.etapa === "aprobado").length,
      meta,
      avance: meta > 0 ? Math.round((suyos.length / meta) * 100) : null,
      avanceGeneral: metas.general > 0 ? Math.round((generales / metas.general) * 100) : null,
      avanceVip: metas.vip > 0 ? Math.round((vips / metas.vip) * 100) : null,
    };
  });

  // Quien va más lejos de su meta primero: es a quien hay que empujar.
  marcadores.sort((a, b) => {
    if (a.avance !== null && b.avance !== null) return b.avance - a.avance;
    return b.registros - a.registros;
  });

  const fuentesConocidas = new Set(enlaces.map((e) => e.utm.source));
  const sinAtribuir = registros.filter((r) => {
    const o = (r.luma.origen ?? "").trim().toLowerCase();
    return !o || !fuentesConocidas.has(o);
  }).length;

  return {
    marcadores,
    sinAtribuir,
    totalRegistros: registros.length,
    metaTotal: marcadores.reduce((n, m) => n + m.meta, 0),
    traidosTotal: marcadores.reduce((n, m) => n + m.registros, 0),
  };
}

/** Planilla para repartir: a cada quien su enlace y su meta. */
export const CABECERA_HOJA = [
  "Nombre",
  "Correo",
  "Enlace para compartir",
  "Meta General",
  "Meta VIP",
  "Registros traídos",
  "Avance",
  "General",
  "VIP",
  "Pagados",
  "Clics al enlace",
  "Visitas a la landing",
  "Personas distintas",
  "Clics a boletería",
  "utm_source",
  "Enlace largo",
] as const;

export type FilaHoja = (string | number)[];

/**
 * Una fila por enlace, en el orden de la planilla del equipo. Es la misma
 * tabla que baja el panel en CSV y la que la hoja de Google refresca sola;
 * si cambia una columna acá, cambia en las dos.
 */
export function aFilas(t: Tablero, sitio: string): FilaHoja[] {
  return t.marcadores.map((m) => {
    const e = m.enlace;
    const largo = new URL(e.destino, sitio);
    largo.searchParams.set("utm_source", e.utm.source);
    largo.searchParams.set("utm_medium", e.utm.medium);
    largo.searchParams.set("utm_campaign", e.utm.campaign);
    if (e.utm.content) largo.searchParams.set("utm_content", e.utm.content);
    return [
      m.quien,
      e.persona?.email ?? "",
      `${sitio}/l/${e.slug}`,
      e.metas?.general || "",
      e.metas?.vip || "",
      m.registros,
      m.avance === null ? "" : `${m.avance}%`,
      m.general,
      m.vip,
      m.pagados,
      e.clics,
      m.visitas,
      m.personas,
      m.clicsBoleteria,
      e.utm.source,
      largo.toString(),
    ];
  });
}

export function aCsv(t: Tablero, sitio: string): string {
  const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const filas = aFilas(t, sitio).map((f) => f.map(celda).join(";"));
  // Punto y coma y BOM: es lo que hace que Excel en español lo abra en
  // columnas y con los acentos derechos.
  return "\ufeff" + [CABECERA_HOJA.map(celda).join(";"), ...filas].join("\r\n");
}
