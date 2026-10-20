"use client";

import { useMemo, useState } from "react";
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
 * De una sola página con todo a la vista se cae mucha gente: ve seis preguntas
 * y cierra. De a un bloque, con la barra de arriba llenándose, la termina
 * porque siempre falta poco. Es la misma encuesta; cambia cuánto pesa.
 *
 * El botón de seguir no avanza hasta que el bloque esté contestado, así que no
 * hay forma de llegar al final con huecos y tampoco hay que regañar a nadie al
 * final con «te faltaron tres».
 */

const BLOQUES = 7;

type Borrador = Partial<Respuesta> & { partes: Partial<Record<string, number>> };

function Barra({ paso }: { paso: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: BLOQUES }, (_, i) => (
        <span
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= paso ? "bg-violet" : "bg-white/12"}`}
        />
      ))}
    </div>
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
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onPick(o.id)}
          aria-pressed={valor === o.id}
          className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
            valor === o.id
              ? "border-violet bg-violet text-white"
              : "border-white/15 bg-white/[0.03] text-white/70 hover:border-white/30 hover:text-white"
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
      className="w-full resize-none rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-base font-light leading-relaxed text-white outline-none transition-colors placeholder:text-white/25 focus:border-violet"
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
      case 3: return Boolean(b.charla);
      case 4: return largo(b.aplicar);
      case 5: return largo(b.cambiar);
      case 6: return Boolean(b.vuelve && b.pagaria && b.duracion);
      default: return false;
    }
  }, [paso, b]);

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
      setListo(true);
      onListo?.();
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No pudimos guardar tu respuesta.");
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <div className="py-6 text-center">
        <p className="text-5xl" aria-hidden="true">✦</p>
        <h2 className="mt-5 text-2xl font-light tracking-tight text-white sm:text-3xl">Listo. Gracias.</h2>
        <p className="mx-auto mt-3 max-w-md text-base font-light leading-relaxed text-white/60">
          Lo que escribiste lo lee el equipo que arma el evento. El Habi Next del año entrante se decide con esto.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Barra paso={paso} />
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-soft">
        {paso + 1} de {BLOQUES}
      </p>

      <div className="mt-3 min-h-[19rem]">
        {paso === 0 ? (
          <>
            <h2 className="text-2xl font-light leading-tight tracking-tight text-white sm:text-3xl">
              ¿Qué tanto le recomendarías Habi Next a otro agente inmobiliario?
            </h2>
            <div className="mt-6 grid grid-cols-6 gap-1.5 sm:grid-cols-11">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set({ nps: n })}
                  aria-pressed={b.nps === n}
                  className={`aspect-square rounded-xl border text-base font-bold tabular-nums transition-colors ${
                    b.nps === n
                      ? "border-violet bg-violet text-white"
                      : "border-white/15 bg-white/[0.03] text-white/70 hover:border-white/35 hover:text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
              <span>Nunca</span>
              <span>Seguro que sí</span>
            </div>
          </>
        ) : null}

        {paso === 1 ? (
          <>
            <h2 className="text-2xl font-light leading-tight tracking-tight text-white sm:text-3xl">
              ¿Por qué ese número?
            </h2>
            <p className="mt-2 text-sm font-light text-white/50">
              Es la parte que de verdad usamos. Dos líneas bastan.
            </p>
            <div className="mt-5">
              <Texto valor={b.porque ?? ""} onChange={(v) => set({ porque: v })} marcador="Lo que más pesó, bueno o malo…" />
            </div>
          </>
        ) : null}

        {paso === 2 ? (
          <>
            <h2 className="text-2xl font-light leading-tight tracking-tight text-white sm:text-3xl">
              Califica cada parte del día
            </h2>
            <ul className="mt-5 space-y-3.5">
              {PARTES.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{p.nombre}</span>
                    <span className="block text-[11px] font-light text-white/35">{p.pista}</span>
                  </span>
                  <span className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => set({ partes: { ...b.partes, [p.id]: n } })}
                        aria-label={`${p.nombre}: ${n} de 5`}
                        aria-pressed={b.partes[p.id] === n}
                        className={`size-9 rounded-lg border text-sm font-bold tabular-nums transition-colors ${
                          b.partes[p.id] === n
                            ? "border-violet bg-violet text-white"
                            : "border-white/15 bg-white/[0.03] text-white/60 hover:border-white/35"
                        }`}
                      >
                        {n}
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
            <h2 className="text-2xl font-light leading-tight tracking-tight text-white sm:text-3xl">
              ¿Cuál charla te sirvió más?
            </h2>
            <p className="mt-2 text-sm font-light text-white/50">Con esta respuesta se arma la agenda del año entrante.</p>
            <select
              value={b.charla ?? ""}
              onChange={(e) => set({ charla: e.target.value })}
              className="mt-5 w-full appearance-none rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none transition-colors focus:border-violet"
            >
              <option value="" disabled>Escoge una…</option>
              {CHARLAS.map((c) => (
                <option key={c.id} value={c.id} className="bg-night text-white">
                  {c.titulo}{c.ponente ? ` — ${c.ponente}` : ""}
                </option>
              ))}
              <option value="ninguna" className="bg-night text-white">No alcancé a entrar a ninguna</option>
            </select>
          </>
        ) : null}

        {paso === 4 ? (
          <>
            <h2 className="text-2xl font-light leading-tight tracking-tight text-white sm:text-3xl">
              ¿Qué vas a aplicar en tu negocio esta semana?
            </h2>
            <p className="mt-2 text-sm font-light text-white/50">Una cosa concreta que te lleves del día.</p>
            <div className="mt-5">
              <Texto valor={b.aplicar ?? ""} onChange={(v) => set({ aplicar: v })} marcador="Lo primero que vas a hacer distinto…" />
            </div>
          </>
        ) : null}

        {paso === 5 ? (
          <>
            <h2 className="text-2xl font-light leading-tight tracking-tight text-white sm:text-3xl">
              ¿Qué cambiarías del próximo Habi Next?
            </h2>
            <p className="mt-2 text-sm font-light text-white/50">Sin filtro. Lo que no funcionó se arregla si alguien lo dice.</p>
            <div className="mt-5">
              <Texto valor={b.cambiar ?? ""} onChange={(v) => set({ cambiar: v })} marcador="Lo que harías distinto…" />
            </div>
          </>
        ) : null}

        {paso === 6 ? (
          <>
            <h2 className="text-2xl font-light leading-tight tracking-tight text-white sm:text-3xl">El año entrante</h2>
            <div className="mt-6 space-y-6">
              <div>
                <p className="mb-2.5 text-sm font-semibold text-white">¿Vuelves?</p>
                <Chips opciones={VUELVE} valor={b.vuelve} onPick={(v) => set({ vuelve: v })} />
              </div>
              <div>
                <p className="mb-2.5 text-sm font-semibold text-white">¿Pagarías la entrada?</p>
                <Chips opciones={PAGARIA} valor={b.pagaria} onPick={(v) => set({ pagaria: v })} />
              </div>
              <div>
                <p className="mb-2.5 text-sm font-semibold text-white">La duración del día estuvo…</p>
                <Chips opciones={DURACION} valor={b.duracion} onPick={(v) => set({ duracion: v })} />
              </div>
            </div>
          </>
        ) : null}
      </div>

      {fallo ? <p className="mt-3 text-sm font-medium text-amber-300">{fallo}</p> : null}

      <div className="mt-6 flex items-center gap-3">
        {paso > 0 ? (
          <button
            type="button"
            onClick={() => setPaso((p) => p - 1)}
            className="rounded-full px-4 py-3 text-sm font-medium text-white/50 transition-colors hover:text-white"
          >
            Atrás
          </button>
        ) : null}
        <button
          type="button"
          disabled={!puede || enviando}
          onClick={() => (paso === BLOQUES - 1 ? enviar() : setPaso((p) => p + 1))}
          className="ml-auto rounded-full bg-violet px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-violet-press disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
        >
          {paso === BLOQUES - 1 ? (enviando ? "Enviando…" : "Enviar") : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
