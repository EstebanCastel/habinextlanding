import { CHARLAS, PARTES, nps as calcularNps, type ParteId } from "@/config/encuesta";
import { leer } from "./almacen";
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

export async function armarTablero(): Promise<Tablero> {
  const fallos: string[] = [];
  const [docs, uso] = await Promise.all([
    todas().catch((e: unknown) => {
      fallos.push(`encuesta: ${e instanceof Error ? e.message : String(e)}`);
      return [] as Guardada[];
    }),
    leer<Uso>("tablero/uso.json").catch((e: unknown) => {
      fallos.push(`uso: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
  ]);

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
