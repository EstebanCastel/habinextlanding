"use client";

import { useEffect, useState } from "react";
import { BLOQUEADAS, EXPERIENCIAS, PUNTOS_TOTALES, bloqueada, type ExperienciaId } from "@/config/experiencia";
import type { Podio as Filas, Vista } from "@/lib/experiencia";
import Accesos from "./Accesos";
import { EVENTO_ENTRAR } from "./BotonEntrar";
import Entrar from "./Entrar";
import { Salas } from "./EnVivo";
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
  // Lo que da puntos, resuelto acá y entregado a `Accesos` por id: el carnet
  // se funde con «Mi entrada» y el mapa y las redes van como una tarjeta más.
  // Antes esto era una rejilla aparte y «Tu carnet» salía dos veces.
  const experiencias = Object.fromEntries(
    EXPERIENCIAS.map((e) => {
      const { hechos, posibles } = puntosEn(yo, e.id);
      const cierre = BLOQUEADAS[e.id];
      return [
        e.id,
        {
          href: e.ruta,
          rotulo: e.id === "mapa" ? "Mapa" : e.nombre,
          nota: e.id === "mapa" ? "Nueve paradas por el recinto" : e.resumen,
          imagen: e.imagen,
          puntos: { hechos, posibles },
          ...(cierre ? { cerrada: `${cierre.nota} ${cierre.desde}.` } : {}),
        },
      ];
    })
  );

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

      {/* El avance, arriba y en una línea. Es un dato de contexto —cuánto
          llevo— no una pantalla: el bloque grande que había antes empujaba
          los accesos fuera del primer pantallazo. */}
      <section className="mb-6 rounded-2xl border border-white/12 bg-gradient-to-r from-violet-shade to-night px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
          <p className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums tracking-tighter text-white sm:text-4xl">
              {yo?.puntos ?? 0}
            </span>
            <span className="text-sm font-light text-white/45">/ {PUNTOS_TOTALES} puntos</span>
          </p>
          <p className="text-sm font-light text-white/60">
            {yo ? (
              <>
                Nivel <span className="font-semibold text-white">{yo.nivel}</span>
                {puesto ? (
                  <>
                    {" · "}vas de <span className="font-semibold text-white">{puesto.puesto}</span> de {puesto.total}
                  </>
                ) : (
                  <> · completa una misión para entrar al ranking</>
                )}
              </>
            ) : (
              <>Entra con el correo y la cédula de tu entrada para jugar.</>
            )}
          </p>
          {!yo ? (
            <button
              type="button"
              onClick={() => pedirEntrada("/experiencia")}
              className="rounded-full bg-violet px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-press"
            >
              Entrar
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex h-2 gap-1 overflow-hidden rounded-full">
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
                <div
                  className="h-full rounded-full bg-violet transition-[width] duration-700"
                  style={{ width: `${posibles ? Math.round((hechos / posibles) * 100) : 0}%` }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Lo que corre ahora en cada salón, encima de todo: el día del evento
          es lo primero que alguien busca al abrir la app. Fuera del día no
          pinta nada. */}
      <div className="mb-6">
        <Salas />
      </div>

      <Accesos yo={yo} experiencias={experiencias} alPedirEntrada={pedirEntrada} />

      {/* El podio, debajo de los accesos: se mira, no se opera. */}
      <section className="mt-8 rounded-2xl border border-white/12 bg-white/[0.03] p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">Los tres primeros</p>
          {podio.length ? <p className="text-xs font-light text-white/40">se cierra el 20 de octubre</p> : null}
        </div>
        {podio.length === 0 ? (
          <p className="mt-3 text-base font-light text-white/50">
            El ranking arranca con la primera misión completada. Puede ser la tuya.
          </p>
        ) : (
          <div className="mt-4">
            <Podio podio={podio} />
          </div>
        )}
        {yo && puesto && puesto.puesto > 3 ? (
          <p className="mt-4 text-sm font-light text-white/50">
            Tú vas de <span className="font-semibold text-white">{puesto.puesto}</span>. Te faltan{" "}
            {Math.max(0, (podio[2]?.puntos ?? 0) - yo.puntos + 1)} puntos para alcanzar al tercero.
          </p>
        ) : null}
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
