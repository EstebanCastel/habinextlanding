"use client";

import Image from "next/image";
import { useRef } from "react";
import Asterisk from "@/components/Asterisk";
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
    img: "/img/brokera-portatil.webp",
    alt: "Agente inmobiliaria trabajando en su computador",
  },
  {
    n: "02",
    kicker: "Atrae",
    title: "Aprende a atraer clientes que sí convierten",
    body: "Deja de depender únicamente de referidos. Aprende a crear campañas digitales para encontrar personas interesadas en comprar o vender vivienda, y cómo utilizar IA para mejorar tus anuncios.",
    from: "De esperar clientes",
    to: "a generar tus propias oportunidades",
    img: "/img/brokers-bogota.webp",
    alt: "Dos agentes inmobiliarios conversando frente a la ciudad",
  },
  {
    n: "03",
    kicker: "Organiza",
    title: "Construye tu ecosistema digital de ventas",
    body: "Un buen agente no puede depender de su memoria, un Excel y cientos de conversaciones perdidas en WhatsApp. Aprende a construir un sistema para organizar tus clientes, oportunidades, propiedades y seguimientos.",
    from: "De tener contactos",
    to: "a tener un sistema comercial",
    img: "/img/formacion-sala.webp",
    alt: "Equipo comercial en una sesión de formación",
  },
  {
    n: "04",
    kicker: "Automatiza",
    title: "Crea un asistente de IA que trabaje por ti 24/7",
    body: "Imagina un asistente que responda preguntas, organice información y prepare seguimientos mientras tú estás mostrando propiedades o cerrando negocios. En Habi Next aprenderás cómo empezar a construirlo.",
    from: "De hacerlo todo tú",
    to: "a trabajar acompañado por IA",
    img: "/img/brokera-retrato.webp",
    alt: "Agente inmobiliaria de brazos cruzados en la oficina",
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
      <Thread from={78} to={22} bias={0.9} opacity={0.4} />

      <div className="relative z-20 px-5 pt-28 pb-24 sm:px-8 md:px-14 md:pt-40 md:pb-32 lg:px-20">
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <p className="mb-7 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#ba9dfa] md:text-xs">
              <Asterisk className="h-4 w-4" />
              En un solo día
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <h2 className="max-w-4xl text-4xl font-bold leading-[0.94] tracking-tighter sm:text-5xl md:text-6xl lg:text-[4.5rem]">
              Construye tu propio{" "}
              <span className="text-[#802ef6]">sistema de ventas con IA</span>
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-14 md:mt-24 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
            {/* Etapas */}
            <ol className="pillar-list relative flex flex-col">
              <div className="absolute left-0 top-0 hidden h-full w-[3px] bg-white/10 md:block">
                <div className="pillar-rail-fill h-full w-full origin-top scale-y-0 bg-[#802ef6]" />
              </div>

              {pillars.map((p) => (
                <li key={p.n} className="pillar md:pl-12">
                  <Reveal>
                    <article className="border-t border-white/12 py-10 md:py-14">
                      <div className="flex items-baseline gap-4">
                        <span className="text-4xl font-bold leading-none tracking-tighter text-[#802ef6] md:text-5xl">
                          {p.n}
                        </span>
                        <span className="text-lg font-semibold uppercase tracking-[0.24em] md:text-xl">
                          {p.kicker}
                        </span>
                      </div>

                      {/* En móvil la foto acompaña a cada etapa; en escritorio
                          vive en el panel fijo de la derecha. */}
                      <div className="relative mt-6 aspect-[16/10] w-full overflow-hidden rounded-2xl lg:hidden">
                        <Image
                          src={p.img}
                          alt={p.alt}
                          fill
                          sizes="92vw"
                          className="object-cover"
                        />
                      </div>

                      <h3 className="mt-6 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">
                        {p.title}
                      </h3>
                      <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-white/60 md:text-lg">
                        {p.body}
                      </p>

                      <p className="mt-7 inline-flex flex-wrap items-center gap-3 rounded-full border-2 border-[#802ef6]/60 px-5 py-3 text-sm font-medium text-white/70 md:text-base">
                        <span>{p.from}</span>
                        <svg
                          className="h-4 w-4 shrink-0 text-[#802ef6] md:h-5 md:w-5"
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
              <div className="sticky top-28 aspect-[4/5] w-full overflow-hidden rounded-[32px] border border-white/12">
                {pillars.map((p) => (
                  <Image
                    key={p.n}
                    src={p.img}
                    alt={p.alt}
                    fill
                    sizes="40vw"
                    className="panel-img object-cover"
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0618] via-transparent to-transparent" />

                <div className="absolute inset-x-0 bottom-0 overflow-hidden p-8">
                  {pillars.map((p) => (
                    <div key={p.n} className="panel-badge absolute inset-x-8 bottom-8">
                      <span className="text-6xl font-bold leading-none tracking-tighter text-white">
                        {p.n}
                      </span>
                      <span className="ml-4 text-xl font-semibold uppercase tracking-[0.24em] text-[#ba9dfa]">
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
