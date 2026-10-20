"use client";

import { useEffect, useState } from "react";
import type { Vista } from "@/lib/experiencia";
import PaseQr from "./PaseQr";
import { pedirJson } from "./util";

/**
 * El almuerzo del VIP: escoger turno una vez y quedarse con el pase.
 *
 * Escoger se confirma y **no se deshace desde acá**. El almuerzo se sirve en
 * tres tandas con cupo contado: quien cambia de turno a media mañana libera
 * un puesto que otro ya no alcanza a tomar, y deja al restaurante con un
 * conteo que no cuadra. Si de verdad hay que moverlo, lo mueve alguien del
 * equipo, que puede mirar las dos tandas a la vez.
 *
 * Por eso el paso de confirmar: no es una pantalla de más, es lo que separa
 * «toqué sin querer» de «ese es mi turno».
 */

type Turno = { id: string; rotulo: string; desde: string; hasta: string; teAlcanza: string; libres: number };
type Respuesta = { ok: boolean; turnos: Turno[]; mio: string | null; puede: boolean; motivo?: string; pase?: string };

export default function MiAlmuerzo({ yo }: { yo: Vista | null }) {
  const esVip = yo?.registro?.tier === "vip";
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [mio, setMio] = useState<string | null>(yo?.almuerzo ?? null);
  const [pase, setPase] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Turno | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

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

  if (!esVip) {
    return (
      <section className="rounded-3xl border border-white/12 bg-white/[0.04] p-7 text-center sm:p-9">
        <h2 className="text-2xl font-semibold tracking-tight text-white">El almuerzo va con la entrada VIP</h2>
        <p className="mx-auto mt-3 max-w-md text-base font-light leading-relaxed text-white/60">
          Con la General el almuerzo no está incluido. En las preguntas frecuentes dejamos qué hay
          dentro del recinto y qué queda cerca.
        </p>
        <a
          href="/experiencia/preguntas"
          className="mt-5 inline-flex rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-violet/60"
        >
          Ver las preguntas
        </a>
      </section>
    );
  }

  async function confirmar(t: Turno) {
    setOcupado(true);
    setAviso(null);
    try {
      const d = await pedirJson<Respuesta>("/api/experiencia/almuerzo", { turno: t.id });
      if (d?.turnos) setTurnos(d.turnos);
      if (d?.mio !== undefined) setMio(d.mio);
      if (d?.pase) setPase(d.pase);
      if (d?.motivo) setAviso(d.motivo);
      setConfirmando(null);
    } catch {
      setAviso("No se pudo guardar tu turno. Intenta otra vez.");
    } finally {
      setOcupado(false);
    }
  }

  const escogido = turnos.find((t) => t.id === mio);

  // Ya escogió: lo único que hace falta es el pase, grande.
  if (escogido) {
    return (
      <section className="rounded-3xl border border-violet/40 bg-violet/[0.1] p-7 sm:p-9">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-soft">Tu turno</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {escogido.desde} a {escogido.hasta}
        </h2>
        <p className="mt-2 max-w-lg text-base font-light leading-relaxed text-white/60">{escogido.teAlcanza}</p>

        {pase ? (
          <div className="mt-7 flex justify-center">
            <PaseQr
              url={pase}
              rotulo="Tu pase del almuerzo"
              nota="Enséñalo en el restaurante. No es el mismo QR de la entrada."
            />
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm font-light leading-relaxed text-white/45">
          El turno queda fijo. Si de verdad necesitas cambiarlo, escríbenos por WhatsApp al{" "}
          <a href="https://wa.me/573043342330" className="font-medium text-violet-soft underline-offset-4 hover:underline">
            +57 304 334 2330
          </a>{" "}
          y lo movemos.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/12 bg-white/[0.04] p-7 sm:p-9">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-soft">Tu entrada VIP</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Escoge tu turno de almuerzo
      </h2>
      <p className="mt-2 max-w-2xl text-base font-light leading-relaxed text-white/60">
        El almuerzo va de 12:30 a 2:00 y la sala no da para todos a la vez, así que son tres turnos
        de media hora. Al mediodía corre el bloque del futuro de Habi, así que el turno que escojas
        decide qué alcanzas a ver.
      </p>

      <div className="mt-7 grid gap-3">
        {turnos.map((t) => {
          const lleno = t.libres === 0;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => !lleno && setConfirmando(t)}
              disabled={lleno}
              className={`flex flex-col rounded-2xl border p-5 text-left transition-colors ${
                lleno
                  ? "cursor-not-allowed border-white/8 bg-white/[0.02] opacity-45"
                  : "border-white/12 bg-white/[0.02] hover:border-violet/60 hover:bg-violet/[0.08]"
              }`}
            >
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-white/45">{t.rotulo}</span>
              <span className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-white">
                {t.desde}
                <span className="font-normal text-white/40"> a </span>
                {t.hasta}
              </span>
              <span className="mt-2 text-sm font-light leading-relaxed text-white/60">{t.teAlcanza}</span>
              <span className={`mt-4 text-xs font-medium ${lleno ? "text-white/35" : "text-white/45"}`}>
                {lleno ? "Turno lleno" : `${t.libres} ${t.libres === 1 ? "puesto libre" : "puestos libres"}`}
              </span>
            </button>
          );
        })}
      </div>

      {aviso ? <p className="mt-4 text-sm text-amber-200/90">{aviso}</p> : null}

      {/* Confirmar: el turno queda fijo, así que se pregunta una vez. */}
      {confirmando ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-night/85 p-5 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-3xl border border-violet/40 bg-ink p-7 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-soft">
              {confirmando.rotulo}
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">
              {confirmando.desde} a {confirmando.hasta}
            </h3>
            <p className="mt-3 text-base font-light leading-relaxed text-white/65">
              ¿Reservas este turno? Queda fijo: después solo lo cambia el equipo.
            </p>
            <div className="mt-6 grid gap-2.5">
              <button
                type="button"
                onClick={() => confirmar(confirmando)}
                disabled={ocupado}
                className="rounded-full bg-violet px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-violet/90 disabled:opacity-60"
              >
                {ocupado ? "Guardando…" : "Sí, reservar este turno"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(null)}
                disabled={ocupado}
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
