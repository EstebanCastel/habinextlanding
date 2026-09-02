"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Dot from "@/components/Dot";

const escenarios = [
  {
    n: "01",
    name: "Escenario Inspira",
    body: "Conferencias de gran formato con speakers de alto impacto: casos de éxito reales, cómo los vivieron y qué herramientas usaron para escalar con IA.",
    img: "/img/escenario-inspira.webp",
    alt: "Auditorio de gran formato durante una conferencia de Habi Next Colombia",
  },
  {
    n: "02",
    name: "Escenario Taller",
    body: "Aprender haciendo. Múltiples sesiones con expertos que abordan temáticas clave para que sepas cómo aplicarlas en tu rol desde el día siguiente.",
    img: "/img/escenario-taller.webp",
    alt: "Sala llena frente a la pantalla de Habi Next Colombia: Brokers con IA",
  },
  {
    n: "03",
    name: "Espacio VIP",
    body: "Un espacio para conectar con los agentes inmobiliarios de más alto desempeño, aquellos que están logrando resultados increíbles.",
    img: "/img/espacio-vip.webp",
    alt: "Zona de stands de Habi Next Colombia con asistentes conversando",
  },
  {
    n: "04",
    name: "Zona Partners",
    body: "Los aliados que necesita cualquier agente inmobiliario o financiero para escalar dentro de la industria, reunidos en un solo lugar.",
    img: "/img/zona-partners.webp",
    alt: "Dos agentes revisando su trabajo en un computador",
  },
];

/**
 * Los cuatro espacios del evento, en un carrusel que maneja quien lee.
 *
 * Antes la sección se fijaba y el recorrido horizontal iba atado al scroll:
 * había que bajar 1.300px de página para cruzar las cuatro tarjetas y no se
 * podía volver a una sin devolver el scroll. Ahora es scroll nativo con snap,
 * flechas y teclado: se avanza cuando se quiere y se puede regresar.
 */
export default function Escenarios() {
  const viewport = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState({ inicio: true, fin: false, activa: 0 });

  const medir = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const paso = el.scrollWidth / escenarios.length;
    setEstado({
      inicio: el.scrollLeft <= 8,
      // El margen de 8px absorbe el redondeo del scroll en pantallas con dpr fraccional.
      fin: el.scrollLeft >= el.scrollWidth - el.clientWidth - 8,
      activa: Math.min(escenarios.length - 1, Math.round(el.scrollLeft / paso)),
    });
  }, []);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", medir);
      ro.disconnect();
    };
  }, [medir]);

  const irA = useCallback((indice: number) => {
    const el = viewport.current;
    if (!el) return;
    const tarjeta = el.querySelector<HTMLElement>("article");
    if (!tarjeta) return;
    const paso = tarjeta.offsetWidth + 20;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: indice * paso, behavior: suave ? "smooth" : "auto" });
  }, []);

  const mover = (dir: -1 | 1) => irA(Math.max(0, Math.min(escenarios.length - 1, estado.activa + dir)));

  return (
    <section id="escenarios" className="s-ink relative w-full overflow-hidden">
      <div className="relative z-20 py-24 md:py-32">
        <div className="px-5 sm:px-8 md:px-14 lg:px-20">
          <div className="mx-auto max-w-[1400px]">
            <p className="mb-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft md:text-xs">
              <Dot className="h-1.5 w-1.5" />
              Cuatro espacios, un mismo día
            </p>
            <h2 className="max-w-3xl text-3xl font-light leading-[0.96] tracking-tighter sm:text-4xl md:text-5xl lg:text-[3.75rem]">
              Recorre el evento y elige
              <br />
              tu <span className="font-bold text-violet">ruta de crecimiento</span>
            </h2>

            {/* Controles: el riel marca en qué tarjeta va y las flechas la mueven. */}
            <div className="mt-9 flex items-center gap-5">
              {/* El área táctil es de 44px aunque la marca visible mida 6:
                  como botón de 16x6 era imposible de acertar en un teléfono. */}
              <div className="-ml-3 flex">
                {escenarios.map((e, i) => (
                  <button
                    key={e.n}
                    type="button"
                    onClick={() => irA(i)}
                    aria-label={`Ver ${e.name}`}
                    aria-current={estado.activa === i}
                    className="group flex h-11 w-11 items-center justify-center"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-all duration-300 ${
                        estado.activa === i
                          ? "w-10 bg-violet"
                          : "w-4 bg-white/25 group-hover:bg-white/50"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="ml-auto flex gap-2.5">
                {([-1, 1] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => mover(dir)}
                    disabled={dir === -1 ? estado.inicio : estado.fin}
                    aria-label={dir === -1 ? "Espacio anterior" : "Espacio siguiente"}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/50 hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
                  >
                    <svg
                      className={`h-5 w-5 ${dir === -1 ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2.2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll nativo con snap: con el dedo, con la rueda en horizontal, con
            las flechas del teclado al enfocarlo y con los botones de arriba. */}
        <div
          ref={viewport}
          tabIndex={0}
          role="group"
          aria-label="Espacios del evento"
          className="mt-8 snap-x snap-mandatory scroll-pl-5 overflow-x-auto overflow-y-hidden pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:scroll-pl-8 md:mt-10 md:scroll-pl-14 lg:scroll-pl-20"
        >
          <div className="flex w-max gap-5 px-5 sm:px-8 md:px-14 lg:px-20">
            {escenarios.map((e) => (
              <article
                key={e.n}
                className="group relative w-[80vw] max-w-[460px] shrink-0 snap-start overflow-hidden rounded-[28px] ring-1 ring-white/15 sm:w-[58vw] lg:w-[34vw]"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={e.img}
                    alt={e.alt}
                    fill
                    /* `sizes` no es el ancho de la tarjeta: con object-cover la
                       foto se recorta de lado, así que el ancho realmente
                       pintado es el alto del contenedor por el aspecto de la
                       imagen —aquí 1,33 tarjetas—. Declararlo como el ancho de
                       la tarjeta hacía que el navegador pidiera la mitad de los
                       píxeles que necesita en pantalla Retina. */
                    sizes="(max-width: 1024px) 110vw, 45vw"
                    className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink from-25% via-ink/60 via-55% to-transparent" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-7 md:p-9">
                  <div className="flex items-baseline gap-3">
                    {/* Morado secundario, no el primario: medido sobre la foto
                        velada, #802ef6 daba 3,32:1 —al filo del mínimo de 3:1
                        para texto grande— y #ba9dfa da 8,5:1. */}
                    <span className="text-3xl font-bold tracking-tighter text-violet-soft md:text-4xl">
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
