"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  HORAS,
  INICIO,
  SALONES,
  SESIONES,
  enReloj,
  minutos,
  salonDe,
  sesionesDe,
  type SalonId,
  type Sesion,
} from "@/config/agenda";

/**
 * La agenda del día como una rejilla de tiempo real: la altura de cada sesión
 * es su duración, así que de un vistazo se ve que «El futuro de Habi» son
 * cinco charlas de quince minutos y la maratón de herramientas es una hora
 * entera. Tocar una abre el panel con lo que se lleva quien entre y con el
 * render del salón donde ocurre.
 *
 * En celular la rejilla no cabe en dos columnas, así que se muestra un salón a
 * la vez con el selector de arriba.
 */

/** Píxeles por minuto: a 2.6 una sesión de 15 minutos todavía se lee. */
const ESCALA = 2.6;
const alto = (s: Sesion) => (minutos(s.hasta) - minutos(s.desde)) * ESCALA;
const arriba = (s: Sesion) => (minutos(s.desde) - INICIO) * ESCALA;

export default function Agenda() {
  const [abierta, setAbierta] = useState<Sesion | null>(null);
  const [soloSalon, setSoloSalon] = useState<SalonId>("inspira");
  const raiz = useRef<HTMLDivElement>(null);

  // Las tarjetas entran en cascada por columna. El estado inicial lo pone GSAP,
  // así que sin JavaScript la agenda se ve completa igual.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(raiz.current?.querySelectorAll("[data-sesion]") ?? [], {
          opacity: 0,
          y: 18,
          duration: 0.5,
          ease: "power2.out",
          stagger: { each: 0.03, from: "start" },
          scrollTrigger: { trigger: raiz.current, start: "top 85%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: raiz }
  );

  return (
    <div ref={raiz}>
      {/* En pantallas grandes se ven los dos salones a la vez; el selector es
          para celular, donde dos columnas no caben. */}
      <div className="flex justify-end lg:hidden">
        <div className="flex rounded-full border border-white/12 bg-white/[0.04] p-1">
          {SALONES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSoloSalon(s.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                soloSalon === s.id ? "bg-violet text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {s.rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* Cabecera de salones, pegada arriba mientras se recorre la jornada. */}
      <div className="sticky top-0 z-20 -mx-1 mt-8 grid grid-cols-[3.5rem_1fr] gap-x-3 bg-night/90 px-1 py-3 backdrop-blur lg:grid-cols-[4rem_1fr_1fr] lg:gap-x-4">
        <span />
        {SALONES.map((s) => (
          <div
            key={s.id}
            className={`${soloSalon === s.id ? "block" : "hidden"} lg:block`}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet text-sm font-bold tabular-nums text-white">
                {s.numero}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold tracking-tight">{s.nombre}</p>
                <p className="truncate text-xs font-light text-white/50">{s.claim}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* La rejilla del día. */}
      <div className="relative mt-2 grid grid-cols-[3.5rem_1fr] gap-x-3 lg:grid-cols-[4rem_1fr_1fr] lg:gap-x-4">
        {/* Columna de horas */}
        <div className="relative" style={{ height: (HORAS.length - 1) * 60 * ESCALA + 40 }}>
          {HORAS.map((h, i) => (
            <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: i * 60 * ESCALA }}>
              <span className="text-xs font-semibold tabular-nums text-white/35">{h}</span>
            </div>
          ))}
        </div>

        {SALONES.map((salon) => (
          <div
            key={salon.id}
            className={`relative ${soloSalon === salon.id ? "block" : "hidden"} lg:block`}
            style={{ height: (HORAS.length - 1) * 60 * ESCALA + 40 }}
          >
            {/* Líneas de hora, para que la altura signifique algo. */}
            {HORAS.map((h, i) => (
              <div
                key={h}
                className="pointer-events-none absolute left-0 right-0 border-t border-white/[0.06]"
                style={{ top: i * 60 * ESCALA }}
              />
            ))}

            {sesionesDe(salon.id).map((s) => (
              <TarjetaSesion key={s.id} sesion={s} onAbrir={() => setAbierta(s)} />
            ))}
          </div>
        ))}
      </div>

      {abierta ? <Panel sesion={abierta} onCerrar={() => setAbierta(null)} /> : null}
    </div>
  );
}

function TarjetaSesion({ sesion: s, onAbrir }: { sesion: Sesion; onAbrir: () => void }) {
  const h = alto(s);
  const apretada = h < 56;
  const pausa = s.tipo === "pausa" || s.tipo === "bloqueo";

  const base = `absolute left-0 right-0 overflow-hidden rounded-2xl border px-3 text-left transition-all duration-300 md:px-4 ${apretada ? "flex items-center py-0" : "py-2"}`;
  const piel = pausa
    ? "border-dashed border-white/12 bg-white/[0.02] text-white/45"
    : "border-white/12 bg-gradient-to-br from-violet-shade/90 to-night hover:border-violet/60 hover:shadow-[0_18px_44px_-20px_rgba(128,46,246,0.9)]";

  // Una sesión de quince minutos mide 33 píxeles: ahí no caben dos renglones,
  // así que la hora y el título van en la misma línea. Es el único cambio de
  // maqueta; el resto de la tarjeta crece por tramos según lo que quepa.
  const contenido = apretada ? (
    <div className="flex items-baseline gap-2 overflow-hidden">
      <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${pausa ? "text-white/35" : "text-violet-soft"}`}>
        {enReloj(s.desde)}
      </span>
      <span className="truncate text-sm font-semibold tracking-tight">{s.titulo}</span>
    </div>
  ) : (
    <>
      <div className="flex items-baseline gap-2">
        <span className={`text-[11px] font-semibold tabular-nums ${pausa ? "text-white/35" : "text-violet-soft"}`}>
          {enReloj(s.desde)}
        </span>
        <span className="text-[11px] font-light text-white/30">· {enReloj(s.hasta)}</span>
      </div>
      <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight md:text-base">
        {s.titulo}
      </p>
      {h >= 74 && (s.ponente || s.porConfirmar) ? (
        <p className="mt-1 truncate text-xs font-light text-white/55">
          {s.ponente ?? "Ponente por confirmar"}
          {s.detallePonente ? <span className="text-white/35"> · {s.detallePonente}</span> : null}
        </p>
      ) : null}
      {h >= 128 && s.resumen && !pausa ? (
        <p className="mt-2 line-clamp-2 text-sm font-light leading-snug text-white/45">{s.resumen}</p>
      ) : null}
      {h >= 172 && !pausa ? (
        <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-soft">
          Ver la sesión
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14m0 0l-6-6m6 6l-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : null}
    </>
  );

  const estilo = { top: arriba(s), height: Math.max(h - 6, 36) };

  if (pausa) {
    return (
      <div data-sesion className={`${base} ${piel}`} style={estilo}>
        {contenido}
      </div>
    );
  }

  return (
    <button data-sesion type="button" onClick={onAbrir} className={`${base} ${piel} group`} style={estilo}>
      {contenido}
    </button>
  );
}

/**
 * El panel de una sesión: primero el lugar, después el contenido. Está en este
 * orden a propósito — la pregunta que la gente hace antes de moverse es «¿a
 * cuál salón voy?», y la foto la responde sin leer.
 */
function Panel({ sesion, onCerrar }: { sesion: Sesion; onCerrar: () => void }) {
  const salon = salonDe(sesion.salon);
  const caja = useRef<HTMLDivElement>(null);
  const fondo = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(fondo.current, { opacity: 0, duration: 0.25, ease: "power1.out" });
      gsap.from(caja.current, { opacity: 0, y: 40, scale: 0.98, duration: 0.45, ease: "power3.out" });
      gsap.from(caja.current?.querySelectorAll("[data-linea]") ?? [], {
        opacity: 0,
        x: -12,
        duration: 0.4,
        delay: 0.15,
        stagger: 0.06,
        ease: "power2.out",
      });
    });
    return () => mm.revert();
  });

  // Otras sesiones del mismo salón, para saltar sin cerrar el panel.
  const enElMismoSalon = SESIONES.filter(
    (s) => s.salon === sesion.salon && s.id !== sesion.id && !s.tipo
  ).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div ref={fondo} className="absolute inset-0 bg-night/80 backdrop-blur-sm" onClick={onCerrar} />
      <div
        ref={caja}
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] border border-white/12 bg-night sm:rounded-[28px]"
      >
        {/* El lugar */}
        <div className="relative h-52 w-full overflow-hidden sm:h-60">
          <Image src={salon.imagen} alt={`Montaje del ${salon.nombre}`} fill sizes="(max-width: 640px) 100vw, 42rem" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-night/10" />
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-night/70 text-white/70 backdrop-blur transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-5 right-5 flex items-end gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet text-sm font-bold tabular-nums">
              {salon.numero}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-soft">Escenario</p>
              <p className="truncate text-lg font-semibold tracking-tight">{salon.nombre}</p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 pt-5 md:px-8">
          <p data-linea className="text-sm font-light text-white/55">{salon.resumen}</p>
          <div data-linea className="mt-3 flex flex-wrap gap-2">
            {salon.montaje.map((m) => (
              <span key={m} className="rounded-full border border-white/12 px-3 py-1 text-xs font-light text-white/60">
                {m}
              </span>
            ))}
          </div>
          <p data-linea className="mt-2 text-xs font-light text-white/40">{salon.aforo}</p>

          <hr className="my-6 border-white/10" />

          <p data-linea className="text-sm font-semibold tabular-nums text-violet-soft">
            {enReloj(sesion.desde)} — {enReloj(sesion.hasta)}
          </p>
          <h3 data-linea className="mt-1.5 text-3xl font-bold leading-tight tracking-tighter">{sesion.titulo}</h3>
          <p data-linea className="mt-2 text-base font-light text-white/60">
            {sesion.ponente ?? "Ponente por confirmar"}
            {sesion.detallePonente ? <span className="text-white/40"> · {sesion.detallePonente}</span> : null}
          </p>

          {sesion.contenido?.length ? (
            <>
              <p data-linea className="mt-7 text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">
                Qué te llevas
              </p>
              <ul className="mt-3 flex flex-col gap-3">
                {sesion.contenido.map((c) => (
                  <li data-linea key={c} className="flex gap-3 text-[15px] font-light leading-snug text-white/75">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet" />
                    {c}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {sesion.necesitas ? (
            <p data-linea className="mt-6 rounded-2xl border border-violet/25 bg-violet/10 px-4 py-3 text-sm font-light text-white/75">
              <span className="font-semibold text-white">Trae contigo: </span>
              {sesion.necesitas}
            </p>
          ) : null}

          {enElMismoSalon.length ? (
            <>
              <p data-linea className="mt-8 text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">
                También en {salon.rotulo}
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                {enElMismoSalon.map((s) => (
                  <p data-linea key={s.id} className="text-sm font-light text-white/55">
                    <span className="tabular-nums text-white/40">{enReloj(s.desde)}</span> · {s.titulo}
                  </p>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
