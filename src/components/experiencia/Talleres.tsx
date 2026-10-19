"use client";

import { useEffect, useState } from "react";
import Asterisk from "@/components/Asterisk";
import type { Vista } from "@/lib/experiencia";
import { pedirJson } from "./util";

/**
 * Las reservas del Salón Taller.
 *
 * La sala es de mesas con corriente y sesiones donde se sale con algo montado,
 * así que tiene tope real. Reservar no es un trámite: es lo que separa entrar
 * con puesto de quedarse de pie en la puerta.
 *
 * Cada tarjeta es un interruptor —toca para reservar, toca otra vez para
 * soltar— porque es como la gente espera que funcione, y liberar devuelve el
 * cupo a quien venga detrás. Dos talleres a la misma hora los frena el
 * servidor: la sala es una sola.
 */

type Taller = {
  id: string;
  titulo: string;
  desde: string;
  ponente: string;
  detallePonente: string;
  resumen: string;
  necesitas: string;
  libres: number;
  cupo: number;
};

type Respuesta = { ok: boolean; talleres: Taller[]; mios: string[]; motivo?: string };

export default function Talleres({ yo }: { yo: Vista | null }) {
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [mios, setMios] = useState<string[]>(yo?.talleres ?? []);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/experiencia/taller")
      .then((r) => r.json())
      .then((d: Respuesta) => {
        if (!vivo || !d?.talleres) return;
        setTalleres(d.talleres);
        setMios(d.mios ?? []);
      })
      .catch(() => null);
    return () => {
      vivo = false;
    };
  }, []);

  if (talleres.length === 0) return null;

  async function alternar(t: Taller) {
    if (ocupado) return;
    setOcupado(t.id);
    setAviso(null);
    try {
      const d = await pedirJson<Respuesta>("/api/experiencia/taller", { taller: t.id });
      if (d?.talleres) setTalleres(d.talleres);
      if (d?.mios) setMios(d.mios);
      if (d?.motivo) setAviso(d.motivo);
    } catch {
      setAviso("No se pudo guardar tu reserva. Intenta otra vez.");
    } finally {
      setOcupado(null);
    }
  }

  const reservados = talleres.filter((t) => mios.includes(t.id));

  return (
    <section className="mx-auto mb-16 w-full max-w-5xl rounded-3xl border border-white/12 bg-white/[0.04] p-7 sm:p-9">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-soft">
        <Asterisk className="size-3.5" /> Salón Taller
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Reserva tu puesto
      </h2>
      <p className="mt-2 max-w-2xl text-base font-light leading-relaxed text-white/60">
        El Salón Taller tiene mesas con corriente y se sale con algo montado en tu propio
        computador, así que el cupo es real. Reserva los que vas a tomar y llega directo.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {talleres.map((t) => {
          const mio = mios.includes(t.id);
          const lleno = t.libres === 0 && !mio;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => alternar(t)}
              disabled={lleno || ocupado === t.id}
              aria-pressed={mio}
              className={`flex h-full flex-col rounded-2xl border p-5 text-left transition-colors ${
                mio
                  ? "border-violet bg-violet/20"
                  : lleno
                    ? "cursor-not-allowed border-white/8 bg-white/[0.02] opacity-45"
                    : "border-white/12 bg-white/[0.02] hover:border-white/35 hover:bg-white/[0.06]"
              }`}
            >
              <span className="flex items-baseline gap-2">
                <span className="text-lg font-bold tabular-nums tracking-tight text-white">{t.desde}</span>
                {mio ? (
                  <span className="rounded-full bg-violet px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Reservado
                  </span>
                ) : null}
              </span>
              <span className="mt-1.5 text-base font-semibold leading-snug text-white">{t.titulo}</span>
              {t.ponente ? (
                <span className="mt-1 text-sm font-light text-white/55">
                  {t.ponente}
                  {t.detallePonente ? ` · ${t.detallePonente}` : ""}
                </span>
              ) : null}
              {t.necesitas ? (
                <span className="mt-2 text-xs font-light leading-relaxed text-white/45">{t.necesitas}</span>
              ) : null}
              <span
                className={`mt-4 text-xs font-medium ${
                  mio ? "text-violet-soft" : lleno ? "text-white/35" : "text-white/40"
                }`}
              >
                {mio
                  ? "Toca para soltar tu puesto"
                  : lleno
                    ? "Sin cupo"
                    : `${t.libres} ${t.libres === 1 ? "puesto libre" : "puestos libres"}`}
              </span>
            </button>
          );
        })}
      </div>

      {aviso ? <p className="mt-4 text-sm text-amber-200/90">{aviso}</p> : null}
      {reservados.length && !aviso ? (
        <p className="mt-4 text-sm text-white/55">
          Tienes {reservados.length} {reservados.length === 1 ? "taller reservado" : "talleres reservados"}:{" "}
          {reservados.map((t) => `${t.desde} ${t.titulo}`).join(" · ")}.
        </p>
      ) : null}
    </section>
  );
}
