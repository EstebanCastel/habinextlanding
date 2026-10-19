"use client";

import { useEffect, useState } from "react";
import { BLOQUEADAS, EXPERIENCIAS, PUNTOS_TOTALES, bloqueada, type ExperienciaId } from "@/config/experiencia";
import type { Podio as Filas, Vista } from "@/lib/experiencia";
import Accesos from "./Accesos";
import { EVENTO_ENTRAR } from "./BotonEntrar";
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

  // «Entrar» desde la cabecera o la barra fija cuando ya se está en la
  // portada: llega como evento, porque navegar a la misma página no vuelve a
  // montar nada.
  useEffect(() => {
    const abrir = (e: Event) => {
      if (yo) return;
      pedirEntrada((e as CustomEvent<string>).detail || "/experiencia");
    };
    window.addEventListener(EVENTO_ENTRAR, abrir);
    return () => window.removeEventListener(EVENTO_ENTRAR, abrir);
  }, [yo]);

  // Y si cambia `?entrar=` estando montada (navegación suave entre rutas de
  // la experiencia), también se abre.
  const [entrarVisto, setEntrarVisto] = useState(entrar);
  if (entrar !== entrarVisto) {
    setEntrarVisto(entrar);
    if (entrar && !yo) setModal({ abierta: true, destino: entrar });
  }
  // Las tres experiencias, en el mismo formato que el resto de accesos: antes
  // tenían su propia rejilla y su propio aspecto, que era una segunda forma
  // de decir lo mismo en la misma pantalla.
  const experiencias = EXPERIENCIAS.map((e) => {
    const { hechos, posibles } = puntosEn(yo, e.id);
    const cierre = BLOQUEADAS[e.id];
    return {
      href: e.ruta,
      rotulo: e.nombre,
      nota: e.resumen,
      imagen: e.imagen,
      puntos: { hechos, posibles },
      ...(cierre ? { cerrada: `${cierre.nota} ${cierre.desde}.` } : {}),
    };
  });

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

      {/* Lo que la gente busca el día del evento, antes que nada: su QR, la
          agenda, su almuerzo, su taller. Lo demás —puntos, podio, las tres
          experiencias— es de los días previos y queda debajo. */}
      <Accesos yo={yo} experiencias={experiencias} alPedirEntrada={pedirEntrada} />

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
