"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Dot from "@/components/Dot";
import { BLOQUEADAS, EXPERIENCIAS, PUNTOS_TOTALES, bloqueada, type ExperienciaId } from "@/config/experiencia";
import type { Podio as Filas, Vista } from "@/lib/experiencia";
import Entrar from "./Entrar";
import Podio from "./Podio";
import { puntosEn } from "./puntaje";

/**
 * La portada: el puntaje y el podio arriba, las tres experiencias como
 * tarjetas. Quien no ha entrado ve todo igual; al tocar una tarjeta se le
 * abre la entrada y, al entrar, cae en esa experiencia.
 *
 * Las experiencias de `BLOQUEADAS` se ven con candado: la tarjeta está, con
 * sus puntos en juego y cuándo se abre, pero no lleva a ningún lado.
 */
export default function Portada({
  yo,
  podio,
  puesto,
  entrar,
  error,
  cerrada,
}: {
  yo: Vista | null;
  podio: Filas;
  puesto: { puesto: number; total: number } | null;
  /** Destino con el que llegó pidiendo entrar (`?entrar=/experiencia/mapa`). */
  entrar?: string;
  error?: string;
  /** Llegó por la URL de una experiencia cerrada (`?cerrada=mapa`). */
  cerrada?: ExperienciaId;
}) {
  const [modal, setModal] = useState<{ abierta: boolean; destino: string }>({
    abierta: Boolean(entrar) && !yo,
    destino: entrar || "/experiencia",
  });

  const pedirEntrada = (destino: string) => setModal({ abierta: true, destino });
  const cierreAviso = cerrada ? BLOQUEADAS[cerrada] : undefined;
  const avisoCerrada = cierreAviso ? EXPERIENCIAS.find((e) => e.id === cerrada) : null;

  return (
    <>
      {avisoCerrada ? (
        <p role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-violet/40 bg-violet/10 px-5 py-4 text-base font-light">
          <Candado className="mt-1 h-4 w-4 shrink-0 text-violet-soft" />
          <span>
            <span className="font-semibold">{avisoCerrada.nombre}</span> todavía no está disponible. {cierreAviso?.desde}.
          </span>
        </p>
      ) : null}

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
                  <>Entra con el correo y la cédula de tu entrada para jugar y guardar tu avance.</>
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
              sus puntos: se ve de un golpe cuánto falta y dónde. Lo cerrado va
              rayado: esos puntos existen, pero todavía no se pueden ganar. */}
          <div className="mt-6 flex h-3 gap-1 overflow-hidden rounded-full">
            {EXPERIENCIAS.map((e) => {
              const { hechos, posibles } = puntosEn(yo, e.id);
              const cerradaE = bloqueada(e.id);
              return (
                <div
                  key={e.id}
                  className="h-full bg-white/10"
                  style={{
                    flex: `${posibles} 0 0`,
                    ...(cerradaE
                      ? { backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.14) 0 4px, transparent 4px 9px)" }
                      : {}),
                  }}
                  title={`${e.nombre}: ${cerradaE ? "cerrada" : `${hechos} de ${posibles}`}`}
                >
                  <div className="h-full rounded-full bg-violet transition-[width] duration-700" style={{ width: `${posibles ? Math.round((hechos / posibles) * 100) : 0}%` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {EXPERIENCIAS.map((e) => {
              const { hechos, posibles } = puntosEn(yo, e.id);
              const cerradaE = bloqueada(e.id);
              return (
                <span key={e.id} className={`flex items-center gap-2 text-xs ${cerradaE ? "text-white/40" : "text-white/55"}`}>
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[10px] font-bold text-white/80">
                    {cerradaE ? <Candado className="h-2.5 w-2.5" /> : e.numero}
                  </span>
                  <span className={`font-medium ${cerradaE ? "text-white/55" : "text-white/75"}`}>{e.nombre}</span>
                  <span className="tabular-nums">{cerradaE ? `${posibles} en espera` : `${hechos}/${posibles}`}</span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/12 bg-white/[0.03] p-6 md:p-8">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">Los tres primeros</p>
            {podio.length === 0 ? null : <p className="text-xs font-light text-white/40">se cierra el 20 de octubre</p>}
          </div>
          {podio.length === 0 ? (
            <p className="mt-3 text-base font-light text-white/50">El ranking arranca con la primera misión completada. Puede ser la tuya.</p>
          ) : null}
          <div className="mt-5">
            <Podio podio={podio} />
          </div>
          {yo && puesto && puesto.puesto > 3 ? (
            <p className="mt-5 text-sm font-light text-white/50">
              Tú vas de <span className="font-semibold text-white">{puesto.puesto}</span>. Te faltan{" "}
              {Math.max(0, (podio[2]?.puntos ?? 0) - yo.puntos + 1)} puntos para alcanzar al tercero.
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
            const cierre = BLOQUEADAS[e.id];
            const contenido = (
              <>
                <div className="relative aspect-[3/2] overflow-hidden">
                  <Image
                    src={e.imagen}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className={`object-cover transition-transform duration-500 ${cierre ? "saturate-[0.35] brightness-[0.6]" : "group-hover:scale-[1.04]"}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                  <span className={`absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white ${cierre ? "bg-white/15" : "bg-violet"}`}>
                    {e.numero}
                  </span>
                  {cierre ? (
                    <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-night/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-white/80 backdrop-blur">
                      <Candado className="h-3 w-3" />
                      Cerrada
                    </span>
                  ) : completa ? (
                    <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-night">Completa</span>
                  ) : null}
                  {cierre ? (
                    <span className="absolute inset-x-0 bottom-0 grid place-items-center pb-5">
                      <span className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-night/60 text-white/85 backdrop-blur">
                        <Candado className="h-6 w-6" />
                      </span>
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className={`text-2xl font-semibold leading-tight tracking-tight ${cierre ? "text-white/70" : ""}`}>{e.nombre}</h3>
                  <p className="text-sm font-light leading-relaxed text-white/60">{cierre ? cierre.nota : e.resumen}</p>
                  <div className="mt-auto pt-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-white/50">{cierre ? "En espera" : yo ? "Llevas" : "En juego"}</span>
                      <span className={`font-semibold tabular-nums ${cierre ? "text-white/45" : "text-violet-soft"}`}>
                        {yo && !cierre ? `${hechos} / ${posibles}` : posibles} pts
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      {cierre ? (
                        <div className="h-full w-full" style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.14) 0 4px, transparent 4px 9px)" }} />
                      ) : (
                        <div className="h-full rounded-full bg-violet" style={{ width: `${posibles ? Math.round((hechos / posibles) * 100) : 0}%` }} />
                      )}
                    </div>
                  </div>
                  <span className={`mt-2 inline-flex items-center gap-2 text-sm font-semibold ${cierre ? "text-white/50" : "text-white"}`}>
                    {cierre ? (
                      <>
                        <Candado className="h-3.5 w-3.5" />
                        {cierre.desde}
                      </>
                    ) : (
                      <>
                        {yo ? "Entrar a la experiencia" : "Entrar para jugar"}
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </span>
                </div>
              </>
            );
            const clases = "group flex flex-col overflow-hidden rounded-[26px] border border-white/12 bg-ink text-left focus-visible:outline-none";
            if (cierre) {
              return (
                <div key={e.id} className={`${clases} cursor-not-allowed`} aria-disabled="true">
                  {contenido}
                </div>
              );
            }
            const vivas = `${clases} transition-colors hover:border-violet/60`;
            return yo ? (
              <Link key={e.id} href={e.ruta} className={vivas}>
                {contenido}
              </Link>
            ) : (
              <button key={e.id} type="button" onClick={() => pedirEntrada(e.ruta)} className={vivas}>
                {contenido}
              </button>
            );
          })}
        </div>
      </section>

      {/* La agenda: no da puntos y por eso no es una de las tres tarjetas,
          pero es lo que más se consulta en los días previos. Va abierta a
          todos, con sesión o sin ella. */}
      <section className="mt-12">
        <Link
          href="/experiencia/agenda"
          className="group grid overflow-hidden rounded-[26px] border border-white/12 bg-ink transition-colors hover:border-violet/60 md:grid-cols-[1.2fr_1fr]"
        >
          <div className="flex flex-col justify-center gap-3 p-6 md:p-8">
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
              <Dot className="h-1.5 w-1.5" />
              La agenda del día
            </p>
            <h3 className="text-3xl font-bold tracking-tighter md:text-4xl">Dos salones, un día entero.</h3>
            <p className="max-w-lg text-base font-light leading-relaxed text-white/60">
              El programa de Inspira y del Salón Taller en el orden en que pasa, con lo que te llevas de cada sesión y
              cómo se ve el escenario por dentro.
            </p>
            <span className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-white">
              Ver la agenda
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </div>
          <div className="relative min-h-[200px] overflow-hidden">
            <Image
              src="/img/evento/senalizacion.jpg"
              alt="Señalización de los escenarios de Habi Next Colombia"
              fill
              sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/30 to-transparent" />
          </div>
        </Link>
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

function Candado({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className} aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" strokeLinecap="round" />
    </svg>
  );
}
