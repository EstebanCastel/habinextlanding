"use client";

import { useEffect, useState } from "react";
import { EVENT } from "@/config/event";

const units = [
  { key: "days", label: "Días" },
  { key: "hours", label: "Horas" },
  { key: "minutes", label: "Minutos" },
  { key: "seconds", label: "Segundos" },
] as const;

type Left = Record<(typeof units)[number]["key"], number>;

const TARGET = new Date(EVENT.startsAt).getTime();

function diff(): Left {
  const d = TARGET - Date.now();
  if (d <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(d / 86_400_000),
    hours: Math.floor((d % 86_400_000) / 3_600_000),
    minutes: Math.floor((d % 3_600_000) / 60_000),
    seconds: Math.floor((d % 60_000) / 1000),
  };
}

/**
 * Cuenta regresiva al evento. El primer valor se calcula en el render, así que
 * no hay parpadeo en 00; los segundos del HTML servido difieren de los del
 * cliente por definición, de ahí el suppressHydrationWarning en las cifras.
 */
export default function Countdown() {
  const [left, setLeft] = useState<Left>(diff);

  useEffect(() => {
    const id = setInterval(() => setLeft(diff()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <section className="s-violet relative w-full overflow-hidden">
      <div className="flex flex-col items-center px-5 py-16 md:py-24">
        <div className="flex items-start justify-center gap-3 sm:gap-6 md:gap-10">
          {units.map((unit, i) => (
            <div
              key={unit.key}
              className="flex items-start"
              style={{ fontSize: "clamp(3.5rem, 13vw, 10rem)" }}
            >
              <div className="flex min-w-[76px] flex-col items-center sm:min-w-[112px] md:min-w-[170px]">
                {/* Solo cifras a la vista. La unidad se queda para lectores de
                    pantalla, que si no leerían cuatro números sin contexto. */}
                <span className="sr-only" suppressHydrationWarning>
                  {left[unit.key]} {unit.label}
                </span>
                <span
                  aria-hidden="true"
                  suppressHydrationWarning
                  className="font-bold leading-none text-white"
                  style={{ fontSize: "clamp(3.5rem, 13vw, 10rem)" }}
                >
                  {pad(left[unit.key])}
                </span>
              </div>
              {i < units.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="flex shrink-0 flex-col gap-[0.19em] pt-[0.24em]"
                >
                  {/* Dos puntos dibujados, no el glifo ":": el glifo se apoya
                      en la línea base de la cifra y quedaba descolgado. Las
                      medidas van en em, así que escalan con el marcador, y el
                      pt los centra contra la altura visual del número. */}
                  <span className="block h-[0.11em] w-[0.11em] rounded-full bg-white/45" />
                  <span className="block h-[0.11em] w-[0.11em] rounded-full bg-white/45" />
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <p className="mt-10 border-t border-white/30 pt-6 text-center text-sm font-bold uppercase tracking-[0.2em] text-white sm:text-base md:text-lg">
          Para {EVENT.fullName} · {EVENT.dateLong}
        </p>
      </div>
    </section>
  );
}
