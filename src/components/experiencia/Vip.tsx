"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { TICKETS } from "@/config/event";
import { clasesBoton, pedir } from "./util";

/**
 * La invitación a pasarse a VIP, para quien tiene General.
 *
 * Se muestra junto a la credencial y no en la landing porque acá la persona
 * ya está mirando su propia entrada: es el momento en que la diferencia entre
 * las dos deja de ser una tabla de precios y pasa a ser «mi tarjeta podría
 * decir VIP».
 *
 * Los beneficios no se escriben aquí: salen de la misma lista que se muestra
 * en la boletería, para que no haya dos versiones de lo que incluye el VIP.
 */

const vip = TICKETS.find((t) => t.id === "vip")!;

export default function Vip({
  diferencia,
  precio,
  etiqueta,
  yaPagada,
}: {
  /** Cuánto más cuesta el VIP hoy, ya formateado. */
  diferencia: string;
  /** Lo que cuesta la entrada VIP en la etapa vigente. */
  precio: string;
  etiqueta: string;
  /** Si ya pagó General, el cambio lo hace una persona y no el botón. */
  yaPagada: boolean;
}) {
  const [estado, setEstado] = useState<"quieto" | "yendo" | "listo">("quieto");
  const [nota, setNota] = useState("");
  const caja = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(caja.current?.querySelectorAll("[data-beneficio]") ?? [], {
          opacity: 0,
          x: -10,
          duration: 0.45,
          stagger: 0.05,
          ease: "power2.out",
          scrollTrigger: { trigger: caja.current, start: "top 88%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: caja }
  );

  const mejorar = async () => {
    setEstado("yendo");
    setNota("");
    const r = await pedir<{ ok: boolean; pagar?: string; error?: string }>("/api/experiencia/vip", {
      method: "POST",
    }).catch((e: Error) => ({ ok: false, error: e.message }) as const);
    if ("ok" in r && r.ok && "pagar" in r && r.pagar) {
      setEstado("listo");
      window.location.href = r.pagar;
      return;
    }
    setEstado("quieto");
    setNota(("error" in r && r.error) || "No pudimos hacer el cambio. Escríbenos por WhatsApp.");
  };

  return (
    <div
      ref={caja}
      className="overflow-hidden rounded-[28px] border border-violet/30 bg-gradient-to-br from-violet-shade via-night to-night p-6 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">Tu entrada es General</p>
          <h3 className="mt-2 text-3xl font-bold tracking-tighter md:text-4xl">
            Que tu carnet diga <span className="text-violet-soft">VIP</span>.
          </h3>
          <p className="mt-2 max-w-md text-base font-light text-white/60">{vip.claim}</p>
        </div>
        <div className="rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-4 text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">{etiqueta}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{precio}</p>
          <p className="mt-0.5 text-xs font-light text-white/50">{diferencia} más que la General</p>
        </div>
      </div>

      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {vip.includes.map((b) => (
          <li data-beneficio key={b} className="flex items-start gap-2.5 text-[15px] font-light text-white/80">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-violet-soft" fill="none" stroke="currentColor" strokeWidth="2.6">
              <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {b}
          </li>
        ))}
      </ul>

      {vip.footnote ? <p className="mt-4 text-xs font-light text-white/40">{vip.footnote}</p> : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {yaPagada ? (
          <a
            href={`https://wa.me/573009110459?text=${encodeURIComponent("Hola, ya pagué mi entrada General y quiero pasarme a VIP")}`}
            target="_blank"
            rel="noreferrer"
            className={clasesBoton.solido}
          >
            Escríbenos para cambiarla
          </a>
        ) : (
          <button type="button" onClick={mejorar} disabled={estado !== "quieto"} className={clasesBoton.solido}>
            {estado === "yendo" ? "Cambiando tu entrada…" : `Pasarme a VIP por ${diferencia} más`}
          </button>
        )}
        <Link href="/#boleteria" className={clasesBoton.suave}>
          Ver la comparación completa
        </Link>
      </div>

      {yaPagada ? (
        <p className="mt-3 text-sm font-light text-white/45">
          Como tu General ya está pagada, te cobramos solo la diferencia a mano.
        </p>
      ) : null}
      {nota ? <p className="mt-3 text-sm font-light text-violet-soft">{nota}</p> : null}
    </div>
  );
}
