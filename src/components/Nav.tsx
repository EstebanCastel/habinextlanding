"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import Dot from "@/components/Dot";
import { EVENT, LINKS } from "@/config/event";
import { gsap, useGSAP } from "@/lib/gsap";

const sections = [
  { href: "#aprendizajes", label: "Qué aprenderás" },
  { href: "#experiencia", label: "La experiencia" },
  { href: "#escenarios", label: "Escenarios" },
  { href: "#boleteria", label: "Boletería" },
];

/**
 * Barra flotante contenida: no llega a los bordes de la pantalla, no se esconde
 * al bajar y no cambia con el scroll. Se queda siempre algo transparente, así
 * que el contenido se intuye por detrás; el blur es lo que sostiene la lectura
 * cuando pasa sobre las secciones en papel, no la opacidad.
 */
export default function Nav() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  // El panel de móvil se despliega desde detrás de la pastilla.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(".nav-panel", {
          autoAlpha: open ? 1 : 0,
          y: open ? 0 : -14,
          duration: 0.32,
          ease: "power2.out",
        });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".nav-panel", { autoAlpha: open ? 1 : 0, y: 0 });
      });
    },
    { scope: root, dependencies: [open] },
  );

  return (
    <header
      ref={root}
      className="fixed inset-x-0 top-3 z-50 md:top-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <div className="mx-auto w-[calc(100%-2rem)] max-w-7xl">
        <div className="nav-bar relative flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night/70 px-3 py-2.5 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3),0_4px_6px_-4px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:px-4 md:gap-8 md:px-6">
          {/* Marca + dónde y cuándo */}
          <div className="flex min-w-0 items-center">
            <a
              href="#top"
              className="flex shrink-0 items-center py-1.5"
              aria-label={EVENT.fullName}
            >
              {/* El lockup ya dice "Habi Next": no lleva texto al lado. Es
                  blanco sobre la pastilla morada, así que solo funciona sobre
                  superficies oscuras —de ahí que la barra nunca se aclare. */}
              <Image
                src="/img/habi-next-logo.svg"
                alt={EVENT.fullName}
                width={780}
                height={260}
                priority
                className="h-8 w-auto md:h-12"
              />
            </a>

          </div>

          {/* Secciones */}
          <nav className="hidden items-center gap-7 lg:flex xl:gap-9">
            {sections.map((s) => (
              <a
                key={s.href}
                href={s.href}
                className="whitespace-nowrap text-sm font-medium text-white/80 transition-colors hover:text-white"
              >
                {s.label}
              </a>
            ))}
          </nav>

          {/* Compra + menú de móvil */}
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <a
              href={LINKS.general}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-violet px-4 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-violet-press sm:px-6 sm:text-sm md:px-7 md:text-base"
            >
              Quiero mi entrada
            </a>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="nav-panel"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 lg:hidden"
            >
              <span className="relative block h-3 w-4">
                <span
                  className={`absolute left-0 block h-[2px] w-full rounded-full bg-current transition-transform duration-300 ${
                    open ? "top-[5px] rotate-45" : "top-0"
                  }`}
                />
                <span
                  className={`absolute left-0 top-[5px] block h-[2px] w-full rounded-full bg-current transition-opacity duration-200 ${
                    open ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute left-0 block h-[2px] w-full rounded-full bg-current transition-transform duration-300 ${
                    open ? "top-[5px] -rotate-45" : "top-[10px]"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Panel de móvil: otra pastilla, no una cortina a pantalla completa. */}
        <div
          id="nav-panel"
          className="nav-panel invisible mt-2 rounded-2xl border border-white/[0.14] bg-night/95 p-5 opacity-0 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)] backdrop-blur-xl lg:hidden"
        >
          <nav className="flex flex-col">
            {sections.map((s) => (
              <a
                key={s.href}
                href={s.href}
                onClick={() => setOpen(false)}
                className="border-b border-white/10 py-3.5 text-lg font-semibold tracking-tight text-white/85 transition-colors first:pt-1 hover:text-white"
              >
                {s.label}
              </a>
            ))}
          </nav>

          <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
            <span>{EVENT.dateLong}</span>
            <Dot className="h-1 w-1" />
            <span>
              {EVENT.city} · {EVENT.venue || EVENT.venueLabel}
            </span>
          </p>

          <a
            href={LINKS.sponsors}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center rounded-full border-2 border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Quiero ser patrocinador
          </a>
        </div>
      </div>
    </header>
  );
}
