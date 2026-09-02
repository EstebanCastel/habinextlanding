"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Asterisk from "@/components/Asterisk";
import { EVENT } from "@/config/event";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * El hero: la promesa del evento sobre una aérea de Bogotá. El lockup de la
 * marca no se repite aquí —vive en el menú, que acompaña todo el scroll—.
 *
 * La izquierda es negra —ahí va el lockup y el texto, y el blanco necesita
 * fondo limpio— y el video aparece entero hacia la derecha. Se apaga con
 * máscara y no con un degradado encima, para no ensuciar la imagen con otra
 * capa de gris.
 */
const V_1080 = "/video/hero-1080.mp4";
const V_720 = "/video/hero-720.mp4";

const VIDEO_MASK =
  "linear-gradient(to right, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.14) 20%, rgba(0,0,0,0.42) 44%, rgba(0,0,0,0.8) 68%, #000 88%)";

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  /**
   * La fuente del video se decide en cliente, no en el HTML.
   *
   * El video pesaba 13MB y era el 99,5% de la transferencia de la página; para
   * una audiencia que llega en datos móviles eso son decenas de segundos antes
   * de ver el hero moverse. Ahora: el `poster` pinta de inmediato, el `src` se
   * asigna después del primer pintado —así no compite con el LCP— y solo si la
   * pantalla y la conexión lo justifican. Quien navegue en 2G, con ahorro de
   * datos o con movimiento reducido se queda con el poster, que son 137KB.
   */
  const [fuente, setFuente] = useState<string | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const decidir = () => {
      const con = (
        navigator as Navigator & {
          connection?: { saveData?: boolean; effectiveType?: string };
        }
      ).connection;
      const aprieta = !!con?.saveData || /^(slow-)?2g$/.test(con?.effectiveType ?? "");
      if (reduce.matches || aprieta) return setFuente(null);
      setFuente(window.matchMedia("(min-width: 768px)").matches ? V_1080 : V_720);
    };

    decidir();
    reduce.addEventListener("change", decidir);
    return () => reduce.removeEventListener("change", decidir);
  }, []);

  /**
   * El corte del loop se esconde en una bajada de opacidad: el video se
   * atenúa hasta FLOOR sobre el final, salta, y vuelve a subir. No baja a
   * cero para que el hero no se apague en cada vuelta.
   */
  useEffect(() => {
    const el = video.current;
    if (!el || !fuente) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const FADE = 1.4;
    const FLOOR = 0.34;
    let raf = 0;

    const tick = () => {
      const { duration, currentTime } = el;
      if (duration && Number.isFinite(duration)) {
        const linear = Math.max(
          0,
          Math.min(currentTime / FADE, (duration - currentTime) / FADE, 1),
        );
        // Suavizado: la entrada y la salida no arrancan ni frenan en seco.
        const eased = linear * linear * (3 - 2 * linear);
        el.style.opacity = String(FLOOR + (1 - FLOOR) * eased);
      }
      raf = requestAnimationFrame(tick);
    };

    const sync = () => {
      cancelAnimationFrame(raf);
      if (reduce.matches) {
        el.pause();
        el.style.opacity = "1";
        return;
      }
      void el.play().catch(() => {});
      raf = requestAnimationFrame(tick);
    };

    sync();
    reduce.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(raf);
      reduce.removeEventListener("change", sync);
    };
  }, [fuente]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Entrada: el titular sube, el texto detrás y la fecha cierra abajo.
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.from(".hero-title", { opacity: 0, y: 26, duration: 1 })
          .from(".hero-copy", { opacity: 0, y: 22, duration: 0.8, stagger: 0.12 }, "-=0.65")
          .from(".hero-date", { opacity: 0, y: 14, duration: 0.7 }, "-=0.5")
          .from(".hero-cue", { opacity: 0, duration: 0.6 }, "-=0.4");

        // El video se queda atrás al hacer scroll y el contenido sube más rápido.
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
      {/* El video vive en la mitad derecha del hero. */}
      <div
        className="hero-bg absolute inset-0"
        style={{ maskImage: VIDEO_MASK, WebkitMaskImage: VIDEO_MASK }}
      >
        <video
          ref={video}
          className="h-full w-full object-cover"
          poster="/video/hero-poster.webp"
          src={fuente ?? undefined}
          preload="none"
          muted
          loop
          playsInline
          autoPlay
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
      {/* Duotono: la imagen pasa por morado en vez de quedarse en gris. */}
      <div className="absolute inset-0 bg-violet mix-blend-color opacity-[0.18]" />
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/30 to-night/12" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-night to-transparent" />
      {/* En móvil el texto ocupa todo el ancho, así que la máscara horizontal
          no alcanza a protegerlo: ahí el hero se oscurece entero. */}
      <div className="absolute inset-0 bg-night/45 md:hidden" />

      {/* La fecha va dentro del flujo, no en posición absoluta: así el primer
          pliegue siempre la contiene, sin depender del alto de la ventana. El
          `my-auto` del bloque de texto reparte el aire sobrante entre el menú
          y la fecha, que antes quedaba con 300px de vacío por encima. */}
      <div className="hero-stack relative z-10 flex min-h-[100svh] flex-col px-5 pt-28 pb-10 sm:px-8 md:px-14 md:pt-32 md:pb-14 lg:px-20 xl:px-28">
        <div className="mx-auto my-auto w-full max-w-[1400px]">
          {/* Sin lockup: la marca ya está en el menú fijo, así que el titular
              del hero es la promesa y no el nombre del evento. */}
          {/* El hero llevaba 353 caracteres entre titular y bajada, y la lista
              de "atraer clientes, crear contenido, organizar, asistente 24/7"
              es exactamente la de las cuatro etapas de "En un solo día": estaba
              contada dos veces. Aquí queda el reclamo y la oferta en una línea
              cada uno; el detalle vive en su sección. */}
          <h1 className="hero-title flex max-w-4xl items-start gap-4 text-4xl font-light leading-[1.04] tracking-tight text-white sm:gap-5 sm:text-5xl md:gap-6 md:text-6xl lg:text-[4.25rem]">
            <svg
              className="mt-[0.32em] h-7 w-7 shrink-0 text-violet md:h-12 md:w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span>
              El agente inmobiliario del futuro{" "}
              <span className="font-semibold">no trabajará solo.</span>
            </span>
          </h1>

          <p className="hero-copy mt-8 max-w-xl text-base font-light leading-relaxed text-white/80 md:mt-10 md:text-lg">
            Un día para aprender a usar Inteligencia Artificial
            <br />
            y multiplicar tu capacidad de vender y ganar más.
          </p>
        </div>

        {/* Fecha y ciudad cierran el hero. Es la pieza diagramada de marca
            (`Fecha.svg`), no un texto armado con EVENT: si cambia la fecha hay
            que reexportar el SVG, no editar la configuración. El texto real va
            en el alt.

            Se corta antes de la mitad desde md para no cruzarse con el cursor
            de scroll, que baja por el centro. */}
        <div className="hero-date mx-auto w-full max-w-[1400px] md:max-w-[1400px]">
          <div className="md:max-w-[calc(50%-2.5rem)]">
            <Image
              src="/img/habi-next-fecha.svg"
              alt={`${EVENT.dateLong} · ${EVENT.city}, ${EVENT.country}`}
              width={1032}
              height={163}
              priority
              className="h-auto w-full max-w-[19rem] sm:max-w-[24rem] md:max-w-[34rem]"
            />
          </div>
        </div>
      </div>

      {/* De aquí arranca el hilo. En móvil se corre a la derecha en vez de
          esconderse: la fecha ocupa la izquierda y el centro, y el arranque del
          hilo tiene que verse en el primer pliegue igual que en escritorio. */}
      <div className="hero-cue absolute bottom-0 right-5 z-20 flex flex-col items-center gap-3 sm:right-8 md:left-1/2 md:right-auto md:-translate-x-1/2">
        <Asterisk className="hero-cue-star h-5 w-5" />
        <span className="h-16 w-[2.5px] bg-gradient-to-b from-violet to-transparent md:h-24" />
      </div>
    </section>
  );
}
