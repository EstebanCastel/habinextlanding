"use client";

import { useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "@/lib/useIsomorphicLayoutEffect";
import { gsap, useGSAP } from "@/lib/gsap";

interface ThreadProps {
  /** Entrada: un número, o varios si el hilo llega bifurcado. */
  from: number | number[];
  /** Salida: un número, o varios si el hilo se bifurca. */
  to: number | number[];
  /** Marca el punto de entrada y el de salida con un nodo. */
  nodes?: boolean;
  /**
   * Altura (0-1) a la que el hilo hace el cruce horizontal. Sirve para que
   * pase por zonas vacías en vez de por encima de un párrafo.
   */
  bias?: number;
  /** Opacidad del trazo; el color lo hereda de la superficie (--thread). */
  opacity?: number;
  className?: string;
}

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
  opacity = 0.75,
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

  // Con una entrada y una salida el hilo es una sola curva. En cuanto hay
  // varias de un lado, todas pasan por un nudo a media sección: ahí es donde
  // el hilo se abre en las tres audiencias o se cierra en una sola decisión.
  const simple = entries.length === 1 && exits.length === 1;
  const hubX = px((mean(entries) + mean(exits)) / 2);
  const hubY = h * bias;

  const paths = simple
    ? [
        `M ${px(entries[0])} 0 C ${px(entries[0])} ${h * bias * 0.82}, ${px(exits[0])} ${h * (bias + (1 - bias) * 0.45)}, ${px(exits[0])} ${h}`,
      ]
    : [
        ...entries.map(
          (e) => `M ${px(e)} 0 C ${px(e)} ${hubY * 0.55}, ${hubX} ${hubY * 0.75}, ${hubX} ${hubY}`,
        ),
        ...exits.map(
          (e) =>
            `M ${hubX} ${hubY} C ${hubX} ${hubY + (h - hubY) * 0.25}, ${px(e)} ${hubY + (h - hubY) * 0.45}, ${px(e)} ${h}`,
        ),
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
    { scope: host, dependencies: [w, h, opacity, bias], revertOnUpdate: true },
  );

  return (
    <div
      ref={host}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {w > 0 && h > 0 ? (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              stroke="var(--thread)"
              strokeWidth={simple ? 2.5 : 1.9}
              strokeLinecap="round"
            />
          ))}
          {nodes ? (
            <>
              {entries.map((e) => (
                <circle
                  key={`in-${e}`}
                  className="thread-node"
                  cx={px(e)}
                  cy={0}
                  r={5}
                  fill="var(--thread)"
                  opacity={opacity}
                  style={{ transformOrigin: `${px(e)}px 0px` }}
                />
              ))}
              {exits.map((e) => (
                <circle
                  key={`out-${e}`}
                  className="thread-node"
                  cx={px(e)}
                  cy={h}
                  r={5}
                  fill="var(--thread)"
                  opacity={opacity}
                  style={{ transformOrigin: `${px(e)}px ${h}px` }}
                />
              ))}
            </>
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}
