"use client";

import { useRef } from "react";
import Asterisk from "@/components/Asterisk";
import { EVENT } from "@/config/event";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

const items = [
  `${EVENT.dateShort} de 2026`,
  EVENT.city,
  "Un día completo",
  "Escenario Inspira",
  "Escenario Taller",
  "Espacio VIP",
  "Zona Partners",
  "Agentes inmobiliarios y financieros",
];

/**
 * Cinta entre el hero y el primer bloque de contenido. Avanza sola, pero el
 * scroll la empuja: al bajar acelera, al subir se devuelve. Es el primer sitio
 * donde el movimiento de la página y el de la marca se sincronizan.
 */
export default function Ticker() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const track = root.current?.querySelector<HTMLElement>(".ticker-track");
      if (!track) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const loop = gsap.to(track, {
          xPercent: -50,
          repeat: -1,
          duration: 34,
          ease: "none",
        });

        const trigger = ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            // La velocidad del scroll modula la de la cinta; el signo invierte
            // el sentido cuando el usuario sube.
            const boost = gsap.utils.clamp(0.4, 6, Math.abs(self.getVelocity()) / 320);
            gsap.to(loop, {
              timeScale: boost * (self.direction === -1 ? -1 : 1),
              duration: 0.4,
              overwrite: true,
            });
          },
        });

        return () => {
          loop.kill();
          trigger.kill();
        };
      });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="s-violet relative w-full overflow-hidden border-y-[3px] border-[#050208] py-4 md:py-5"
    >
      <div className="ticker-track flex w-max items-center">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center" aria-hidden={copy === 1}>
            {items.map((item) => (
              <span key={item} className="flex items-center">
                <span className="whitespace-nowrap px-6 text-sm font-semibold uppercase tracking-[0.22em] text-white md:px-9 md:text-base">
                  {item}
                </span>
                <Asterisk color="#ffffff" className="h-4 w-4 shrink-0 md:h-5 md:w-5" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
