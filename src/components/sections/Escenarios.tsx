"use client";

import Image from "next/image";
import { useRef } from "react";
import Asterisk from "@/components/Asterisk";
import Seam from "@/components/Seam";
import { gsap, useGSAP } from "@/lib/gsap";

const escenarios = [
  {
    n: "01",
    name: "Escenario Inspira",
    body: "Conferencias de gran formato con speakers de alto impacto: casos de éxito reales, cómo los vivieron y qué herramientas usaron para escalar con IA.",
    img: "/img/formacion-sala-banda.webp",
    alt: "Sesión de formación con varios asistentes",
  },
  {
    n: "02",
    name: "Escenario Taller",
    body: "Aprender haciendo. Múltiples sesiones con expertos que abordan temáticas clave para que sepas cómo aplicarlas en tu rol desde el día siguiente.",
    img: "/img/visita-apartamento.webp",
    alt: "Agente inmobiliaria mostrando un apartamento a una pareja",
  },
  {
    n: "03",
    name: "Espacio VIP",
    body: "Un espacio para conectar con los agentes inmobiliarios de más alto desempeño, aquellos que están logrando resultados increíbles.",
    img: "/img/llavero-habi.webp",
    alt: "Mano sosteniendo un llavero de Habi",
  },
  {
    n: "04",
    name: "Zona Partners",
    body: "Los aliados que necesita cualquier agente inmobiliario o financiero para escalar dentro de la industria, reunidos en un solo lugar.",
    img: "/img/cierre-apreton.webp",
    alt: "Apretón de manos cerrando un negocio",
  },
];

/**
 * El único bloque que no se lee hacia abajo. La sección se fija y el contenido
 * se desplaza en horizontal, así que recorrer los cuatro espacios del evento se
 * siente como caminar por él en vez de bajar una lista más.
 *
 * En pantallas táctiles el mismo carrusel se recorre con el dedo, sin fijar la
 * página.
 */
export default function Escenarios() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const track = root.current?.querySelector<HTMLElement>(".esc-track");
      const viewport = root.current?.querySelector<HTMLElement>(".esc-viewport");
      if (!track || !viewport) return;

      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });

        // La barra de arriba es el hilo, recorrido en horizontal.
        const rail = gsap.to(".esc-rail-fill", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        return () => {
          tween.kill();
          rail.kill();
        };
      });
    },
    { scope: root },
  );

  return (
    <section id="escenarios" ref={root} className="s-ink relative w-full overflow-hidden">
      <Seam variant="arch" color="var(--night)" />

      <div className="esc-viewport relative flex min-h-[100svh] flex-col justify-center overflow-hidden pt-24 pb-12 lg:h-[100svh] lg:pt-28">
        <div className="px-5 sm:px-8 md:px-14 lg:px-20">
          <div className="mx-auto max-w-[1400px]">
            <p className="mb-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#ba9dfa] md:text-xs">
              <Asterisk className="h-4 w-4" />
              Cuatro espacios, un mismo día
            </p>
            <h2 className="max-w-3xl text-3xl font-light leading-[0.96] tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
              Recorre el evento y elige tu{" "}
              <span className="font-bold text-[#802ef6]">ruta de crecimiento</span>
            </h2>

            <div className="mt-6 hidden h-[3px] w-full max-w-md bg-white/12 lg:block">
              <div className="esc-rail-fill h-full w-full origin-left scale-x-0 bg-[#802ef6]" />
            </div>
          </div>
        </div>

        {/* En escritorio el track se mueve con GSAP; en móvil se desliza con
            el dedo y hace snap en cada tarjeta. */}
        <div className="mt-8 overflow-x-auto overflow-y-hidden pb-4 [scrollbar-width:none] md:mt-10 lg:overflow-visible lg:pb-0">
          <div className="esc-track flex w-max gap-5 px-5 sm:px-8 md:gap-8 md:px-14 lg:px-20">
            {escenarios.map((e) => (
              <article
                key={e.n}
                className="group relative h-[58vh] w-[78vw] shrink-0 snap-center overflow-hidden rounded-[28px] sm:w-[62vw] md:w-[46vw] lg:h-[52vh] lg:w-[36vw] xl:w-[31vw]"
              >
                <Image
                  src={e.img}
                  alt={e.alt}
                  fill
                  sizes="(max-width: 1024px) 78vw, 36vw"
                  className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0618] via-[#0d0618]/45 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-7 md:p-9">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold tracking-tighter text-[#802ef6] md:text-4xl">
                      {e.n}
                    </span>
                    <h3 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
                      {e.name}
                    </h3>
                  </div>
                  <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-white/70 md:text-base">
                    {e.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
