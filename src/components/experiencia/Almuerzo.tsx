"use client";

import { useEffect, useState } from "react";
import Asterisk from "@/components/Asterisk";
import type { Vista } from "@/lib/experiencia";
import PaseQr from "./PaseQr";
import { pedirJson } from "./util";

/**
 * El turno de almuerzo, solo para quien tiene entrada VIP.
 *
 * El almuerzo va de 12:30 a 2:00 y la sala no da para todos a la vez, así que
 * va en tres turnos de media hora. Escoger turno no es un trámite: al mediodía
 * corre el bloque del futuro de Habi en el Salón Inspira, así que el turno
 * decide qué charla se ve y cuál no. Por eso cada opción dice qué te alcanza.
 *
 * El cupo es por orden de llegada. Cuando un turno se llena deja de poderse
 * escoger, y quien cambia de turno libera el que tenía.
 */

type Turno = {
  id: string;
  rotulo: string;
  desde: string;
  hasta: string;
  teAlcanza: string;
  libres: number;
};

type Respuesta = { ok: boolean; turnos: Turno[]; mio: string | null; puede: boolean; motivo?: string; pase?: string };

export default function Almuerzo({ yo }: { yo: Vista | null }) {
  const esVip = yo?.registro?.tier === "vip";
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [mio, setMio] = useState<string | null>(yo?.almuerzo ?? null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pase, setPase] = useState<string | null>(null);

  useEffect(() => {
    if (!esVip) return;
    let vivo = true;
    fetch("/api/experiencia/almuerzo")
      .then((r) => r.json())
      .then((d: Respuesta) => {
        if (!vivo || !d?.turnos) return;
        setTurnos(d.turnos);
        setMio(d.mio);
        if (d.pase) setPase(d.pase);
      })
      .catch(() => null);
    return () => {
      vivo = false;
    };
  }, [esVip]);

  if (!esVip || turnos.length === 0) return null;

  async function escoger(t: Turno) {
    if (ocupado || t.id === mio || t.libres === 0) return;
    setOcupado(t.id);
    setAviso(null);
    try {
      const d = await pedirJson<Respuesta>("/api/experiencia/almuerzo", { turno: t.id });
      if (d?.turnos) setTurnos(d.turnos);
      if (d?.mio !== undefined) setMio(d.mio);
      if (d?.pase) setPase(d.pase);
      if (d?.motivo) setAviso(d.motivo);
    } catch {
      setAviso("No se pudo guardar tu turno. Intenta otra vez.");
    } finally {
      setOcupado(null);
    }
  }

  const escogido = turnos.find((t) => t.id === mio);

  return (
    <section className="mx-auto mb-16 w-full max-w-5xl rounded-3xl border border-white/12 bg-white/[0.04] p-7 sm:p-9">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-soft">
        <Asterisk className="size-3.5" /> Tu entrada VIP
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Escoge tu turno de almuerzo
      </h2>
      <p className="mt-2 max-w-2xl text-base font-light leading-relaxed text-white/60">
        El almuerzo va de 12:30 a 2:00 y la sala no da para todos a la vez, así que son tres turnos
        de media hora. Al mediodía corre el bloque del futuro de Habi, así que el turno que escojas
        decide qué alcanzas a ver.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {turnos.map((t) => {
          const esMio = t.id === mio;
          const lleno = t.libres === 0 && !esMio;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => escoger(t)}
              disabled={lleno || ocupado === t.id}
              aria-pressed={esMio}
              className={`flex h-full flex-col rounded-2xl border p-5 text-left transition-colors ${
                esMio
                  ? "border-violet bg-violet/20"
                  : lleno
                    ? "cursor-not-allowed border-white/8 bg-white/[0.02] opacity-45"
                    : "border-white/12 bg-white/[0.02] hover:border-white/35 hover:bg-white/[0.06]"
              }`}
            >
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-white/45">
                {t.rotulo}
              </span>
              <span className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-white">
                {t.desde}
                <span className="text-white/40"> a </span>
                {t.hasta}
              </span>
              <span className="mt-3 text-sm font-light leading-relaxed text-white/60">{t.teAlcanza}</span>
              <span
                className={`mt-4 text-xs font-medium ${
                  esMio ? "text-violet-soft" : lleno ? "text-white/35" : "text-white/40"
                }`}
              >
                {esMio
                  ? "Este es tu turno"
                  : lleno
                    ? "Turno lleno"
                    : `${t.libres} ${t.libres === 1 ? "puesto libre" : "puestos libres"}`}
              </span>
            </button>
          );
        })}
      </div>

      {aviso ? <p className="mt-4 text-sm text-amber-200/90">{aviso}</p> : null}

      {/* El pase del restaurante. Es otro QR, distinto al de la puerta: acá se
          comprueba el turno, que el de Luma no lleva. */}
      {escogido && pase ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <PaseQr url={pase} rotulo="Tu pase del almuerzo" />
          <div>
            <p className="text-lg font-semibold text-white">
              {escogido.desde} a {escogido.hasta}
            </p>
            <p className="mt-1 text-sm font-light leading-relaxed text-white/55">
              Enseña este QR en el restaurante. No es el mismo de la entrada. Puedes cambiar de
              turno tocando otro: el pase sigue sirviendo.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
