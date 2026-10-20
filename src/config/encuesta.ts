import { SESIONES, salonDe } from "./agenda";

/**
 * La encuesta de cierre.
 *
 * Siete bloques y noventa segundos. La restricción no es estética: se contesta
 * de pie, con el morral puesto, mientras la sala se vacía. Cada pregunta que
 * se agrega cuesta respuestas de las que faltan al final, así que acá solo
 * está lo que cambia una decisión del año entrante.
 *
 * El NPS por sí solo no decide nada: dice que la gente está contenta o no,
 * nunca por qué. Por eso el «por qué» va pegado al número y es obligatorio,
 * y por eso se califica cada parte por separado: ahí se ve si el 7 fue por la
 * comida, por el salón taller o por la app.
 *
 * Las dos preguntas de texto del final miden cosas distintas a propósito. «Qué
 * vas a aplicar» no mide satisfacción, mide si el día sirvió; alguien puede
 * salir encantado y no llevarse nada, y eso es un evento fallido aunque el
 * NPS salga en 9.
 */

export type ParteId = "inspira" | "taller" | "logistica" | "comida" | "stands" | "app";

export const PARTES: { id: ParteId; nombre: string; pista: string }[] = [
  { id: "inspira", nombre: "Salón Inspira", pista: "Las charlas del salón principal" },
  { id: "taller", nombre: "Salón Taller", pista: "Los talleres de Banco Caja Social" },
  { id: "logistica", nombre: "Organización y logística", pista: "Entrada, tiempos, señalización" },
  { id: "comida", nombre: "Comida y café", pista: "Almuerzo y estaciones" },
  { id: "stands", nombre: "Stands y aliados", pista: "La zona comercial" },
  { id: "app", nombre: "La app del evento", pista: "Carnet, agenda, puntos y premios" },
];

/** Las charlas de verdad, sin pausas ni transiciones, para escoger la mejor. */
export const CHARLAS = SESIONES.filter((s) => !s.tipo).map((s) => ({
  id: s.id,
  titulo: s.titulo,
  salon: salonDe(s.salon).nombre,
  ponente: s.ponente ?? s.ponentes?.join(" · ") ?? "",
  desde: s.desde ?? "",
}));

export type Vuelve = "si" | "talvez" | "no";
export type Pagaria = "si" | "depende" | "no";
export type Duracion = "corta" | "justa" | "larga";

export type Respuesta = {
  nps: number;
  porque: string;
  partes: Partial<Record<ParteId, number>>;
  /**
   * Las charlas que le sirvieron. Varias, no una: con dos salones en paralelo
   * y once bloques, casi nadie sale del día con una sola en la cabeza, y
   * obligar a escoger una borra justo la señal que sirve para armar la agenda.
   */
  charlas: string[];
  /** Lo que guardaron las primeras respuestas, cuando era una sola. */
  charla?: string;
  aplicar: string;
  cambiar: string;
  vuelve: Vuelve;
  pagaria: Pagaria;
  duracion: Duracion;
};

export const VUELVE: { id: Vuelve; texto: string }[] = [
  { id: "si", texto: "Sí, sin dudarlo" },
  { id: "talvez", texto: "Tal vez" },
  { id: "no", texto: "No" },
];

export const PAGARIA: { id: Pagaria; texto: string }[] = [
  { id: "si", texto: "Sí" },
  { id: "depende", texto: "Depende del precio" },
  { id: "no", texto: "No" },
];

export const DURACION: { id: Duracion; texto: string }[] = [
  { id: "corta", texto: "Corta" },
  { id: "justa", texto: "Justa" },
  { id: "larga", texto: "Larga" },
];

/**
 * Desde cuándo se muestra sola, en hora de Bogotá.
 *
 * Antes de esto la encuesta estorbaría: nadie califica un evento que todavía
 * está pasando. Se abre cuando la última charla del salón principal ya está
 * cerrando, que es el momento en que la gente tiene el celular en la mano y
 * todavía está en la silla.
 */
export const DESDE = "2026-10-20T17:45:00-05:00";

export const abierta = (ahora = new Date()): boolean => ahora.getTime() >= new Date(DESDE).getTime();

/** Mínimo de caracteres en las preguntas abiertas: que nadie se trabe, pero que tampoco ponga un punto. */
export const MINIMO_TEXTO = 3;

export function completa(r: Partial<Respuesta> | null | undefined): r is Respuesta {
  if (!r) return false;
  if (typeof r.nps !== "number" || r.nps < 0 || r.nps > 10) return false;
  if (!r.porque || r.porque.trim().length < MINIMO_TEXTO) return false;
  if (!r.partes || PARTES.some((p) => !r.partes?.[p.id])) return false;
  if (!Array.isArray(r.charlas) || r.charlas.length === 0) return false;
  if (!r.aplicar || r.aplicar.trim().length < MINIMO_TEXTO) return false;
  if (!r.cambiar || r.cambiar.trim().length < MINIMO_TEXTO) return false;
  if (!r.vuelve || !r.pagaria || !r.duracion) return false;
  return true;
}

/** Promotores menos detractores, en porcentaje. La cuenta de siempre. */
export function nps(notas: number[]): { nps: number; promotores: number; pasivos: number; detractores: number; n: number } {
  const n = notas.length;
  const promotores = notas.filter((x) => x >= 9).length;
  const pasivos = notas.filter((x) => x >= 7 && x <= 8).length;
  const detractores = notas.filter((x) => x <= 6).length;
  return {
    nps: n === 0 ? 0 : Math.round(((promotores - detractores) / n) * 100),
    promotores,
    pasivos,
    detractores,
    n,
  };
}
