import { EXPERIENCIAS, MISIONES, PARADAS, RUTAS, puntosDeExperiencia, type ExperienciaId } from "@/config/experiencia";
import type { Vista } from "@/lib/experiencia";

/** Cuánto lleva la persona en cada experiencia, calculado con lo que ya tiene el navegador. */
export function puntosEn(yo: Vista | null, id: ExperienciaId): { hechos: number; posibles: number } {
  const posibles = puntosDeExperiencia(id);
  if (!yo) return { hechos: 0, posibles };
  if (id === "mapa") {
    const paradas = PARADAS.reduce((s, p) => s + (yo.mapa.paradas[p.id] ? p.puntos : 0), 0);
    const rutas = RUTAS.reduce((s, r) => s + (yo.mapa.rutas[r.id] ? r.bono : 0), 0);
    return { hechos: paradas + rutas, posibles };
  }
  const hechos = MISIONES.filter((m) => m.experiencia === id && yo.misiones[m.id]).reduce((s, m) => s + m.puntos, 0);
  return { hechos, posibles };
}

export const experienciaDe = (id: ExperienciaId) => EXPERIENCIAS.find((e) => e.id === id)!;
