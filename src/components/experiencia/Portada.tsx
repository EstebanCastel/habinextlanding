"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Dot from "@/components/Dot";
import { EXPERIENCIAS, PUNTOS_TOTALES } from "@/config/experiencia";
import type { Podio, Vista } from "@/lib/experiencia";
import Entrar from "./Entrar";
import { puntosEn } from "./puntaje";

/**
 * La portada: el puntaje y el podio arriba, las tres experiencias como
 * tarjetas. Quien no ha entrado ve todo igual; al tocar una tarjeta se le
 * abre la entrada y, al entrar, cae en esa experiencia.
 */
export default function Portada({
  yo,
  podio,
  puesto,
  entrar,
  error,
}: {
  yo: Vista | null;
  podio: Podio;
  puesto: { puesto: number; total: number } | null;
  /** Destino con el que llegó pidiendo entrar (`?entrar=/experiencia/mapa`). */
  entrar?: string;
  error?: string;
}) {
  const [modal, setModal] = useState<{ abierta: boolean; destino: string }>({
    abierta: Boolean(entrar) && !yo,
    destino: entrar || "/experiencia",
  });

  const pedirEntrada = (destino: string) => setModal({ abierta: true, destino });

  return (
    <>
      {/* Avance y podio */}
      <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-[28px] border border-white/12 bg-gradient-to-b from-violet-shade to-night p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">Tu avance</p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="text-6xl font-bold tabular-nums tracking-tighter md:text-7xl">{yo?.puntos ?? 0}</span>
                <span className="text-lg font-light text-white/50">/ {PUNTOS_TOTALES} puntos</span>
              </p>
              <p className="mt-1 text-base font-light text-white/60">
                {yo ? (
                  <>
                    Nivel <span className="font-semibold text-white">{yo.nivel}</span>
                    {puesto ? (
                      <>
                        {" · "}puesto <span className="font-semibold text-white">{puesto.puesto}</span> de {puesto.total}
                      </>
                    ) : (
                      <> · completa tu primera misión para entrar al ranking</>
                    )}
                  </>
                ) : (
                  <>Tu avance se guarda cuando entras: correo y cédula, o LinkedIn.</>
                )}
              </p>
            </div>
            {!yo ? (
              <button type="button" onClick={() => pedirEntrada("/experiencia")} className="rounded-full bg-violet px-7 py-3.5 text-base font-semibold tracking-tight text-white shadow-[0_18px_44px_-14px_rgba(128,46,246,0.9)] transition-colors hover:bg-violet-press">
                Entrar
              </button>
            ) : null}
          </div>

          {/* La barra global, partida en las tres experiencias a proporción de
              sus puntos: se ve de un golpe cuánto falta y dónde. */}
          <div className="mt-6 flex h-3 gap-1 overflow-hidden rounded-full">
            {EXPERIENCIAS.map((e) => {
              const { hechos, posibles } = puntosEn(yo, e.id);
              return (
                <div key={e.id} className="h-full bg-white/10" style={{ flex: `${posibles} 0 0` }} title={`${e.nombre}: ${hechos} de ${posibles}`}>
                  <div className="h-full rounded-full bg-violet transition-[width] duration-700" style={{ width: `${posibles ? Math.round((hechos / posibles) * 100) : 0}%` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {EXPERIENCIAS.map((e) => {
              const { hechos, posibles } = puntosEn(yo, e.id);
              return (
                <span key={e.id} className="flex items-center gap-2 text-xs text-white/55">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[10px] font-bold text-white/80">{e.numero}</span>
                  <span className="font-medium text-white/75">{e.nombre}</span>
                  <span className="tabular-nums">
                    {hechos}/{posibles}
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/12 bg-white/[0.03] p-6 md:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">Los tres primeros</p>
          {podio.length === 0 ? (
            <p className="mt-3 text-base font-light text-white/50">El ranking arranca con la primera misión completada. Puede ser la tuya.</p>
          ) : (
            <ol className="mt-4 flex flex-col gap-3">
              {podio.map((p) => (
                <li key={p.id} className={`flex items-center gap-4 rounded-2xl border px-4 py-3 ${p.puesto === 1 ? "border-violet/50 bg-violet/[0.12]" : "border-white/10"}`}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-bold ${p.puesto === 1 ? "bg-violet text-white" : "border border-white/20 text-white/80"}`}>
                    {p.puesto}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-lg font-medium tracking-tight">{p.nombre}</span>
                  <span className="shrink-0 text-xl font-bold tabular-nums tracking-tight text-violet-soft">{p.puntos}</span>
                </li>
              ))}
            </ol>
          )}
          {yo && puesto && puesto.puesto > 3 ? (
            <p className="mt-4 text-sm font-light text-white/50">
              Tú vas de <span className="font-semibold text-white">{puesto.puesto}</span>. Al tercero le faltan{" "}
              {Math.max(0, (podio[2]?.puntos ?? 0) - yo.puntos + 1)} puntos para alcanzarlo.
            </p>
          ) : null}
        </div>
      </section>

      {/* Las tres experiencias */}
      <section className="mt-12">
        <p className="mb-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
          <Dot className="h-1.5 w-1.5" />
          Las tres experiencias
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          {EXPERIENCIAS.map((e) => {
            const { hechos, posibles } = puntosEn(yo, e.id);
            const completa = hechos >= posibles;
            const contenido = (
              <>
                <div className="relative aspect-[3/2] overflow-hidden">
                  <Image src={e.imagen} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                  <span className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-violet text-sm font-bold text-white">{e.numero}</span>
                  {completa ? (
                    <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-night">Completa</span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="text-2xl font-semibold leading-tight tracking-tight">{e.nombre}</h3>
                  <p className="text-sm font-light leading-relaxed text-white/60">{e.resumen}</p>
                  <div className="mt-auto pt-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-white/50">{yo ? "Llevas" : "En juego"}</span>
                      <span className="font-semibold tabular-nums text-violet-soft">
                        {yo ? `${hechos} / ${posibles}` : posibles} pts
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-violet" style={{ width: `${posibles ? Math.round((hechos / posibles) * 100) : 0}%` }} />
                    </div>
                  </div>
                  <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
                    {yo ? "Entrar a la experiencia" : "Entrar para jugar"}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </div>
              </>
            );
            const clases =
              "group flex flex-col overflow-hidden rounded-[26px] border border-white/12 bg-ink text-left transition-colors hover:border-violet/60 focus-visible:outline-none";
            return yo ? (
              <Link key={e.id} href={e.ruta} className={clases}>
                {contenido}
              </Link>
            ) : (
              <button key={e.id} type="button" onClick={() => pedirEntrada(e.ruta)} className={clases}>
                {contenido}
              </button>
            );
          })}
        </div>
      </section>

      <Entrar
        abierta={modal.abierta}
        destino={modal.destino}
        alCerrar={() => setModal((m) => ({ ...m, abierta: false }))}
        errorInicial={error}
      />
    </>
  );
}
