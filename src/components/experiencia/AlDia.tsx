"use client";

import { useEffect, useState } from "react";

/**
 * Mantiene la pantalla al día cuando la agenda cambia debajo.
 *
 * El día del evento la agenda se movió seis veces y la gente que dejó la app
 * abierta siguió viendo las horas viejas durante horas. No hay forma de que
 * una página abierta se entere sola: hay que preguntar.
 *
 * Pregunta cada minuto, y además cada vez que la persona vuelve a la pestaña,
 * que es cuando de verdad va a mirar. Si la agenda cambió:
 *
 * - Si está solo leyendo, recarga sola. Es lo que quiere quien mira una
 *   agenda: ver la hora buena, no enterarse de que hay una hora buena.
 * - Si está escribiendo o tiene una ficha abierta, **no** recarga: le muestra
 *   un aviso que puede tocar. Recargarle encima le borraría lo que está
 *   haciendo, y eso es peor que una hora desactualizada.
 */

const CADA = 60_000;

const ocupado = (): boolean => {
  if (typeof document === "undefined") return true;
  const f = document.activeElement;
  if (f && ["INPUT", "TEXTAREA", "SELECT"].includes(f.tagName)) return true;
  if (document.querySelector("dialog[open]")) return true;
  return false;
};

export default function AlDia({ version }: { version: string }) {
  const [cambio, setCambio] = useState(false);

  useEffect(() => {
    if (!version) return;
    let vivo = true;

    const mirar = async () => {
      if (!vivo || document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/experiencia/version", { cache: "no-store" });
        const d = (await r.json()) as { version?: string };
        if (!vivo || !d?.version || d.version === version) return;
        if (ocupado()) setCambio(true);
        else window.location.reload();
      } catch {
        // Sin señal no se hace nada: ya volverá.
      }
    };

    const id = setInterval(mirar, CADA);
    document.addEventListener("visibilitychange", mirar);
    return () => {
      vivo = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", mirar);
    };
  }, [version]);

  if (!cambio) return null;

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed inset-x-4 bottom-4 z-[70] mx-auto flex w-fit items-center gap-2.5 rounded-full bg-violet px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)]"
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      La agenda cambió · toca para ver la nueva
    </button>
  );
}
