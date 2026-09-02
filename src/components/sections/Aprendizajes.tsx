"use client";

import Image from "next/image";
import { useRef } from "react";
import Dot from "@/components/Dot";
import Reveal from "@/components/Reveal";
import Seam from "@/components/Seam";
import Thread from "@/components/Thread";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

const pillars = [
  {
    n: "01",
    kicker: "Crea",
    title: "Crea contenido con Inteligencia Artificial",
    body: "Aprende a utilizar IA para construir tu marca personal y producir contenido que atraiga clientes. Crearás ideas, textos, guiones, imágenes y piezas para redes sociales en una fracción del tiempo que te toma hoy.",
    from: "De pensar qué publicar",
    to: "a tener una máquina de contenido",
    img: "/img/aprende-crea.webp",
    alt: "Broker frente a su portátil en las oficinas de Habi",
  },
  {
    n: "02",
    kicker: "Atrae",
    title: "Aprende a atraer clientes que sí convierten",
    body: "Deja de depender únicamente de referidos. Aprende a crear campañas digitales para encontrar personas interesadas en comprar o vender vivienda, y cómo utilizar IA para mejorar tus anuncios.",
    from: "De esperar clientes",
    to: "a generar tus propias oportunidades",
    img: "/img/aprende-atrae.webp",
    alt: "Charla en tarima ante los brokers en un evento de Habi",
  },
  {
    n: "03",
    kicker: "Organiza",
    title: "Construye tu ecosistema digital de ventas",
    body: "Un buen agente no puede depender de su memoria, un Excel y cientos de conversaciones perdidas en WhatsApp. Aprende a construir un sistema para organizar tus clientes, oportunidades, propiedades y seguimientos.",
    from: "De tener contactos",
    to: "a tener un sistema comercial",
    img: "/img/aprende-organiza.webp",
    alt: "Broker en el salón del evento antes de que llegue el público",
  },
  {
    n: "04",
    kicker: "Automatiza",
    title: "Crea un asistente de IA que trabaje por ti 24/7",
    body: "Imagina un asistente que responda preguntas, organice información y prepare seguimientos mientras tú estás mostrando propiedades o cerrando negocios. En Habi Next aprenderás cómo empezar a construirlo.",
    from: "De hacerlo todo tú",
    to: "a trabajar acompañado por IA",
    img: "/img/aprende-automatiza.webp",
    alt: "Presentación con micrófono en la tarima del evento de brokers",
  },
];

/**
 * Las cuatro etapas del día. El panel de la derecha se queda quieto mientras
 * el texto avanza y la foto cambia con la etapa activa: es el mismo recorrido
 * del evento, visto de un lado y del otro al mismo tiempo.
 */
export default function Aprendizajes() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const images = gsap.utils.toArray<HTMLElement>(".panel-img", root.current);
      const badges = gsap.utils.toArray<HTMLElement>(".panel-badge", root.current);
      const steps = gsap.utils.toArray<HTMLElement>(".pillar", root.current);
      if (!images.length || !steps.length) return;

      gsap.set(images.slice(1), { autoAlpha: 0 });
      gsap.set(badges.slice(1), { autoAlpha: 0, yPercent: 40 });

      const show = (index: number) => {
        images.forEach((img, i) =>
          gsap.to(img, { autoAlpha: i === index ? 1 : 0, duration: 0.55, ease: "power2.out" }),
        );
        gsap.fromTo(
          images[index],
          { scale: 1.09 },
          { scale: 1, duration: 1.3, ease: "power2.out", overwrite: "auto" },
        );
        badges.forEach((badge, i) =>
          gsap.to(badge, {
            autoAlpha: i === index ? 1 : 0,
            yPercent: i === index ? 0 : 40,
            duration: 0.45,
            ease: "power2.out",
          }),
        );
      };

      const triggers = steps.map((step, i) =>
        ScrollTrigger.create({
          trigger: step,
          start: "top 62%",
          end: "bottom 62%",
          onToggle: (self) => {
            if (self.isActive) show(i);
          },
        }),
      );

      // Riel de progreso a la izquierda de las etapas.
      const rail = gsap.to(".pillar-rail-fill", {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".pillar-list",
          start: "top 70%",
          end: "bottom 70%",
          scrub: 0.5,
        },
      });

      return () => {
        triggers.forEach((t) => t.kill());
        rail.kill();
      };
    },
    { scope: root },
  );

  return (
    <section
      id="aprendizajes"
      ref={root}
      className="s-ink relative w-full overflow-x-clip"
    >
      <Seam variant="diagonal" color="var(--paper)" />
      <Thread from={78} to={22} bias={0.6} opacity={0.32} />

      <div className="relative z-20 px-5 py-24 sm:px-8 md:px-14 md:py-32 lg:px-20">
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <p className="mb-7 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft md:text-xs">
              <Dot className="h-1.5 w-1.5" />
              En un solo día
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <h2 className="max-w-4xl text-3xl font-bold leading-[1.0] tracking-tighter sm:text-4xl md:text-5xl lg:text-[3.75rem]">
              Construye tu propio
              <br />
              <span className="text-violet">sistema de ventas con IA</span>
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-14 md:mt-24 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
            {/* Etapas */}
            {/* El `pb` de escritorio no es decorativo: sin él, la última etapa
                termina antes que el panel fijado de al lado, la columna deja de
                sostenerlo y el panel se sube hasta meterse debajo del menú
                flotante, que es opaco y le tapa la cara al retrato. Medido, el
                panel necesita 129px más de columna para seguir anclado hasta que
                la etapa 04 sale de cuadro; 144 (pb-36) deja margen. */}
            <ol className="pillar-list relative flex flex-col lg:pb-36">
              <div className="absolute left-0 top-0 hidden h-full w-[3px] bg-white/10 md:block">
                <div className="pillar-rail-fill h-full w-full origin-top scale-y-0 bg-violet" />
              </div>

              {pillars.map((p) => (
                <li key={p.n} className="pillar md:pl-12">
                  <Reveal>
                    <article className="border-t border-white/12 py-10 md:py-14">
                      <div className="flex items-baseline gap-4">
                        {/* Mismo caso que las tarjetas de Escenarios: #802ef6
                            sobre la tinta da 3,14:1 y #ba9dfa da 7,8:1. */}
                        <span className="text-4xl font-bold leading-none tracking-tighter text-violet-soft md:text-5xl">
                          {p.n}
                        </span>
                        <span className="text-lg font-semibold uppercase tracking-[0.24em] md:text-xl">
                          {p.kicker}
                        </span>
                      </div>

                      {/* En móvil la foto acompaña a cada etapa; en escritorio
                          vive en el panel fijo de la derecha. */}
                      {/* Vertical: las fotos son 3:4 y en un 16/10 se perdía
                          la figura. El ancho sigue siendo el eje que manda con
                          object-cover, así que `sizes` no cambia. */}
                      <div className="relative mt-6 aspect-[4/5] w-full overflow-hidden rounded-2xl lg:hidden">
                        <Image
                          src={p.img}
                          alt={p.alt}
                          fill
                          sizes="92vw"
                          className="object-cover object-[50%_10%]"
                        />
                      </div>

                      <h3 className="mt-6 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">
                        {p.title}
                      </h3>
                      <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-white/60 md:text-lg">
                        {p.body}
                      </p>

                      <p className="mt-7 inline-flex flex-wrap items-center gap-3 rounded-full border-2 border-violet/60 px-5 py-3 text-sm font-medium text-white/70 md:text-base">
                        <span>{p.from}</span>
                        <svg
                          className="h-4 w-4 shrink-0 text-violet md:h-5 md:w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={3}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                        <span className="font-semibold text-white">{p.to}</span>
                      </p>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ol>

            {/* Panel fijo */}
            <div className="hidden lg:block">
              {/* El alto se mide contra la ventana, no contra el ancho. Con
                  `aspect-[4/5]` el panel daba 689px y, pegado a 112px del
                  borde, se salía 74px por debajo del pliegue en un portátil:
                  en las etapas 1 a 3 la foto quedaba recortada y la etiqueta
                  del número no se veía nunca. Ahora siempre entra completo. */}
              <div className="sticky top-28 h-[calc(100svh-9.5rem)] max-h-[680px] min-h-[360px] w-full overflow-hidden rounded-[32px] border border-white/12">
                {pillars.map((p) => (
                  <Image
                    key={p.n}
                    src={p.img}
                    alt={p.alt}
                    fill
                    sizes="40vw"
                    /* Los recortes son 0,66 de proporción y el panel da 0,88,
                       así que object-cover se come una cuarta parte del alto.
                       Centrado cortaba las cabezas por arriba: con el foco al
                       10% el recorte se lo lleva casi todo de los pies. */
                    className="panel-img object-cover object-[50%_10%]"
                  />
                ))}
                {/* Solo existe para que la etiqueta del número se lea sobre la
                    foto, así que se queda en el tercio de abajo: antes llegaba
                    hasta la mitad y apagaba la figura.

                    Va a `ink/0` y no a `transparent`: Tailwind 4 interpola los
                    degradados en oklab y `transparent` es negro transparente,
                    así que el camino desde este negro violáceo pasaba por
                    morado y teñía media foto de lila. Con el mismo color a
                    alfa 0 solo se desvanece la opacidad. */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink to-ink/0 to-[38%]" />

                <div className="absolute inset-x-0 bottom-0 overflow-hidden p-8">
                  {pillars.map((p) => (
                    <div key={p.n} className="panel-badge absolute inset-x-8 bottom-8">
                      <span className="text-6xl font-bold leading-none tracking-tighter text-white">
                        {p.n}
                      </span>
                      <span className="ml-4 text-xl font-semibold uppercase tracking-[0.24em] text-violet-soft">
                        {p.kicker}
                      </span>
                    </div>
                  ))}
                  {/* Reserva el alto del bloque de etiquetas, que va absoluto. */}
                  <div className="invisible">
                    <span className="text-6xl font-bold leading-none">00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
