import { CHARLAS, PARTES, nps as calcularNps, type ParteId } from "@/config/encuesta";
import { agrupar, type Agrupado } from "@/config/temas";
import { leer, listarRutas } from "./almacen";
import { todas, type Guardada } from "./encuesta";

/**
 * Lo que mira el tablero de cierre.
 *
 * La encuesta se lee en vivo porque son pocas fichas y porque un tablero de
 * NPS que va media hora atrasado no sirve para nada. El uso de la app no: son
 * ochocientas fichas de participante y leerlas todas tarda cerca de un minuto,
 * así que se calculan aparte con `_metricas.mjs` y acá solo se lee el
 * resultado. La página dice a qué hora se armó cada cosa para que nadie decida
 * creyendo que el número es de ahora mismo.
 */

export type Uso = {
  armadoEn: string;
  creados: number;
  /** Cuántos correos distintos pasaron por el lector de la puerta. */
  puerta?: number;
  /** El techo contra el que se mide todo: quién se registró de verdad. */
  luma?: { general: number; vip: number; aprobados: number; pendientes: number; rechazados: number };
  dentro: {
    total: number;
    carnet: number;
    linkedin: number;
    publicaron: number;
    publicaciones: number;
    conFoto: number;
    fotosEvento: number;
    paradas: number;
    paradasTotal: number;
    agenda: number;
    agendaTotal: number;
    talleres: number;
    almuerzo: number;
  };
};

export type Tablero = {
  n: number;
  nps: ReturnType<typeof calcularNps>;
  notaPromedio: number;
  partes: { id: ParteId; nombre: string; promedio: number }[];
  charlas: { id: string; titulo: string; salon: string; ponente: string; desde: string; votos: number }[];
  vuelve: Record<string, number>;
  pagaria: Record<string, number>;
  duracion: Record<string, number>;
  via: Record<string, number>;
  uso: Uso | null;
  /**
   * El mismo NPS partido por quién contestó.
   *
   * El enlace salió a los 852 de Luma, así que puede contestar alguien que
   * nunca vino, y las anónimas no se pueden cruzar con nada. Mezclarlo todo en
   * un solo número esconde justo la diferencia que importa: el NPS de quien
   * estuvo en la silla no es el mismo que el del total.
   */
  cortes: {
    confirmados: ReturnType<typeof calcularNps>;
    sinQr: ReturnType<typeof calcularNps>;
    anonimas: ReturnType<typeof calcularNps>;
    puerta: number;
  };
  /**
   * Lo que la gente escribió, agrupado por tema. Es lo único de la encuesta
   * que dice *qué* hacer; el NPS solo dice si hay que hacer algo.
   */
  cualitativo: {
    cambiar: { temas: Agrupado[]; sinQueja: number; total: number; sinClasificar: number };
    aplicar: { temas: Agrupado[]; sinQueja: number; total: number; sinClasificar: number };
  };
  armadoEn: string;
  /**
   * Qué se rompió al leer, si algo se rompió.
   *
   * Antes esto se tragaba en un `catch` y devolvía ceros, que es la peor
   * respuesta posible: un tablero en ceros por un fallo de lectura se ve
   * exactamente igual que un tablero en ceros porque nadie ha contestado, y
   * alguien decide creyendo que el evento salió mal.
   */
  fallos: string[];
};

const contar = (docs: Guardada[], campo: "vuelve" | "pagaria" | "duracion" | "via") =>
  docs.reduce<Record<string, number>>((a, d) => {
    const v = campo === "via" ? d.via : d.respuesta[campo];
    if (v) a[v] = (a[v] ?? 0) + 1;
    return a;
  }, {});

/**
 * Los correos a los que sí les leímos el QR en la puerta. La marca guarda el
 * id de Luma, no el correo, así que se traduce con el padrón: es lo único que
 * las dos listas comparten.
 */
async function correosEnLaPuerta(): Promise<Set<string>> {
  const [padron, rutas] = await Promise.all([
    leer<{ gente?: { id: string; correo?: string }[] }>("validacion/padron.json"),
    listarRutas("validacion/entrada/", 5000),
  ]);
  const correoDe = new Map((padron?.gente ?? []).map((g) => [g.id, (g.correo ?? "").toLowerCase()]));
  const puerta = new Set<string>();
  for (const r of rutas) {
    if (r.includes("__prueba__")) continue;
    const id = r.slice("validacion/entrada/".length).replace(/\.json$/, "").split("__").slice(1).join("__");
    const correo = correoDe.get(id) || (id.includes("@") ? id.toLowerCase() : "");
    if (correo) puerta.add(correo);
  }
  return puerta;
}

export async function armarTablero(): Promise<Tablero> {
  const fallos: string[] = [];
  const [docs, uso, puerta] = await Promise.all([
    todas().catch((e: unknown) => {
      fallos.push(`encuesta: ${e instanceof Error ? e.message : String(e)}`);
      return [] as Guardada[];
    }),
    leer<Uso>("tablero/uso.json").catch((e: unknown) => {
      fallos.push(`uso: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
    correosEnLaPuerta().catch(() => new Set<string>()),
  ]);

  const notasDe = (xs: Guardada[]) => xs.map((d) => d.respuesta.nps).filter((n) => typeof n === "number");
  const conCorreo = docs.filter((d) => d.email);
  const cortes = {
    confirmados: calcularNps(notasDe(conCorreo.filter((d) => puerta.has(String(d.email).toLowerCase())))),
    sinQr: calcularNps(notasDe(conCorreo.filter((d) => !puerta.has(String(d.email).toLowerCase())))),
    anonimas: calcularNps(notasDe(docs.filter((d) => !d.email))),
    puerta: puerta.size,
  };

  const notas = docs.map((d) => d.respuesta.nps).filter((n) => typeof n === "number");

  const votos = new Map<string, number>();
  for (const d of docs) {
    // Las primeras respuestas guardaron una sola charla, antes de que la
    // pregunta aceptara varias. Cuentan igual.
    const cs = d.respuesta.charlas ?? (d.respuesta.charla ? [d.respuesta.charla] : []);
    for (const c of cs) votos.set(c, (votos.get(c) ?? 0) + 1);
  }

  const charlas = CHARLAS.map((c) => ({ ...c, votos: votos.get(c.id) ?? 0 }))
    .filter((c) => c.votos > 0)
    .sort((a, b) => b.votos - a.votos);

  return {
    n: docs.length,
    nps: calcularNps(notas),
    notaPromedio: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0,
    partes: PARTES.map((p) => {
      const xs = docs.map((d) => d.respuesta.partes?.[p.id]).filter((x): x is number => Boolean(x));
      return { id: p.id, nombre: p.nombre, promedio: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0 };
    }).sort((a, b) => b.promedio - a.promedio),
    charlas,
    vuelve: contar(docs, "vuelve"),
    pagaria: contar(docs, "pagaria"),
    duracion: contar(docs, "duracion"),
    via: contar(docs, "via"),
    uso,
    cortes,
    cualitativo: {
      cambiar: agrupar(docs.map((d) => ({ texto: d.respuesta.cambiar ?? "", nps: d.respuesta.nps })), "cambiar"),
      aplicar: agrupar(docs.map((d) => ({ texto: d.respuesta.aplicar ?? "", nps: d.respuesta.nps })), "aplicar"),
    },
    armadoEn: new Date().toISOString(),
    fallos,
  };
}

export const hora = (iso: string): string =>
  new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
