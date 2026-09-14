import { todos as todosLosEnlaces, type Enlace } from "./enlaces";
import { todos as todosLosRegistros, type Registro } from "./registros";

/**
 * Cuánta gente trajo cada quien.
 *
 * El cruce es por `utm_source`: el enlace de cada persona lo lleva en la URL,
 * la landing se lo pega al botón que sale a Luma, Luma lo guarda y lo devuelve
 * en el webhook, y así el registro queda con el nombre de quien lo trajo.
 *
 * Lo que se cuenta como logro es el **registro**, no el clic. Un clic dice que
 * alguien compartió bien el enlace; un registro dice que la persona del otro
 * lado quiso ir. La meta se mide contra lo segundo.
 */

export type Marcador = {
  enlace: Enlace;
  /** Nombre visible: el de la persona si la hay, si no el del canal. */
  quien: string;
  registros: number;
  general: number;
  vip: number;
  pagados: number;
  /** Porcentaje de la meta, o null si el enlace no tiene meta. */
  avance: number | null;
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
  const [enlaces, registros] = await Promise.all([
    todosLosEnlaces().catch(() => [] as Enlace[]),
    todosLosRegistros().catch(() => [] as Registro[]),
  ]);

  const porOrigen = new Map<string, Registro[]>();
  for (const r of registros) {
    const o = (r.luma.origen ?? "").trim().toLowerCase();
    if (!o) continue;
    if (!porOrigen.has(o)) porOrigen.set(o, []);
    porOrigen.get(o)!.push(r);
  }

  const marcadores: Marcador[] = enlaces.map((enlace) => {
    const suyos = porOrigen.get(enlace.utm.source) ?? [];
    const meta = enlace.meta ?? 0;
    return {
      enlace,
      quien: enlace.persona?.nombre ?? enlace.utm.source,
      registros: suyos.length,
      general: suyos.filter((r) => r.tier === "general").length,
      vip: suyos.filter((r) => r.tier === "vip").length,
      pagados: suyos.filter((r) => r.pago.confirmadoEn || r.etapa === "aprobado").length,
      avance: meta > 0 ? Math.round((suyos.length / meta) * 100) : null,
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
    metaTotal: marcadores.reduce((n, m) => n + (m.enlace.meta ?? 0), 0),
    traidosTotal: marcadores.reduce((n, m) => n + m.registros, 0),
  };
}

/** Planilla para repartir: a cada quien su enlace y su meta. */
export function aCsv(t: Tablero, sitio: string): string {
  const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const cabecera = [
    "Nombre",
    "Correo",
    "Enlace para compartir",
    "Meta",
    "Registros traídos",
    "Avance",
    "General",
    "VIP",
    "Pagados",
    "Clics al enlace",
    "utm_source",
    "Enlace largo",
  ];

  const filas = t.marcadores.map((m) => {
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
      e.meta || "",
      m.registros,
      m.avance === null ? "" : `${m.avance}%`,
      m.general,
      m.vip,
      m.pagados,
      e.clics,
      e.utm.source,
      largo.toString(),
    ].map(celda).join(";");
  });

  // Punto y coma y BOM: es lo que hace que Excel en español lo abra en
  // columnas y con los acentos derechos.
  return "﻿" + [cabecera.map(celda).join(";"), ...filas].join("\r\n");
}
