"use client";

import { useMemo, useState } from "react";
import Confeti from "./Confeti";
import {
  CHARLAS,
  DURACION,
  MINIMO_TEXTO,
  PAGARIA,
  PARTES,
  VUELVE,
  type Respuesta,
} from "@/config/encuesta";

/**
 * La encuesta, un bloque por pantalla.
 *
 * Es lo último que hace alguien después de doce horas de evento, así que no
 * puede parecer una planilla. Toma prestado el lenguaje del quiz de
 * DataCrédito: el número enorme que se desvanece, las tarjetas entrando
 * escalonadas, el botón con resplandor y el confeti al final. Cada toque
 * responde (color, carita, vibración) para que se sienta un juego corto y no
 * un formulario.
 *
 * De todo a la vista se cae mucha gente: ve seis preguntas y cierra. De a un
 * bloque, con la barra llenándose, la termina porque siempre falta poco.
 */

const BLOQUES = 7;

const TITULOS = [
  "¿Le recomendarías Habi Next a otro agente?",
  "¿Por qué ese número?",
  "Califica cada parte del día",
  "¿Cuáles charlas te sirvieron más?",
  "¿Qué vas a aplicar esta semana?",
  "¿Qué cambiarías del próximo?",
  "El año entrante",
];

/** Un golpecito al tocar. Donde no existe, no pasa nada. */
const tocar = (patron: number | number[] = 10) => {
  try {
    navigator.vibrate?.(patron);
  } catch {
    // Navegador sin vibración: es decoración, sigue igual.
  }
};

const HUMOR = (n: number) =>
  n <= 3
    ? { cara: "😔", frase: "Cuéntanos qué pasó. Sin filtro.", color: "#ff5c7a" }
    : n <= 6
      ? { cara: "😐", frase: "¿Qué fue lo que no funcionó?", color: "#ff5c7a" }
      : n <= 8
        ? { cara: "🙂", frase: "Casi. ¿Qué le faltó para un 10?", color: "#ffb347" }
        : n === 9
          ? { cara: "😃", frase: "¡Eso! ¿Qué fue lo mejor?", color: "#2ee6a6" }
          : { cara: "🤩", frase: "¡Qué nota! Cuéntanos por qué.", color: "#2ee6a6" };

const colorNps = (n: number) => (n <= 6 ? "#ff5c7a" : n <= 8 ? "#ffb347" : "#2ee6a6");

type Borrador = Partial<Respuesta> & { partes: Partial<Record<string, number>> };

/** Las charlas agrupadas por salón: con dos salas en paralelo, la lista suelta se lee como un revuelto. */
const POR_SALON: [string, typeof CHARLAS][] = Object.entries(
  CHARLAS.reduce<Record<string, typeof CHARLAS>>((a, c) => {
    (a[c.salon] ||= []).push(c);
    return a;
  }, {})
);

function Estrella({ llena }: { llena: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <path
        d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.45l-5.81 3.05L7.3 14.03 2.6 9.45l6.5-.95L12 2.6z"
        fill={llena ? "#ffc84a" : "none"}
        stroke={llena ? "#ffc84a" : "rgba(255,255,255,.3)"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Chips<T extends string>({
  opciones,
  valor,
  onPick,
}: {
  opciones: { id: T; texto: string }[];
  valor: T | undefined;
  onPick: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => {
            tocar();
            onPick(o.id);
          }}
          aria-pressed={valor === o.id}
          className={`enc-toque rounded-2xl border-[1.5px] px-5 py-3.5 text-[15px] font-bold ${
            valor === o.id
              ? "border-violet bg-violet text-white shadow-[0_12px_30px_-12px_var(--violet)]"
              : "border-white/12 bg-white/[0.05] text-white/70"
          }`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

function Texto({
  valor,
  onChange,
  marcador,
}: {
  valor: string;
  onChange: (v: string) => void;
  marcador: string;
}) {
  return (
    <textarea
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      placeholder={marcador}
      rows={5}
      maxLength={1200}
      className="w-full resize-none rounded-[22px] border-[1.5px] border-violet-soft/25 bg-ink/80 px-5 py-4 text-[17px] font-medium leading-relaxed text-white outline-none transition-[border-color,box-shadow] placeholder:font-normal placeholder:text-white/30 focus:border-violet focus:shadow-[0_0_0_4px_rgba(128,46,246,.25)]"
    />
  );
}

export default function Formulario({
  campana,
  onListo,
}: {
  campana?: string;
  onListo?: () => void;
}) {
  const [paso, setPaso] = useState(0);
  const [b, setB] = useState<Borrador>({ partes: {} });
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState("");
  const [listo, setListo] = useState(false);

  const set = (parche: Partial<Borrador>) => setB((v) => ({ ...v, ...parche }));
  const largo = (s: string | undefined) => (s ?? "").trim().length >= MINIMO_TEXTO;

  const puede = useMemo(() => {
    switch (paso) {
      case 0: return typeof b.nps === "number";
      case 1: return largo(b.porque);
      case 2: return PARTES.every((p) => b.partes[p.id]);
      case 3: return (b.charlas?.length ?? 0) > 0;
      case 4: return largo(b.aplicar);
      case 5: return largo(b.cambiar);
      case 6: return Boolean(b.vuelve && b.pagaria && b.duracion);
      default: return false;
    }
  }, [paso, b]);

  const hechos = PARTES.filter((p) => b.partes[p.id]).length;
  const escogidas = b.charlas ?? [];
  /** «Ninguna» no convive con charlas escogidas: escoger una la saca, y al revés. */
  const alternar = (id: string) =>
    set({
      charlas: escogidas.includes(id)
        ? escogidas.filter((x) => x !== id)
        : [...escogidas.filter((x) => x !== "ninguna"), id],
    });

  async function enviar() {
    setEnviando(true);
    setFallo("");
    try {
      const r = await fetch("/api/encuesta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuesta: b, campana }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) throw new Error(d.error || "No pudimos guardar tu respuesta.");
      tocar([14, 50, 14]);
      setListo(true);
      onListo?.();
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No pudimos guardar tu respuesta.");
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    const h = HUMOR(b.nps ?? 10);
    return (
      <>
        <Confeti />
        <div className="enc-sube py-6 text-center">
          <p className="text-7xl leading-none" aria-hidden="true">{h.cara}</p>
          <h2 className="mt-6 text-[34px] font-extrabold leading-[1.02] tracking-[-0.03em] text-white sm:text-[42px]">
            Listo. Gracias.
          </h2>
          <p className="mx-auto mt-4 max-w-[32ch] text-base font-light leading-relaxed text-white/70">
            Lo que escribiste lo lee el equipo que arma el evento. El Habi Next del año entrante se decide con esto.
          </p>
          <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-violet-soft/25 bg-violet/20 px-4 py-2 text-sm font-bold text-violet-soft">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
            Respuesta guardada
          </p>
        </div>
      </>
    );
  }

  return (
    <div>
      {/* La barra y el contador: siempre se ve cuánto falta. */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-violet px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-white">
          Encuesta · 7 preguntas
        </span>
        <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] tabular-nums text-violet-soft">
          {paso + 1}/{BLOQUES}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {Array.from({ length: BLOQUES }, (_, i) => (
          <i key={i} className="enc-tramo" style={{ "--p": i < paso ? 1 : i === paso ? 0.45 : 0 } as React.CSSProperties} />
        ))}
      </div>

      {/* El número gigante y la pregunta montada encima, como en el quiz. */}
      <p className="enc-numero mt-7 select-none" aria-hidden="true">
        {String(paso + 1).padStart(2, "0")}
      </p>
      <h2 key={paso} className="enc-sube -mt-5 text-[25px] font-bold leading-[1.12] tracking-[-0.02em] text-balance text-white sm:text-[32px]">
        {TITULOS[paso]}
      </h2>

      <div key={`c${paso}`} className="enc-sube mt-6">
        {paso === 0 ? (
          <>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
              {Array.from({ length: 11 }, (_, n) => {
                const puesto = b.nps === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => { tocar(); set({ nps: n }); }}
                    aria-pressed={puesto}
                    className="enc-toque aspect-square rounded-[16px] border-[1.5px] text-[17px] font-extrabold tabular-nums"
                    style={
                      puesto
                        ? { borderColor: colorNps(n), background: colorNps(n), color: "#15062b" }
                        : { borderColor: "rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,.72)" }
                    }
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
              <span>Nunca</span>
              <span>Seguro que sí</span>
            </div>
            {typeof b.nps === "number" ? (
              <div key={b.nps} className="enc-humor mt-6 flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] px-5 py-4">
                <span className="text-4xl leading-none" aria-hidden="true">{HUMOR(b.nps).cara}</span>
                <span className="text-[15px] font-bold leading-snug" style={{ color: HUMOR(b.nps).color }}>
                  {HUMOR(b.nps).frase}
                </span>
              </div>
            ) : null}
          </>
        ) : null}

        {paso === 1 ? (
          <>
            <p className="-mt-2 mb-4 text-[15px] font-light leading-relaxed text-white/55">
              Es la parte que de verdad usamos. Dos líneas bastan.
            </p>
            <Texto valor={b.porque ?? ""} onChange={(v) => set({ porque: v })} marcador="Lo que más pesó, bueno o malo…" />
          </>
        ) : null}

        {paso === 2 ? (
          <>
            <p className="-mt-2 mb-4 text-[15px] font-light leading-relaxed text-white/55">
              Toca las estrellas. {hechos}/{PARTES.length} listas.
            </p>
            <ul className="enc-escalon space-y-2.5">
              {PARTES.map((p) => (
                <li key={p.id} className="rounded-[22px] border-[1.5px] border-white/10 bg-white/[0.05] px-4 py-3.5">
                  <span className="block text-[15px] font-bold leading-tight text-white">{p.nombre}</span>
                  <span className="mt-0.5 block text-[12px] font-light text-white/35">{p.pista}</span>
                  <span className="mt-2.5 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => { tocar(); set({ partes: { ...b.partes, [p.id]: n } }); }}
                        aria-label={`${p.nombre}: ${n} de 5`}
                        aria-pressed={b.partes[p.id] === n}
                        className="enc-toque -m-0.5 p-0.5"
                      >
                        <Estrella llena={(b.partes[p.id] ?? 0) >= n} />
                      </button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {paso === 3 ? (
          <>
            <p className="-mt-2 mb-4 text-[15px] font-light leading-relaxed text-white/55">
              Escoge todas las que te sirvieron. Con esto se arma la agenda del año entrante.
              {escogidas.length > 0 ? (
                <span className="ml-1 font-bold text-violet-soft">{escogidas.length} escogidas.</span>
              ) : null}
            </p>
            <div className="max-h-[52vh] space-y-4 overflow-y-auto overscroll-contain pr-1">
              {POR_SALON.map(([salon, lista]) => (
                <div key={salon}>
                  <p className="sticky top-0 z-[1] -mx-1 bg-night/95 px-1 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-violet-soft backdrop-blur">
                    {salon}
                  </p>
                  <ul className="mt-1 space-y-2">
                    {lista.map((c) => {
                      const puesto = escogidas.includes(c.id);
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => { tocar(); alternar(c.id); }}
                            aria-pressed={puesto}
                            className={`enc-toque flex w-full items-center gap-3 rounded-[18px] border-[1.5px] px-3 py-3 text-left ${
                              puesto ? "border-violet bg-violet/15" : "border-white/10 bg-white/[0.04]"
                            }`}
                          >
                            <span
                              className={`grid size-[34px] flex-none place-items-center rounded-[11px] text-[11px] font-extrabold tabular-nums ${
                                puesto ? "bg-violet text-white" : "bg-white/10 text-white/60"
                              }`}
                            >
                              {c.desde || "·"}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] font-bold leading-tight text-white">{c.titulo}</span>
                              {c.ponente ? (
                                <span className="mt-0.5 block truncate text-[12px] font-light text-white/45">{c.ponente}</span>
                              ) : null}
                            </span>
                            <span
                              className={`grid size-[26px] flex-none place-items-center rounded-full border-[1.5px] ${
                                puesto ? "border-violet bg-violet text-white" : "border-white/20 text-transparent"
                              }`}
                              aria-hidden="true"
                            >
                              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m5 12.5 4.5 4.5L19 7.5" />
                              </svg>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <button
                type="button"
                onClick={() => { tocar(); set({ charlas: ["ninguna"] }); }}
                aria-pressed={escogidas.includes("ninguna")}
                className={`enc-toque w-full rounded-[18px] border-[1.5px] px-4 py-3.5 text-left text-[15px] font-bold ${
                  escogidas.includes("ninguna") ? "border-violet bg-violet/15 text-white" : "border-white/10 bg-white/[0.04] text-white/60"
                }`}
              >
                No alcancé a entrar a ninguna
              </button>
            </div>
          </>
        ) : null}

        {paso === 4 ? (
          <>
            <p className="-mt-2 mb-4 text-[15px] font-light leading-relaxed text-white/55">
              Una cosa concreta que te lleves del día.
            </p>
            <Texto valor={b.aplicar ?? ""} onChange={(v) => set({ aplicar: v })} marcador="Lo primero que vas a hacer distinto…" />
          </>
        ) : null}

        {paso === 5 ? (
          <>
            <p className="-mt-2 mb-4 text-[15px] font-light leading-relaxed text-white/55">
              Sin filtro. Lo que no funcionó se arregla si alguien lo dice.
            </p>
            <Texto valor={b.cambiar ?? ""} onChange={(v) => set({ cambiar: v })} marcador="Lo que harías distinto…" />
          </>
        ) : null}

        {paso === 6 ? (
          <div className="enc-escalon space-y-6">
            <div>
              <p className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-violet-soft">¿Vuelves?</p>
              <Chips opciones={VUELVE} valor={b.vuelve} onPick={(v) => set({ vuelve: v })} />
            </div>
            <div>
              <p className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-violet-soft">¿Pagarías la entrada?</p>
              <Chips opciones={PAGARIA} valor={b.pagaria} onPick={(v) => set({ pagaria: v })} />
            </div>
            <div>
              <p className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-violet-soft">La duración del día estuvo…</p>
              <Chips opciones={DURACION} valor={b.duracion} onPick={(v) => set({ duracion: v })} />
            </div>
          </div>
        ) : null}
      </div>

      {fallo ? <p className="mt-4 text-[14px] font-bold text-[#ff5c7a]">{fallo}</p> : null}

      <div className="mt-7 flex items-center gap-3">
        {paso > 0 ? (
          <button
            type="button"
            onClick={() => setPaso((p) => p - 1)}
            className="enc-toque rounded-full px-4 py-3 text-[15px] font-bold text-white/45"
          >
            Atrás
          </button>
        ) : null}
        <button
          type="button"
          disabled={!puede || enviando}
          onClick={() => {
            tocar();
            if (paso === BLOQUES - 1) enviar();
            else setPaso((p) => p + 1);
          }}
          className="enc-cta ml-auto flex flex-1 items-center justify-center gap-2.5 rounded-full bg-violet px-7 py-[18px] text-[17px] font-extrabold text-white active:bg-violet-press disabled:bg-white/10 disabled:text-white/30"
        >
          {paso === BLOQUES - 1 ? (enviando ? "Enviando…" : "Enviar") : "Siguiente"}
          {!enviando ? (
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14m0 0-6-6m6 6-6 6" />
            </svg>
          ) : null}
        </button>
      </div>
    </div>
  );
}
