"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Asterisk from "@/components/Asterisk";
import { gsap, useGSAP } from "@/lib/gsap";
import { SALONES, esSesion, fichaDe, numeroDe, salonDe, sesionesDe, type Salon, type SalonId, type Sesion } from "@/config/agenda";
import type { Vista } from "@/lib/experiencia";
import { pedirJson } from "./util";

/**
 * El programa del día, como un cartel y no como una tabla.
 *
 * Son dos salones, uno al lado del otro: la foto del escenario arriba y,
 * debajo, cada sesión como una tarjeta en el orden en que pasa. No hay horas
 * a propósito: el equipo las está cerrando y es mejor un programa sin reloj
 * que un reloj que después se desdice. Lo que sí se sabe es qué viene
 * primero y qué viene después, y eso es lo que se lee.
 *
 * Cada sesión se puede marcar con «me interesa»: la persona arma su día y el
 * equipo ve qué charlas tienen más expectativa. No da puntos.
 *
 * En celular los dos salones no caben a la vez y se elige uno; en pantalla
 * ancha se ven los dos, que es como se decide a cuál entrar.
 */

type Intereses = {
  gustan: Set<string>;
  conteos: Record<string, number>;
  alternar: (s: Sesion) => void;
  ocupada: string | null;
};

export default function Agenda({ yo, conteos: conteosIniciales }: { yo: Vista | null; conteos: Record<string, number> }) {
  const router = useRouter();
  const [abierta, setAbierta] = useState<Sesion | null>(null);
  const [salonMovil, setSalonMovil] = useState<SalonId>("inspira");
  const [soloMias, setSoloMias] = useState(false);
  const [gustan, setGustan] = useState<Set<string>>(() => new Set(yo?.agenda ?? []));
  const [conteos, setConteos] = useState(conteosIniciales);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const alternar = async (s: Sesion) => {
    if (!yo) {
      router.push(`/experiencia?entrar=${encodeURIComponent("/experiencia/agenda")}`);
      return;
    }
    if (ocupada) return;
    const gusta = !gustan.has(s.id);
    // Se pinta de una vez y se confirma con el servidor; si falla, se devuelve.
    setGustan((prev) => {
      const n = new Set(prev);
      if (gusta) n.add(s.id);
      else n.delete(s.id);
      return n;
    });
    setConteos((c) => ({ ...c, [s.id]: Math.max(0, (c[s.id] ?? 0) + (gusta ? 1 : -1)) }));
    setOcupada(s.id);
    try {
      const r = await pedirJson<{ ok: boolean; yo: Vista; conteos: Record<string, number> }>("/api/experiencia/agenda", { sesion: s.id, gusta });
      setGustan(new Set(r.yo.agenda));
      setConteos(r.conteos);
    } catch {
      setGustan((prev) => {
        const n = new Set(prev);
        if (gusta) n.delete(s.id);
        else n.add(s.id);
        return n;
      });
      setConteos((c) => ({ ...c, [s.id]: Math.max(0, (c[s.id] ?? 0) + (gusta ? -1 : 1)) }));
    } finally {
      setOcupada(null);
    }
  };

  const intereses: Intereses = { gustan, conteos, alternar, ocupada };

  return (
    <div>
      {/* Elegir salón: solo en celular. */}
      <div className="sticky top-12 z-20 -mx-5 bg-night/92 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8 md:hidden">
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

      {/* Lo mío: el filtro de las que marqué. */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSoloMias((v) => !v)}
          aria-pressed={soloMias}
          disabled={gustan.size === 0}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            soloMias ? "border-violet bg-violet text-white" : "border-white/15 text-white/70 hover:border-white/35 hover:text-white"
          }`}
        >
          <Corazon lleno={soloMias} className="h-4 w-4" />
          Las que me interesan
          <span className="rounded-full bg-white/15 px-1.5 text-[11px] font-bold tabular-nums">{gustan.size}</span>
        </button>
        <span className="text-xs font-light text-white/45">
          {yo ? "Toca el corazón de una sesión para armar tu día." : "Entra para marcar las que te interesan."}
        </span>
      </div>

      <div className="grid gap-12 md:grid-cols-2 md:gap-8 lg:gap-14">
        {SALONES.map((salon) => (
          <Columna key={salon.id} salon={salon} oculta={salonMovil !== salon.id} soloMias={soloMias} intereses={intereses} onAbrir={setAbierta} />
        ))}
      </div>

      <p className="mt-10 max-w-xl text-sm font-light leading-relaxed text-white/45">
        Las horas de cada sesión se publican apenas el equipo las confirme. El orden ya es el del programa. Toca
        una sesión para ver el salón por dentro y lo que te llevas de ella.
      </p>

      {abierta ? <Panel sesion={abierta} intereses={intereses} onCerrar={() => setAbierta(null)} /> : null}
    </div>
  );
}

function Corazon({ lleno, className = "" }: { lleno: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={lleno ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.2 4.5c2 0 3.5 1.1 4.8 2.7 1.3-1.6 2.8-2.7 4.8-2.7 3.6 0 5.8 3.5 4.5 6.8C19.5 15.9 12 20.5 12 20.5z" strokeLinejoin="round" />
    </svg>
  );
}

/** El corazón de una sesión, con cuánta gente la marcó. */
function MeInteresa({ sesion, intereses, grande = false }: { sesion: Sesion; intereses: Intereses; grande?: boolean }) {
  const gusta = intereses.gustan.has(sesion.id);
  const n = intereses.conteos[sesion.id] ?? 0;
  return (
    <button
      type="button"
      onClick={() => intereses.alternar(sesion)}
      aria-pressed={gusta}
      aria-label={gusta ? "Ya no me interesa" : "Me interesa"}
      disabled={intereses.ocupada === sesion.id}
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors disabled:opacity-60 ${
        grande ? "px-4 py-2 text-sm" : "h-8 px-2.5 text-xs"
      } ${gusta ? "border-violet bg-violet text-white" : "border-white/15 text-white/70 hover:border-violet/60 hover:text-white"}`}
    >
      <Corazon lleno={gusta} className={grande ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {grande ? <span>{gusta ? "Te interesa" : "Me interesa"}</span> : null}
      {n > 0 ? <span className="font-semibold tabular-nums">{n}</span> : null}
    </button>
  );
}

/**
 * Un salón: la foto del escenario con su número de tótem, y debajo las
 * sesiones como tarjetas, en el orden del programa. El número grande es el
 * que está señalizado en piso; se repite acá para que la gente lo reconozca
 * al llegar.
 */
function Columna({
  salon,
  oculta,
  soloMias,
  intereses,
  onAbrir,
}: {
  salon: Salon;
  oculta: boolean;
  soloMias: boolean;
  intereses: Intereses;
  onAbrir: (s: Sesion) => void;
}) {
  const todas = sesionesDe(salon.id);
  const sesiones = soloMias ? todas.filter((s) => esSesion(s) && intereses.gustan.has(s.id)) : todas;
  const total = todas.filter(esSesion).length;

  return (
    <section className={`${oculta ? "hidden md:block" : ""}`} aria-labelledby={`salon-${salon.id}`}>
      <div className="relative overflow-hidden rounded-[28px] border border-white/12">
        <div className="relative aspect-[16/9] w-full sm:aspect-[2/1]">
          <Image src={salon.imagen} alt={`Render del ${salon.nombre}`} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/55 to-night/5" />
          <Asterisk color="var(--violet)" className="agenda-giro pointer-events-none absolute -right-10 -top-10 h-40 w-40 opacity-30 mix-blend-screen sm:h-48 sm:w-48" />
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
          <span className="ml-auto hidden shrink-0 rounded-full border border-white/15 bg-night/60 px-3 py-1 text-[11px] font-semibold tabular-nums text-white/70 backdrop-blur sm:inline-flex">
            {total} sesiones
          </span>
        </div>
      </div>

      {sesiones.length ? (
        <ol className="mt-4 flex flex-col gap-3">
          {sesiones.map((s) => (
            <TarjetaSesion key={s.id} sesion={s} intereses={intereses} onAbrir={() => onAbrir(s)} />
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded-[22px] border border-dashed border-white/12 px-5 py-6 text-sm font-light text-white/45">
          Todavía no marcaste ninguna sesión en {salon.rotulo}.
        </p>
      )}
    </section>
  );
}

/** «Juanfe Quiñones» → «JQ»; «Anderson · Hipoteca» → «A». Para el cuadro sin foto. */
function iniciales(nombre: string): string {
  const limpio = nombre.split("·")[0].replace(/\(.*?\)/g, "").trim();
  const partes = limpio.split(/\s+/).filter((p) => p && !/^(y|o|de|del|la|el)$/i.test(p));
  return partes
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/**
 * Quien dicta: la foto en blanco y negro, como el carnet, y debajo el nombre
 * grande. Las marcas van con su logo; quien no tiene foto, con sus iniciales.
 */
function Ponente({ nombre, detalle, parte }: { nombre: string; detalle?: string; parte?: string }) {
  const [quien, extra] = nombre.split("·").map((t) => t.trim());
  const ficha = fichaDe(quien);
  const cargo = detalle ?? ficha?.cargo ?? extra;
  return (
    <span className="flex w-[7.5rem] flex-col items-start gap-2 sm:w-[8.5rem]">
      {ficha?.foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ficha.foto} alt="" width={160} height={160} loading="lazy" className="h-20 w-20 rounded-2xl border border-white/10 object-cover grayscale sm:h-24 sm:w-24" />
      ) : ficha?.logo ? (
        <span className="grid h-20 w-20 place-items-center rounded-2xl border border-white/10 p-3 sm:h-24 sm:w-24" style={{ background: ficha.fondo ?? "#ffffff" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ficha.logo} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
        </span>
      ) : (
        <span className="grid h-20 w-20 place-items-center rounded-2xl border border-violet/40 bg-violet-shade text-xl font-bold tracking-wide text-violet-soft sm:h-24 sm:w-24">
          {iniciales(quien)}
        </span>
      )}
      <span className="flex flex-col">
        {parte ? <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-soft">{parte}</span> : null}
        <span className="text-[15px] font-semibold leading-tight tracking-tight text-white">{quien}</span>
        {cargo ? <span className="text-xs font-light leading-snug text-white/50">{cargo}</span> : null}
      </span>
    </span>
  );
}

/** Los ponentes de una sesión, en fila. */
function Ponentes({ sesion: s }: { sesion: Sesion }) {
  if (s.partes) {
    return (
      <span className="mt-4 flex flex-wrap gap-x-4 gap-y-4">
        {s.partes.map((p) => (
          <Ponente key={p.titulo} nombre={p.ponente} detalle={p.detalle} parte={p.titulo} />
        ))}
      </span>
    );
  }
  if (s.ponentes) {
    return (
      <span className="mt-4 flex flex-wrap gap-x-4 gap-y-4">
        {s.ponentes.map((p) => (
          <Ponente key={p} nombre={p} />
        ))}
      </span>
    );
  }
  if (s.ponente) {
    return (
      <span className="mt-4 block">
        <Ponente nombre={s.ponente} detalle={s.detallePonente} />
      </span>
    );
  }
  return (
    <span className="mt-4 inline-flex items-center gap-3 text-sm text-white/45">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-dashed border-white/25 text-base text-white/40">?</span>
      Ponente por confirmar
    </span>
  );
}

/** Una sesión como tarjeta. Las pausas no son tarjetas: son un respiro entre dos. */
function TarjetaSesion({ sesion: s, intereses, onAbrir }: { sesion: Sesion; intereses: Intereses; onAbrir: () => void }) {
  if (s.tipo) {
    return (
      <li className="flex items-center gap-3 px-2 py-2">
        <span aria-hidden="true" className="h-px flex-1 border-t border-dashed border-white/15" />
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
          {s.tipo === "pausa" ? (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 9h12v6a4 4 0 01-4 4H8a4 4 0 01-4-4V9zM16 10h2a2 2 0 010 4h-2M7 5v2M11 4v3" strokeLinecap="round" />
            </svg>
          ) : null}
          {s.titulo}
        </span>
        <span aria-hidden="true" className="h-px flex-1 border-t border-dashed border-white/15" />
      </li>
    );
  }

  const n = String(numeroDe(s)).padStart(2, "0");
  const gusta = intereses.gustan.has(s.id);
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onAbrir}
        className={`group relative block w-full overflow-hidden rounded-[22px] border bg-white/[0.03] p-5 pb-16 text-left transition-colors hover:bg-violet/[0.06] focus-visible:outline-none sm:p-6 sm:pb-16 ${
          gusta ? "border-violet/50" : "border-white/10 hover:border-violet/60 focus-visible:border-violet/60"
        }`}
      >
        {/* El número, grande y en marca de agua: ordena sin pedir atención. */}
        <span aria-hidden="true" className="pointer-events-none absolute -right-1 -top-3 font-mono text-[4.5rem] font-bold leading-none tracking-tighter text-white/[0.05] transition-colors group-hover:text-violet/[0.14]">
          {n}
        </span>
        <span className="block font-mono text-[11px] font-medium tracking-[0.2em] text-violet-soft">SESIÓN {n}</span>
        <span className="mt-1.5 block pr-8 text-xl font-semibold leading-[1.15] tracking-tight sm:text-[1.4rem]">{s.titulo}</span>

        <Ponentes sesion={s} />

        {s.resumen ? <span className="mt-4 block text-sm font-light leading-snug text-white/55">{s.resumen}</span> : null}

        <span className="absolute bottom-5 right-5 grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white/60 transition-colors group-hover:border-violet group-hover:bg-violet group-hover:text-white sm:bottom-6 sm:right-6">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.4} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </button>
      {/* El corazón va fuera del botón de la tarjeta: un botón no puede contener otro. */}
      <span className="absolute bottom-5 left-5 sm:bottom-6 sm:left-6">
        <MeInteresa sesion={s} intereses={intereses} />
      </span>
    </li>
  );
}

/**
 * El panel de una sesión: primero el lugar, después el contenido. Está en ese
 * orden a propósito — la pregunta que la gente hace antes de moverse es «¿a
 * cuál salón voy?», y la foto la responde sin leer.
 */
function Panel({ sesion, intereses, onCerrar }: { sesion: Sesion; intereses: Intereses; onCerrar: () => void }) {
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

          <div data-linea className="mt-4">
            <MeInteresa sesion={sesion} intereses={intereses} grande />
          </div>

          <div data-linea>
            <Ponentes sesion={sesion} />
          </div>

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
