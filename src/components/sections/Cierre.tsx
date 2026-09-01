"use client";

import { useRef } from "react";
import Asterisk from "@/components/Asterisk";
import CTAButton from "@/components/CTAButton";
import Reveal from "@/components/Reveal";
import { EVENT, LINKS } from "@/config/event";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Cierre: todo lo que se abrió durante la página vuelve a un solo punto. El
 * asterisco crece y gira mientras se llega al final, y es el último elemento
 * del hilo.
 */
export default function Cierre() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(".cierre-star", {
          rotate: 180,
          scale: 1.15,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom",
            end: "bottom bottom",
            scrub: 0.8,
          },
        });

        gsap.to(".cierre-glow", {
          scale: 1.35,
          opacity: 0.6,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom",
            end: "bottom bottom",
            scrub: 1,
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="s-night relative w-full overflow-hidden">
      <div
        className="cierre-glow pointer-events-none absolute left-1/2 top-1/3 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[150px]"
        style={{ background: "#802ef6" }}
      />

      <div className="relative z-10 flex flex-col items-center px-5 pt-24 pb-28 text-center sm:px-8 md:px-14 md:pt-32 md:pb-36 lg:px-20">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center">
          {/* Final del hilo: el trazo entra y se convierte en el asterisco. */}
          <span className="h-20 w-[2.5px] bg-gradient-to-b from-transparent to-[#802ef6] md:h-28" />
          <Asterisk className="cierre-star mt-4 h-16 w-16 md:h-24 md:w-24" />

          <Reveal>
            <h2 className="mt-12 max-w-5xl text-4xl font-bold leading-[0.95] tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Tu próximo gran negocio puede{" "}
              <span className="text-[#802ef6]">empezar aquí.</span>
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mt-8 max-w-2xl text-lg font-light leading-relaxed text-white/65 md:text-xl">
              Un día puede cambiar la forma en la que trabajas los próximos años. Conviértete en un
              Agente Inmobiliario con IA.
            </p>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mt-12 text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Habi Next
            </p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#ba9dfa] md:text-base">
              {EVENT.city} · {EVENT.dateShort} de 2026
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
              <CTAButton href={LINKS.general}>Quiero mi entrada</CTAButton>
              <CTAButton href={LINKS.sponsors} variant="outline">
                Quiero ser patrocinador
              </CTAButton>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
