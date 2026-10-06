"use client";

import Image from "next/image";
import { Cormorant_Garamond } from "next/font/google";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Asterisk from "@/components/Asterisk";
import { gsap, useGSAP } from "@/lib/gsap";
import { SALONES, esSesion, fichaDe, numeroDe, salonDe, sesionesDe, type Ficha, type Salon, type SalonId, type Sesion } from "@/config/agenda";
import type { Vista } from "@/lib/experiencia";
import { clasesBoton, pedirJson } from "./util";

/**
 * El programa del día, como un cartel y no como una tabla.
 *
 * Son dos salones, uno al lado del otro: la foto del escenario arriba y,
 * debajo, cada sesión como una tarjeta en el orden en que pasa. A la derecha
 * de cada tarjeta va la foto de quien dicta, grande y degradada hacia el
 * texto; al abrirla, el retrato ocupa el afiche con el nombre en serif y la
 * ficha de la sesión se puede descargar.
 *
 * No hay horas a propósito: el equipo las está cerrando y es mejor un
 * programa sin reloj que un reloj que después se desdice.
 *
 * Cada sesión se puede marcar con «me interesa»: la persona arma su día y el
 * equipo ve qué charlas tienen más expectativa. No da puntos.
 */

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], display: "swap" });

/** Las palabras que corren por el borde del afiche, como en la credencial. */
const PALABRAS = ["GLOBAL", "EXPERIENCIA", "OPORTUNIDAD", "BOGOTÁ", "IA", "OCT. 2026"];

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
        una sesión para ver quién la dicta, qué te llevas y descargar su ficha.
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
        grande ? "px-5 py-3 text-base font-medium" : "h-8 px-2.5 text-xs"
      } ${gusta ? "border-violet bg-violet text-white" : "border-white/20 text-white/75 hover:border-violet/60 hover:text-white"}`}
    >
      <Corazon lleno={gusta} className={grande ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {grande ? <span>{gusta ? "Te interesa" : "Me interesa"}</span> : null}
      {n > 0 ? <span className="font-semibold tabular-nums">{n}</span> : null}
    </button>
  );
}

/**
 * Un salón: la foto del escenario con su número de tótem, y debajo las
 * sesiones como tarjetas, en el orden del programa.
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

// ---------- quién dicta ----------

type Quien = { nombre: string; cargo?: string; ficha?: Ficha };

/** La lista de quienes dictan, con su ficha, a partir de cómo está escrito en la sesión. */
function gente(s: Sesion): Quien[] {
  const lista = s.ponentes ?? (s.ponente ? [s.ponente] : []);
  return lista.map((p) => {
    const [nombre, extra] = p.split("·").map((t) => t.trim());
    const ficha = fichaDe(nombre);
    return { nombre, cargo: s.detallePonente && !s.ponentes ? s.detallePonente : (ficha?.cargo ?? extra), ficha };
  });
}

/** «Juanfe Quiñones» → «JQ»; para quien no tiene foto. */
function iniciales(nombre: string): string {
  const partes = nombre.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter((p) => p && !/^(y|o|de|del|la|el)$/i.test(p));
  return partes.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

/** Lo que va en el cuadro de alguien sin foto: su logo o sus iniciales. */
function Relleno({ q, className = "" }: { q: Quien; className?: string }) {
  if (q.ficha?.logo) {
    return (
      <span className={`grid place-items-center p-4 ${className}`} style={{ background: q.ficha.fondo ?? "#ffffff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={q.ficha.logo} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
      </span>
    );
  }
  return (
    <span className={`grid place-items-center bg-violet-shade text-2xl font-bold tracking-wide text-violet-soft ${className}`}>{iniciales(q.nombre)}</span>
  );
}

/** Posiciones de la «bolsa» de logos: tiradas una encima de otra, con giro y solape. */
const BOLSA: Record<number, { left: string; top: string; rotate: number; w: string }[]> = {
  1: [{ left: "18%", top: "20%", rotate: -6, w: "64%" }],
  2: [
    { left: "0%", top: "6%", rotate: -8, w: "58%" },
    { left: "40%", top: "40%", rotate: 6, w: "56%" },
  ],
  4: [
    { left: "2%", top: "6%", rotate: -9, w: "52%" },
    { left: "42%", top: "2%", rotate: 10, w: "48%" },
    { left: "8%", top: "50%", rotate: -4, w: "50%" },
    { left: "44%", top: "46%", rotate: 7, w: "50%" },
  ],
};
const bolsaDe = (n: number) => BOLSA[n] ?? BOLSA[4];

/**
 * La capa visual de la tarjeta, a la derecha y debajo del texto, para que
 * tarjeta y foto sean una sola cosa: la foto se funde hacia el texto con un
 * degradado largo y el nombre va abajo. Las marcas van sin nombre, con sus
 * logos grandes tirados en una bolsa, uno encima de otro. Sin nadie
 * confirmado, el logo de Habi.
 */
function CapaVisual({ s }: { s: Sesion }) {
  const lista = gente(s);
  const marcas = lista.filter((q) => q.ficha?.logo);
  const personas = lista.filter((q) => !q.ficha?.logo);
  // La máscara funde la foto hacia el texto; el velo de encima apaga sus
  // bordes de arriba y de la derecha, para que una foto con fondo claro no se
  // lea como un recorte pegado sobre la tarjeta.
  const fundido = {
    maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.85) 55%, black 100%)",
    WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.85) 55%, black 100%)",
  } as const;
  const velo = { background: "radial-gradient(ellipse 78% 105% at 58% 62%, rgba(5,2,8,0) 42%, rgba(5,2,8,0.55) 75%, rgba(5,2,8,0.95) 100%)" } as const;

  if (!lista.length) {
    return (
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[52%]" style={fundido}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo.png" alt="" loading="lazy" className="absolute right-[12%] top-1/2 w-[46%] -translate-y-1/2 opacity-80" />
      </span>
    );
  }

  if (!personas.length) {
    return (
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[48%]">
        {marcas.slice(0, 4).map((q, i) => {
          const bolsa = bolsaDe(Math.min(marcas.length, 4));
          const pos = bolsa[i % bolsa.length];
          return (
            <span
              key={q.nombre}
              className="absolute grid aspect-[5/4] place-items-center rounded-2xl border border-white/10 p-4 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)]"
              style={{ left: pos.left, top: pos.top, width: pos.w, transform: `rotate(${pos.rotate}deg)`, background: q.ficha?.fondo ?? "#ffffff", zIndex: i + 1 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={q.ficha!.logo} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
            </span>
          );
        })}
      </span>
    );
  }

  const q = personas.find((x) => x.ficha?.foto) ?? personas[0];
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[58%]" style={fundido}>
        {q.ficha?.foto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.ficha.foto} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[60%_top] grayscale" />
            <span className="absolute inset-0" style={velo} />
          </>
        ) : (
          <span className="absolute inset-0 grid place-items-center text-5xl font-bold tracking-wide text-violet-soft/60">{iniciales(q.nombre)}</span>
        )}
      </span>
      <span className="pointer-events-none absolute bottom-0 right-0 w-[58%] bg-gradient-to-t from-night via-night/85 to-transparent px-5 pb-5 pt-10 text-right sm:px-6 sm:pb-6">
        <span className="block text-[15px] font-semibold leading-tight tracking-tight text-white sm:text-base">{q.nombre}</span>
        {q.cargo ? <span className="mt-0.5 block text-[11px] font-light leading-snug text-white/55">{q.cargo}</span> : null}
      </span>
    </>
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
        className={`group relative block min-h-[14rem] w-full overflow-hidden rounded-[22px] border bg-white/[0.03] text-left transition-colors hover:bg-violet/[0.06] focus-visible:outline-none ${
          gusta ? "border-violet/50" : "border-white/10 hover:border-violet/60 focus-visible:border-violet/60"
        }`}
      >
        <CapaVisual s={s} />
        <span className="relative z-10 flex w-[64%] flex-col p-5 pb-16 sm:w-[60%] sm:p-6 sm:pb-16">
          <span className="block font-mono text-[11px] font-medium tracking-[0.2em] text-violet-soft">SESIÓN {n}</span>
          <span className="mt-1.5 block text-xl font-semibold leading-[1.15] tracking-tight sm:text-[1.4rem]">{s.titulo}</span>
          {s.resumen ? <span className="mt-3 block text-sm font-light leading-snug text-white/55">{s.resumen}</span> : null}
        </span>
      </button>
      {/* El corazón va fuera del botón de la tarjeta: un botón no puede contener otro. */}
      <span className="absolute bottom-5 left-5 sm:bottom-6 sm:left-6">
        <MeInteresa sesion={s} intereses={intereses} />
      </span>
    </li>
  );
}

// ---------- el panel ----------

/**
 * El afiche de quien dicta: el retrato grande sobre la noche, la banda
 * morada en diagonal, las palabras de la marca corriendo por el borde y el
 * nombre en serif. Es la misma gramática de la pieza oficial del evento.
 */
function Afiche({ s }: { s: Sesion }) {
  const lista = gente(s);
  const principal = lista.find((q) => q.ficha?.foto) ?? lista[0];
  const otros = lista.filter((q) => q !== principal);
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-night sm:aspect-[16/10]">
      {principal?.ficha?.foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={principal.ficha.foto}
          alt=""
          className="absolute inset-y-0 left-0 h-full w-[72%] object-cover object-top grayscale sm:w-[58%]"
          style={{
            maskImage: "linear-gradient(to right, black 55%, transparent 100%), linear-gradient(to bottom, black 60%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, black 55%, transparent 100%), linear-gradient(to bottom, black 60%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        />
      ) : principal ? (
        <div className="absolute left-6 top-8 h-24 w-24 overflow-hidden rounded-3xl sm:left-10 sm:top-10 sm:h-32 sm:w-32">
          <Relleno q={principal} className="h-full w-full" />
        </div>
      ) : null}
      {/* La banda morada, en diagonal, como en la pieza del evento. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-[18%] top-[-30%] h-[170%] w-[48%] rotate-[24deg] bg-gradient-to-b from-violet/70 via-violet-deep/50 to-transparent mix-blend-screen" />
      {/* Las palabras por el borde. */}
      <div aria-hidden="true" className="pointer-events-none absolute bottom-6 right-4 top-6 flex flex-col-reverse items-center justify-between font-mono text-[9px] tracking-[0.3em] text-white/45 sm:right-6" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
        {PALABRAS.map((p) => (
          <span key={p}>{p}</span>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night via-night/70 to-transparent px-6 pb-6 pt-16 pr-14 sm:px-10 sm:pb-8">
        {principal ? (
          <>
            <p className={`${serif.className} text-[2.6rem] font-medium leading-[0.95] tracking-tight text-white sm:text-6xl`}>
              {principal.nombre.split(" ").slice(0, 1).join(" ")}
              <br />
              {principal.nombre.split(" ").slice(1).join(" ")}
            </p>
            {principal.cargo ? (
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">{principal.cargo}</p>
            ) : null}
          </>
        ) : (
          <p className={`${serif.className} text-4xl font-medium leading-none text-white/70 sm:text-5xl`}>Ponente por confirmar</p>
        )}
        {s.gancho ? <p className="mt-3 max-w-sm text-sm font-light leading-snug text-white/80">{s.gancho}</p> : null}
        {otros.length ? (
          <p className="mt-3 text-xs font-light text-white/60">
            Con {otros.map((q) => q.nombre).join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

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
        <button type="button" onClick={onCerrar} aria-label="Cerrar" className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-night/70 text-white/70 backdrop-blur transition-colors hover:text-white">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <Afiche s={sesion} />

        <div className="px-6 pb-8 pt-5 sm:px-10">
          <p data-linea className="font-mono text-[11px] font-medium tabular-nums tracking-[0.2em] text-violet-soft">
            SESIÓN {String(n).padStart(2, "0")} DE {String(total).padStart(2, "0")} · SALÓN {salon.numero} · {salon.rotulo.toUpperCase()}
          </p>
          <h3 id={`sesion-${sesion.id}`} data-linea className="mt-1.5 text-2xl font-bold leading-tight tracking-tighter sm:text-3xl">{sesion.titulo}</h3>
          {sesion.resumen ? <p data-linea className="mt-2 text-base font-light text-white/65">{sesion.resumen}</p> : null}

          <div data-linea className="mt-5 flex flex-wrap items-center gap-3">
            <a href={`/api/experiencia/agenda/${sesion.id}`} download className={`${clasesBoton.solido} !px-6 !py-3 !text-sm`}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Descargar los contenidos
            </a>
            <MeInteresa sesion={sesion} intereses={intereses} grande />
          </div>

          {sesion.contenido?.length ? (
            <ul className="mt-6 flex flex-col gap-2.5">
              {sesion.contenido.map((c) => (
                <li data-linea key={c} className="flex gap-3 text-[15px] font-light leading-snug text-white/75">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet" />
                  {c}
                </li>
              ))}
            </ul>
          ) : null}

          {sesion.necesitas ? (
            <p data-linea className="mt-5 rounded-2xl border border-violet/25 bg-violet/10 px-4 py-3 text-sm font-light text-white/75">
              <span className="font-semibold text-white">Trae contigo: </span>
              {sesion.necesitas}
            </p>
          ) : null}

          <p data-linea className="mt-5 text-xs font-light text-white/45">
            {salon.nombre} · {salon.aforo}. La hora se publica cuando el equipo la confirme.
          </p>
        </div>
      </div>
    </dialog>
  );
}
