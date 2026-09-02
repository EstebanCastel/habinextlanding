"use client";

import { useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "@/lib/useIsomorphicLayoutEffect";
import { gsap, useGSAP } from "@/lib/gsap";

interface ThreadProps {
  /** Entrada: un número, o varios si el hilo llega bifurcado. */
  from: number | number[];
  /** Salida: un número, o varios si el hilo se bifurca. */
  to: number | number[];
  /** Marca con un nodo el punto por donde el hilo sale de la sección. */
  nodes?: boolean;
  /**
   * Fracción del alto de la sección hasta la que se dibuja (1 = hasta el
   * borde). Sirve para terminar el recorrido dentro de una sección en vez de
   * dejarlo colgando en el borde de abajo.
   */
  endAt?: number;
  /**
   * Altura (0-1) a la que el hilo hace el cruce horizontal. Sirve para que
   * pase por zonas vacías en vez de por encima de un párrafo.
   */
  bias?: number;
  /**
   * Opacidad del trazo; el color lo hereda de la superficie (--thread).
   *
   * Va deliberadamente baja: el hilo cruza zonas de texto en las secciones
   * más densas y, aunque va por detrás (z-15 contra z-20 del contenido), un
   * trazo fuerte se cuela entre las letras y estorba la lectura. La escala es
   * ~0.2 sobre papel y lavanda, ~0.32 sobre negro y tinta, ~0.35 sobre morado.
   */
  opacity?: number;
  className?: string;
}

/**
 * Radio de los nodos.
 *
 * Solo se dibuja el nodo de salida, y desplazado hacia dentro exactamente
 * este radio. Dos razones: sobre `y=h` el círculo cae encima del borde de la
 * sección y el `overflow-hidden` lo parte por la mitad; y si además se
 * dibujara el de entrada de la sección siguiente quedarían dos puntos pegados
 * en cada empalme —el de entrada, encima, tampoco se vería, porque la costura
 * de la sección ocupa sus primeros 96px—. Un nodo por unión, completo.
 */
const NODE_R = 5;

/**
 * El hilo conductor: un trazo morado que entra por donde salió el de la
 * sección anterior y sale por donde entrará el de la siguiente. Se dibuja con
 * el scroll, así que la página se lee como un solo recorrido y no como una
 * pila de bloques independientes.
 *
 * El path se calcula en píxeles reales (no en un viewBox escalado) para que el
 * grosor del trazo y el patrón de guiones no se deformen al cambiar el alto de
 * la sección.
 */
export default function Thread({
  from,
  to,
  nodes = true,
  bias = 0.5,
  endAt = 1,
  opacity = 0.25,
  className = "",
}: ThreadProps) {
  const host = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useIsomorphicLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((prev) =>
        Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1
          ? prev
          : { w: width, h: height },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const entries = Array.isArray(from) ? from : [from];
  const exits = Array.isArray(to) ? to : [to];
  const { w, h } = box;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const px = (pct: number) => (pct / 100) * w;

  // Alto realmente dibujado: `endAt` permite cerrar el recorrido dentro de la
  // sección. Toda la geometría se calcula contra este valor, no contra `h`.
  const hDraw = h * endAt;

  // Con una entrada y una salida el hilo es una sola curva. En cuanto hay
  // varias de un lado, todas pasan por un nudo: ahí es donde el hilo se abre
  // en las tres audiencias o se cierra en una sola decisión.
  const simple = entries.length === 1 && exits.length === 1;
  const hubX = px((mean(entries) + mean(exits)) / 2);
  const hubY = hDraw * bias;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const paths = simple
    ? [
        // Los dos tiradores van simétricos a los lados de `bias`, con una
        // separación fija del alto. Antes se calculaban como fracciones de
        // `bias`, así que con valores altos se juntaban al final y la curva
        // hacía un gancho seco en vez de un giro parejo.
        `M ${px(entries[0])} 0 C ${px(entries[0])} ${hDraw * clamp(bias - 0.26, 0.1, 0.9)}, ${px(exits[0])} ${hDraw * clamp(bias + 0.26, 0.1, 0.9)}, ${px(exits[0])} ${hDraw}`,
      ]
    : [
        ...entries.map(
          (e) =>
            `M ${px(e)} 0 C ${px(e)} ${hubY * 0.5}, ${px(e) + (hubX - px(e)) * 0.82} ${hubY * 0.86}, ${hubX} ${hubY}`,
        ),
        // El primer tirador de cada rama se abre ya hacia su destino: si sale
        // recto hacia abajo, las tres ramas se superponen sobre el nudo y el
        // reparto se ve como un pico y no como una bifurcación.
        ...exits.map((e) => {
          const dx = px(e) - hubX;
          const tramo = hDraw - hubY;
          return `M ${hubX} ${hubY} C ${hubX + dx * 0.18} ${hubY + tramo * 0.3}, ${px(e)} ${hubY + tramo * 0.62}, ${px(e)} ${hDraw}`;
        }),
      ];

  useGSAP(
    () => {
      if (!w || !h) return;
      const drawn = gsap.utils.toArray<SVGPathElement>("path", host.current);
      if (!drawn.length) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(drawn, { strokeDasharray: "none", strokeDashoffset: 0, opacity });
        gsap.set(".thread-node", { scale: 1, opacity });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        drawn.forEach((path) => {
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, opacity });
          gsap.to(path, {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
              trigger: host.current,
              start: "top 82%",
              end: "bottom 62%",
              scrub: 0.6,
            },
          });
        });

        gsap.from(".thread-node", {
          scale: 0,
          opacity: 0,
          duration: 0.5,
          stagger: 0.25,
          ease: "back.out(2)",
          scrollTrigger: { trigger: host.current, start: "top 70%", once: true },
        });
      });
    },
    { scope: host, dependencies: [w, h, opacity, bias, endAt], revertOnUpdate: true },
  );

  return (
    <div
      ref={host}
      aria-hidden="true"
      /* z-15: por encima de la costura (z-10), que si no le tapaba los
         primeros 96px y el hilo se veía cortado en cada sección, y por debajo
         del contenido (z-20), para que nunca pase por delante de un texto. */
      className={`pointer-events-none absolute inset-0 z-[15] overflow-hidden ${className}`}
    >
      {w > 0 && h > 0 ? (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              stroke="var(--thread)"
              strokeWidth={simple ? 2 : 1.6}
              strokeLinecap="round"
            />
          ))}
          {nodes
            ? exits.map((e) => (
                <circle
                  key={`out-${e}`}
                  className="thread-node"
                  cx={px(e)}
                  cy={hDraw - NODE_R}
                  r={NODE_R}
                  fill="var(--thread)"
                  opacity={opacity}
                  style={{ transformOrigin: `${px(e)}px ${hDraw - NODE_R}px` }}
                />
              ))
            : null}
        </svg>
      ) : null}
    </div>
  );
}
