"use client";

import Image from "next/image";
import { useRef } from "react";
import { EVENT, LINKS } from "@/config/event";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

const sections = [
  { href: "#aprendizajes", label: "Qué aprenderás" },
  { href: "#experiencia", label: "La experiencia" },
  { href: "#escenarios", label: "Escenarios" },
  { href: "#boleteria", label: "Boletería" },
];

/**
 * Barra transparente sobre el hero que se vuelve sólida al bajar, se esconde
 * al seguir bajando y vuelve al subir. La línea inferior es el mismo hilo de
 * la página, midiendo el avance de la lectura.
 */
export default function Nav() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      const solid = gsap.to(el, {
        backgroundColor: "rgba(5,2,8,0.82)",
        backdropFilter: "blur(18px)",
        borderBottomColor: "rgba(255,255,255,0.1)",
        duration: 0.35,
        paused: true,
      });

      const hide = gsap.to(el, { yPercent: -100, duration: 0.4, ease: "power2.out", paused: true });

      const trigger = ScrollTrigger.create({
        start: 40,
        end: "max",
        onUpdate: (self) => {
          if (self.scroll() > 40) solid.play();
          else solid.reverse();
          // Se esconde solo al bajar y bien pasado el hero.
          if (self.direction === 1 && self.scroll() > 640) hide.play();
          else hide.reverse();
        },
      });

      const progress = gsap.to(".nav-progress", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
      });

      return () => {
        trigger.kill();
        progress.kill();
        solid.kill();
        hide.kill();
      };
    },
    { scope: root },
  );

  return (
    <header
      ref={root}
      className="fixed inset-x-0 top-0 z-50 border-b border-transparent bg-transparent"
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-5 py-3 md:px-10 md:py-4">
        <a
          href="#top"
          className="flex shrink-0 items-center gap-3"
          aria-label={`${EVENT.name} ${EVENT.city}`}
        >
          <Image
            src="/img/logo.png"
            alt="Habi"
            width={684}
            height={642}
            priority
            className="h-8 w-auto md:h-10"
          />
          <span className="hidden text-sm font-semibold tracking-tight text-white/70 sm:block md:text-base">
            Next {EVENT.city}
          </span>
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {sections.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <a
          href={LINKS.general}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-[#802ef6] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6d25d1] md:px-7 md:py-3 md:text-base"
        >
          Quiero mi entrada
        </a>
      </div>

      <div className="nav-progress h-[2px] w-full origin-left scale-x-0 bg-[#802ef6]" />
    </header>
  );
}
