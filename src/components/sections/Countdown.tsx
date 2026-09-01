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
    <section className="relative w-full overflow-hidden bg-[#802ef6]">
      <div className="habi-tape h-4 w-full md:h-6" />

      <div className="flex flex-col items-center px-5 py-16 md:py-24">
        <div className="flex items-start justify-center gap-3 sm:gap-6 md:gap-10">
          {units.map((unit, i) => (
            <div key={unit.key} className="flex items-start">
              <div className="flex min-w-[62px] flex-col items-center sm:min-w-[84px] md:min-w-[110px]">
                <span
                  suppressHydrationWarning
                  className="font-bold italic leading-none text-white"
                  style={{ fontSize: "clamp(2.75rem, 9vw, 6.5rem)" }}
                >
                  {pad(left[unit.key])}
                </span>
                <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/75 sm:text-xs">
                  {unit.label}
                </span>
              </div>
              {i < units.length - 1 ? (
                <span
                  className="font-bold italic leading-none text-white/60"
                  style={{ fontSize: "clamp(1.75rem, 5vw, 4rem)" }}
                >
                  :
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <p className="mt-10 border-t border-white/30 pt-6 text-center text-sm font-bold uppercase tracking-[0.2em] text-white sm:text-base md:text-lg">
          Para Habi Next {EVENT.city} · {EVENT.dateLong}
        </p>
      </div>

      <div className="habi-tape h-4 w-full md:h-6" />
    </section>
  );
}
