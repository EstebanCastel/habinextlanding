"use client";

import Image from "next/image";
import { PARADAS, RUTAS, paradasDe, type Parada, type RutaId } from "@/config/experiencia";

/**
 * El plano del recinto, con las nueve paradas encima.
 *
 * Es el mismo plano que está impreso en la señalización del evento. Antes acá
 * había un dibujo propio, bonito pero distinto: quien lo miraba en el teléfono
 * y después levantaba la vista al tótem veía dos mapas que no coincidían, y
 * eso en un recinto que no conoce es peor que no tener mapa.
 *
 * Las paradas van posicionadas en porcentaje sobre la imagen, no en píxeles:
 * esto se mira en un teléfono de 380 px y en una pantalla de 1400, y lo único
 * estable entre los dos es la proporción.
 *
 * Cada marca dice en qué va: pendiente, la que sigue —que late— y hecha.
 */

export type PlanoProps = {
  hechas: Record<string, unknown>;
  seleccion: string | null;
  visible: (ruta: RutaId) => boolean;
  proximas: Partial<Record<RutaId, Parada | undefined>>;
  juegoAbierto: boolean;
  alElegir: (id: string) => void;
};

const colorDe = (ruta: RutaId) => RUTAS.find((r) => r.id === ruta)?.color ?? "#802ef6";

export default function Plano({ hechas, seleccion, visible, proximas, juegoAbierto, alElegir }: PlanoProps) {
  return (
    <div className="relative select-none">
      <Image
        src="/img/evento/mapa-oficial.jpg"
        alt="Mapa del recinto de Habi Next Colombia, con los nueve puntos del recorrido"
        width={1122}
        height={1502}
        priority
        className="block h-auto w-full"
      />

      {PARADAS.map((p) => {
        const hecha = Boolean(hechas[p.id]);
        const sigue = proximas[p.ruta]?.id === p.id;
        const elegida = seleccion === p.id;
        const atenuada = !visible(p.ruta);
        const color = colorDe(p.ruta);

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => alElegir(p.id)}
            aria-label={`${p.orden}. ${p.nombre}${hecha ? " · ya la hiciste" : ""}`}
            aria-pressed={elegida}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
              atenuada ? "opacity-30" : "opacity-100"
            }`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {/* El latido de la que sigue. Va detrás y no en el botón para que
                no agrande el área que se toca. */}
            {sigue && !hecha && juegoAbierto ? (
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 animate-ping rounded-full motion-reduce:animate-none"
                style={{ background: color, opacity: 0.55 }}
              />
            ) : null}

            <span
              className={`grid size-8 place-items-center rounded-full border-2 text-[13px] font-extrabold tabular-nums shadow-[0_6px_16px_-4px_rgba(0,0,0,0.8)] transition-transform sm:size-9 sm:text-sm ${
                elegida ? "scale-110" : ""
              }`}
              style={{
                background: hecha ? color : "rgba(13,6,24,0.92)",
                borderColor: hecha ? color : elegida ? "#ffffff" : color,
                color: hecha ? "#ffffff" : "#ffffff",
              }}
            >
              {hecha ? (
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                numeroGlobal(p)
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * El número que lleva la parada en el plano impreso: del 1 al 9 corrido, no
 * el orden dentro de su ruta. En el piso están numeradas así y la app tiene
 * que decir lo mismo.
 */
function numeroGlobal(p: Parada): number {
  const orden = RUTAS.flatMap((r) => paradasDe(r.id));
  return orden.findIndex((x) => x.id === p.id) + 1;
}
