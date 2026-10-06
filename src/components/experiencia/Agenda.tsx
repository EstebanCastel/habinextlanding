"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Asterisk from "@/components/Asterisk";
import { gsap, useGSAP } from "@/lib/gsap";
import { SALONES, esSesion, numeroDe, salonDe, sesionesDe, type Salon, type SalonId, type Sesion } from "@/config/agenda";

/**
 * El programa del día, como un cartel y no como una tabla.
 *
 * Son dos salones, uno al lado del otro, y en cada uno las sesiones cuelgan
 * de un hilo —el mismo hilo que recorre la landing— en el orden en que
 * pasan. No hay horas a propósito: el equipo las está cerrando y es mejor
 * un programa sin reloj que un reloj que después se desdice. Lo que sí se
 * sabe es qué viene primero y qué viene después, y eso es lo que se lee.
 *
 * En celular los dos salones no caben a la vez y se elige uno; en pantalla
 * ancha se ven los dos, que es como se decide a cuál entrar.
 */

export default function Agenda() {
  const [abierta, setAbierta] = useState<Sesion | null>(null);
  const [salonMovil, setSalonMovil] = useState<SalonId>("inspira");

  return (
    <div>
      {/* Elegir salón: solo en celular. */}
      <div className="sticky top-0 z-20 -mx-5 bg-night/92 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8 md:hidden">
        <div className="grid grid-cols-2 gap-1 rounded-full border border-white/12 bg-white/[0.04] p-1">
          {SALONES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSalonMovil(s.id)}
              aria-pressed={salonMovil === s.id}
              className={`flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold tracking-tight transition-colors ${
                salonMovil === s.id ? "bg-violet text-white" : "text-white/60"
              }`}
            >
              <span className="font-mono text-[11px] tabular-nums opacity-70">{s.numero}</span>
              {s.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-12 md:grid-cols-2 md:gap-8 lg:gap-14">
        {SALONES.map((salon) => (
          <Columna
            key={salon.id}
            salon={salon}
            oculta={salonMovil !== salon.id}
            onAbrir={setAbierta}
          />
        ))}
      </div>

      <p className="mt-10 max-w-xl text-sm font-light leading-relaxed text-white/45">
        Las horas de cada sesión se publican apenas el equipo las confirme. El orden ya es el del programa. Toca
        una sesión para ver el salón por dentro y lo que te llevas de ella.
      </p>

      {abierta ? <Panel sesion={abierta} onCerrar={() => setAbierta(null)} /> : null}
    </div>
  );
}

/**
 * Un salón: la foto del escenario con su número de tótem, y debajo el hilo
 * con las sesiones. El número grande es el que está señalizado en piso; se
 * repite acá para que la gente lo reconozca al llegar.
 */
function Columna({ salon, oculta, onAbrir }: { salon: Salon; oculta: boolean; onAbrir: (s: Sesion) => void }) {
  const sesiones = sesionesDe(salon.id);
  const total = sesiones.filter(esSesion).length;

  return (
    <section className={`${oculta ? "hidden md:block" : ""}`} aria-labelledby={`salon-${salon.id}`}>
      <div className="relative overflow-hidden rounded-[28px] border border-white/12">
        <div className="relative aspect-[16/9] w-full sm:aspect-[2/1]">
          <Image
            src={salon.imagen}
            alt={`Render del ${salon.nombre}`}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/55 to-night/5" />
          <Asterisk
            color="var(--violet)"
            className="agenda-giro pointer-events-none absolute -right-10 -top-10 h-40 w-40 opacity-30 mix-blend-screen sm:h-48 sm:w-48"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 sm:p-6">
          <span className="text-6xl font-bold leading-none tracking-tighter text-white sm:text-7xl">{salon.numero}</span>
          <div className="min-w-0 pb-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-violet-soft">Salón</p>
            <h2 id={`salon-${salon.id}`} className="truncate text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              {salon.rotulo}
            </h2>
            <p className="truncate text-sm font-light text-white/55">{salon.claim}</p>
          </div>
        </div>
      </div>

      <p className="mt-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.26em] text-white/40">
        <span className="h-px w-6 bg-violet" />
        {total} sesiones · en orden
      </p>

      {/* El hilo: una línea vertical y, colgando de ella, cada sesión. */}
      <ol className="relative mt-5 flex flex-col">
        <span aria-hidden="true" className="absolute bottom-6 left-[11px] top-3 w-px bg-gradient-to-b from-violet via-violet/50 to-transparent" />
        {sesiones.map((s) => (
          <Nodo key={s.id} sesion={s} onAbrir={() => onAbrir(s)} />
        ))}
      </ol>
    </section>
  );
}

/** Una sesión colgada del hilo. Las pausas son nudos: más chicos y sin abrir. */
function Nodo({ sesion: s, onAbrir }: { sesion: Sesion; onAbrir: () => void }) {
  if (s.tipo) {
    return (
      <li className="relative grid grid-cols-[1.5rem_1fr] gap-x-4 py-4">
        <span aria-hidden="true" className="relative z-10 mt-[3px] grid h-[23px] w-[23px] place-items-center">
          <span className={`h-2.5 w-2.5 rounded-full border ${s.tipo === "pausa" ? "border-white/35 bg-night" : "border-dashed border-white/30 bg-night"}`} />
        </span>
        <div className="flex items-center gap-3 self-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/40">{s.titulo}</span>
          <span className="h-px flex-1 border-t border-dashed border-white/12" />
          {s.resumen ? <span className="hidden text-xs font-light text-white/35 sm:inline">{s.resumen}</span> : null}
        </div>
      </li>
    );
  }

  const n = numeroDe(s);
  return (
    <li className="relative grid grid-cols-[1.5rem_1fr] gap-x-4 py-5">
      <span aria-hidden="true" className="relative z-10 mt-[7px] grid h-[23px] w-[23px] place-items-center">
        <span className="h-[23px] w-[23px] rounded-full border border-violet/60 bg-night shadow-[0_0_0_4px_rgba(128,46,246,0.14)]">
          <span className="block h-full w-full scale-[0.42] rounded-full bg-violet" />
        </span>
      </span>
      <button
        type="button"
        onClick={onAbrir}
        className="group -my-2 -ml-2 flex flex-col items-start gap-1.5 rounded-2xl py-2 pl-2 pr-3 text-left transition-colors hover:bg-white/[0.035] focus-visible:bg-white/[0.035] focus-visible:outline-none"
      >
        <span className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] font-medium tabular-nums tracking-[0.18em] text-violet-soft">{String(n).padStart(2, "0")}</span>
          {s.porConfirmar ? (
            <span className="rounded-full border border-dashed border-white/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
              Por confirmar
            </span>
          ) : null}
        </span>
        <span className="text-xl font-semibold leading-[1.15] tracking-tight transition-colors group-hover:text-violet-soft sm:text-[1.45rem]">
          {s.titulo}
        </span>

        {s.partes ? (
          <span className="mt-1.5 flex flex-col gap-1 border-l border-violet/40 pl-3.5">
            {s.partes.map((p) => (
              <span key={p.titulo} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium text-white/85">{p.titulo}</span>
                <span className="font-light text-white/50">{p.ponente}</span>
              </span>
            ))}
          </span>
        ) : s.ponentes ? (
          <span className="mt-1 flex flex-wrap gap-1.5">
            {s.ponentes.map((p) => (
              <span key={p} className="rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1 text-xs font-light text-white/70">
                {p}
              </span>
            ))}
          </span>
        ) : s.ponente ? (
          <span className="text-sm text-white/65">
            {s.ponente}
            {s.detallePonente ? <span className="font-light text-white/40"> · {s.detallePonente}</span> : null}
          </span>
        ) : null}

        {s.resumen ? <span className="text-sm font-light leading-snug text-white/45">{s.resumen}</span> : null}
      </button>
    </li>
  );
}

/**
 * El panel de una sesión: primero el lugar, después el contenido. Está en ese
 * orden a propósito — la pregunta que la gente hace antes de moverse es «¿a
 * cuál salón voy?», y la foto la responde sin leer.
 */
function Panel({ sesion, onCerrar }: { sesion: Sesion; onCerrar: () => void }) {
  const salon = salonDe(sesion.salon);
  const dialogo = useRef<HTMLDialogElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const n = numeroDe(sesion);
  const total = sesionesDe(sesion.salon).filter(esSesion).length;

  // <dialog> nativo con showModal(): Escape cierra, el foco queda adentro y
  // lo de atrás se vuelve inerte, igual que la ventana de entrada.
  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal();
  }, []);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(caja.current, { opacity: 0, y: 40, scale: 0.98, duration: 0.45, ease: "power3.out" });
      gsap.from(caja.current?.querySelectorAll("[data-linea]") ?? [], {
        opacity: 0, x: -12, duration: 0.4, delay: 0.15, stagger: 0.06, ease: "power2.out",
      });
    });
    return () => mm.revert();
  });

  const quien = sesion.ponentes?.join(" · ") ?? sesion.ponente ?? (sesion.porConfirmar ? "Ponente por confirmar" : null);

  return (
    <dialog
      ref={dialogo}
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === dialogo.current) onCerrar();
      }}
      aria-labelledby={`sesion-${sesion.id}`}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 text-white backdrop:bg-night/80 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-2xl"
    >
      <div ref={caja} className="relative mx-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] border border-white/12 bg-night sm:rounded-[28px]">
        <div className="relative h-48 w-full overflow-hidden sm:h-60">
          <Image src={salon.imagen} alt={`Montaje del ${salon.nombre}`} fill sizes="(max-width: 640px) 100vw, 42rem" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-night/10" />
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-night/70 text-white/70 backdrop-blur transition-colors hover:text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-5 right-5 flex items-end gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet text-sm font-bold tabular-nums">{salon.numero}</span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-soft">Salón</p>
              <p className="truncate text-lg font-semibold tracking-tight">{salon.nombre}</p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 pt-5 md:px-8">
          <div data-linea className="flex flex-wrap gap-2">
            {salon.montaje.map((m) => (
              <span key={m} className="rounded-full border border-white/12 px-3 py-1 text-xs font-light text-white/60">{m}</span>
            ))}
          </div>

          <p data-linea className="mt-5 font-mono text-[11px] font-medium tabular-nums tracking-[0.2em] text-violet-soft">
            SESIÓN {String(n).padStart(2, "0")} DE {String(total).padStart(2, "0")} · {salon.rotulo.toUpperCase()}
          </p>
          <h3 id={`sesion-${sesion.id}`} data-linea className="mt-1.5 text-3xl font-bold leading-tight tracking-tighter">{sesion.titulo}</h3>
          {quien ? (
            <p data-linea className="mt-2 text-base font-light text-white/60">
              {quien}
              {sesion.detallePonente && !sesion.partes ? <span className="text-white/40"> · {sesion.detallePonente}</span> : null}
            </p>
          ) : null}

          {sesion.partes ? (
            <ol className="mt-5 flex flex-col gap-2 border-l border-violet/40 pl-4">
              {sesion.partes.map((p, i) => (
                <li data-linea key={p.titulo} className="flex flex-wrap items-baseline gap-x-2 text-[15px]">
                  <span className="font-mono text-[11px] tabular-nums text-violet-soft">{i + 1}</span>
                  <span className="font-medium">{p.titulo}</span>
                  <span className="font-light text-white/55">
                    {p.ponente}
                    {p.detalle ? <span className="text-white/35"> · {p.detalle}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}

          {sesion.contenido?.length ? (
            <>
              <p data-linea className="mt-7 text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">Qué te llevas</p>
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

          <p data-linea className="mt-6 text-xs font-light text-white/50">
            La hora exacta se publica cuando el equipo la confirme. {salon.aforo}.
          </p>
        </div>
      </div>
    </dialog>
  );
}
