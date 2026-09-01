"use client";

import { useRef } from "react";
import Asterisk from "@/components/Asterisk";
import CTAButton from "@/components/CTAButton";
import { EVENT, LINKS } from "@/config/event";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * El lockup de la marca: "Habi" sobre la pastilla con "Next" y los asteriscos,
 * atravesada por la regla morada que se sale de la pantalla, y "Bogotá" como
 * tercer renglón con la regla saliendo por el otro lado.
 *
 * Los tamaños se limitan por vh además de por vw: a 11vw el titular empujaba
 * el botón de compra por debajo del pliegue en un portátil de 900px.
 */
const LOCKUP = "clamp(2.75rem, min(9.5vw, 12vh), 8.5rem)";
const CITY = "clamp(1.9rem, min(6.5vw, 8vh), 5.5rem)";

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Entrada: el titular se descubre por renglones, las reglas se estiran
        // desde el borde y los asteriscos giran al aparecer.
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.from(".hero-eyebrow", { opacity: 0, y: 14, duration: 0.6 })
          .from(
            ".hero-line",
            { yPercent: 115, duration: 1, stagger: 0.09 },
            "-=0.3",
          )
          .from(
            ".hero-rule",
            { scaleX: 0, duration: 1.1, stagger: 0.12, ease: "power4.out" },
            "-=0.85",
          )
          .from(
            ".hero-star",
            { scale: 0, rotate: -160, duration: 0.7, stagger: 0.1, ease: "back.out(2.2)" },
            "-=0.8",
          )
          .from(".hero-copy", { opacity: 0, y: 22, duration: 0.8, stagger: 0.12 }, "-=0.55")
          .from(".hero-cue", { opacity: 0, duration: 0.6 }, "-=0.3");

        // La foto se queda atrás al hacer scroll y el titular sube más rápido.
        gsap.to(".hero-bg", {
          yPercent: 16,
          scale: 1.08,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to(".hero-stack", {
          yPercent: -12,
          opacity: 0.25,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });

        // El asterisco del cursor de scroll gira mientras la página avanza.
        gsap.to(".hero-cue-star", {
          rotate: 360,
          repeat: -1,
          duration: 9,
          ease: "none",
        });
      });
    },
    { scope: root },
  );

  return (
    <section
      id="top"
      ref={root}
      className="s-night relative min-h-[100svh] w-full overflow-hidden"
    >
      <div
        className="hero-bg absolute inset-0 bg-cover bg-bottom bg-no-repeat"
        style={{ backgroundImage: "url('/img/fondo.png')" }}
      />
      {/* Duotono: la foto pasa por morado en vez de quedarse en gris. */}
      <div className="absolute inset-0 bg-[#802ef6] mix-blend-color opacity-28" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050208] via-[#050208]/70 to-[#050208]/90" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050208] to-transparent" />

      <div className="hero-stack relative z-10 flex min-h-[100svh] flex-col justify-center px-5 pt-24 pb-20 sm:px-8 md:px-14 lg:px-20 xl:px-28">
        <div className="mx-auto w-full max-w-[1400px]">
          <p className="hero-eyebrow mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ba9dfa] sm:text-xs md:text-sm">
            <span>{EVENT.dateShort} · 2026</span>
            <span className="h-1 w-1 rounded-full bg-[#802ef6]" />
            <span>{EVENT.city}</span>
            <span className="hidden h-1 w-1 rounded-full bg-[#802ef6] sm:block" />
            <span className="hidden sm:block">{EVENT.durationLabel}</span>
          </p>

          <h1 className="font-bold leading-[0.82] tracking-tighter text-white">
            <span className="block overflow-hidden pb-[0.04em]">
              <span className="hero-line block" style={{ fontSize: LOCKUP }}>
                Habi
              </span>
            </span>

            <span className="relative mt-2 flex items-center md:-ml-14">
              <span className="hero-rule absolute right-full left-[-100vw] h-[3px] origin-right bg-[#802ef6]" />
              <span className="z-10 flex shrink-0 items-center gap-4 rounded-full border-[3px] border-[#802ef6] px-6 py-2.5 backdrop-blur-[2px] sm:gap-7 sm:px-9 md:px-12 md:py-4">
                <span className="block overflow-hidden pb-[0.04em]">
                  <span
                    className="hero-line block font-semibold leading-none tracking-tighter"
                    style={{ fontSize: LOCKUP }}
                  >
                    Next
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 sm:gap-4">
                  <Asterisk className="hero-star h-7 w-7 sm:h-11 sm:w-11 md:h-14 md:w-14" />
                  <Asterisk
                    className="hero-star h-7 w-7 sm:h-11 sm:w-11 md:h-14 md:w-14"
                    color="white"
                  />
                </span>
              </span>
            </span>

            <span className="relative mt-2 flex items-center gap-6">
              <span className="block overflow-hidden pb-[0.06em]">
                <span
                  className="hero-line block font-light uppercase leading-[0.95] tracking-tight text-[#ba9dfa]"
                  style={{ fontSize: CITY }}
                >
                  Bogotá
                </span>
              </span>
              <span className="relative hidden h-[3px] flex-1 sm:block">
                <span className="hero-rule absolute inset-y-0 left-0 right-[-100vw] origin-left bg-[#802ef6]" />
              </span>
            </span>
          </h1>

          <div className="hero-copy mt-8 flex max-w-3xl items-start gap-3 md:gap-5">
            <svg
              className="mt-1 h-5 w-5 shrink-0 text-[#802ef6] md:h-8 md:w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <p className="text-lg font-light leading-snug tracking-tight text-white sm:text-xl md:text-2xl">
              El agente inmobiliario del futuro{" "}
              <span className="font-semibold">no trabajará solo.</span> Aprende a usar Inteligencia
              Artificial para multiplicar tu capacidad de vender y ganar más.
            </p>
          </div>

          <p className="hero-copy mt-5 max-w-2xl text-sm font-light leading-relaxed text-white/60 md:text-base">
            Un evento de un día para agentes inmobiliarios que quieren atraer más clientes, crear
            contenido, hacer publicidad, organizar sus oportunidades y construir un asistente de IA
            que trabaje para ellos las 24 horas.
          </p>

          <div className="hero-copy mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <CTAButton href={LINKS.general}>Quiero mi entrada</CTAButton>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45 md:text-sm">
              Un día. Un nuevo sistema de trabajo.
              <br className="hidden sm:block" /> Un agente inmobiliario con IA.
            </p>
          </div>
        </div>
      </div>

      {/* De aquí arranca el hilo que recorre toda la página. */}
      <div className="hero-cue absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3">
        <Asterisk className="hero-cue-star h-5 w-5" />
        <span className="h-16 w-[2.5px] bg-gradient-to-b from-[#802ef6] to-transparent md:h-24" />
      </div>
    </section>
  );
}
