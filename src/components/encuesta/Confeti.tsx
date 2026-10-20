"use client";

import { useEffect, useRef } from "react";

/**
 * El confeti del final, el mismo del quiz de DataCrédito.
 *
 * Cae una sola vez, se limpia solo cuando el último papelito sale de pantalla
 * y no arranca si la persona pidió menos movimiento. Es canvas y no cien
 * `div` animados porque son doscientas piezas y un celular de hace cuatro años
 * no las mueve con CSS sin trabarse.
 */

type Pieza = { x: number; y: number; vx: number; vy: number; r: number; vr: number; s: number; c: string; estrella: boolean };

const COLORES = ["#802ef6", "#ba9dfa", "#ece2fa", "#2ee6a6", "#ffffff"];

export default function Confeti({ piezas = 160 }: { piezas?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const lienzo = ref.current;
    if (!lienzo) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const cx = lienzo.getContext("2d");
    if (!cx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const medir = () => {
      lienzo.width = Math.floor(window.innerWidth * dpr);
      lienzo.height = Math.floor(window.innerHeight * dpr);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    medir();
    window.addEventListener("resize", medir);

    const partes: Pieza[] = Array.from({ length: piezas }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * window.innerHeight * 0.7,
      vx: (Math.random() - 0.5) * 130,
      vy: 90 + Math.random() * 170,
      r: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 9,
      s: 6 + Math.random() * 8,
      c: COLORES[Math.floor(Math.random() * COLORES.length)],
      estrella: Math.random() < 0.28,
    }));

    let cuadro = 0;
    let previo = 0;
    const dibujar = (t: number) => {
      const dt = Math.min(0.04, (t - (previo || t)) / 1000);
      previo = t;
      cx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = partes.length - 1; i >= 0; i--) {
        const p = partes[i];
        p.vy += 480 * dt;
        p.vx *= 0.986;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        if (p.y > window.innerHeight + 40) { partes.splice(i, 1); continue; }
        cx.save();
        cx.translate(p.x, p.y);
        cx.rotate(p.r);
        cx.fillStyle = p.c;
        if (p.estrella) {
          cx.fillRect(-p.s / 2, -p.s / 7, p.s, p.s / 3.5);
          cx.fillRect(-p.s / 7, -p.s / 2, p.s / 3.5, p.s);
        } else {
          cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        }
        cx.restore();
      }
      if (partes.length) cuadro = requestAnimationFrame(dibujar);
      else cx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
    cuadro = requestAnimationFrame(dibujar);

    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener("resize", medir);
    };
  }, [piezas]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[120] h-full w-full" />;
}
