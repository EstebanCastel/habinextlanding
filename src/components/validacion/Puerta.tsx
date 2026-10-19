"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Lector from "./Lector";

/**
 * La pantalla de la puerta: cuántos entraron y el botón que abre la cámara.
 *
 * Las cuentas se refrescan solas cada pocos segundos porque en la puerta hay
 * varios teléfonos escaneando a la vez y cada uno tiene que ver el total de
 * todos, no el suyo. Mientras el lector está abierto no se consulta: la cámara
 * ya está gastando batería y el conteo se actualiza con cada escaneo.
 */

type Tipo = "general" | "vip" | "equipo";
type Modo = "entrada" | "almuerzo";

type Conteo = {
  general: number;
  vip: number;
  equipo: number;
  total: number;
  padron: { general: number; vip: number; equipo: number; total: number };
  almuerzo: { total: number; porTurno: Record<string, number> };
};

type Marca = { id: string; tipo: Tipo; nombre: string; en: string; turno?: string };

const ROTULO: Record<Tipo, string> = { general: "General", vip: "VIP", equipo: "Equipo" };
const COLOR: Record<Tipo, string> = {
  general: "text-violet-soft",
  vip: "text-amber-300",
  equipo: "text-sky-300",
};

/** El nombre del aparato, guardado en este teléfono. */
const sinCambios = () => () => {};
const leerQuien = () => {
  try {
    return localStorage.getItem("hn_puerta") ?? "";
  } catch {
    return "";
  }
};

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

export default function Puerta({ turnos }: { turnos: { id: string; rotulo: string; desde: string; hasta: string }[] }) {
  const [conteo, setConteo] = useState<Conteo | null>(null);
  const [ultimas, setUltimas] = useState<Marca[]>([]);
  const [modo, setModo] = useState<Modo>("entrada");
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  /**
   * Quién está escaneando, para que la bitácora diga de qué teléfono salió
   * cada marca. Se queda en este aparato. Se lee con `useSyncExternalStore`
   * y no en un efecto porque el valor se usa al pintar: en un efecto llegaría
   * un render tarde, y el primer escaneo quedaría firmado como «puerta».
   */
  const quien = useSyncExternalStore(sinCambios, leerQuien, () => "");

  const refrescar = useCallback(async () => {
    try {
      const r = await fetch(`/api/validacion?modo=${modo}`, { cache: "no-store" });
      const d = await r.json();
      if (d?.conteo) setConteo(d.conteo);
      if (d?.ultimas) setUltimas(d.ultimas);
    } catch {
      // una consulta perdida no se avisa: la siguiente llega en cinco segundos
    }
  }, [modo]);

  // Mientras el lector está abierto no se consulta: la cámara ya gasta
  // batería y cada escaneo trae las cuentas al día por su cuenta.
  useEffect(() => {
    let vivo = true;
    const tic = () => { if (vivo) refrescar(); };
    const t = setTimeout(tic, 0);
    const i = abierto ? null : setInterval(tic, 5000);
    return () => {
      vivo = false;
      clearTimeout(t);
      if (i) clearInterval(i);
    };
  }, [refrescar, abierto]);

  async function refrescarPadron() {
    setOcupado(true);
    setAviso(null);
    try {
      const r = await fetch("/api/validacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "refrescar-padron" }),
      });
      const d = await r.json();
      setAviso(d?.ok ? `Lista al día: ${d.padron} personas.` : (d?.error ?? "No se pudo actualizar."));
      await refrescar();
    } catch {
      setAviso("No se pudo actualizar la lista.");
    } finally {
      setOcupado(false);
    }
  }

  const c = conteo;
  const falta = (hechos: number, total: number) => Math.max(0, total - hechos);

  return (
    <>
      {abierto ? (
        <Lector
          modo={modo}
          por={quien || "puerta"}
          alValidar={() => refrescar()}
          alCerrar={() => setAbierto(false)}
        />
      ) : null}

      <div className="mx-auto w-full max-w-3xl px-5 py-8">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">
          Habi Next · Puerta
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {modo === "almuerzo" ? "Almuerzo VIP" : "Entrada al evento"}
        </h1>

        {/* El total, que es el número que todo el mundo pregunta. */}
        <div className="mt-7 rounded-3xl border border-violet/30 bg-violet/[0.07] px-6 py-7 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-soft">
            {modo === "almuerzo" ? "Almuerzos servidos" : "Personas adentro"}
          </p>
          <p className="mt-2 text-6xl font-extrabold tabular-nums tracking-tight text-white sm:text-7xl">
            {modo === "almuerzo" ? (c?.almuerzo.total ?? 0) : (c?.total ?? 0)}
          </p>
          {modo === "entrada" && c ? (
            <p className="mt-2 text-sm font-light text-white/50">
              de {c.padron.total} con entrada · faltan {falta(c.total, c.padron.total)}
            </p>
          ) : null}
        </div>

        {/* El desglose: es lo que permite saber si la fila VIP va lenta. */}
        {modo === "entrada" ? (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {(["general", "vip", "equipo"] as Tipo[]).map((t) => (
              <div key={t} className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-5 text-center">
                <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${COLOR[t]}`}>{ROTULO[t]}</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-white">{c?.[t] ?? 0}</p>
                <p className="mt-1 text-[11px] font-light text-white/40">de {c?.padron[t] ?? 0}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {turnos.map((t) => (
              <div key={t.id} className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">{t.rotulo}</p>
                <p className="mt-1 text-xs font-light text-white/45">
                  {t.desde} a {t.hasta}
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-white">
                  {c?.almuerzo.porTurno?.[t.id] ?? 0}
                </p>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="mt-6 w-full rounded-full bg-violet px-6 py-5 text-lg font-bold text-white shadow-[0_18px_40px_-18px_rgba(128,46,246,0.9)] transition-colors hover:bg-violet/90"
        >
          Abrir el lector
        </button>

        <div className="mt-4 flex gap-2 rounded-full border border-white/12 bg-white/[0.04] p-1">
          {(["entrada", "almuerzo"] as Modo[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              aria-pressed={modo === m}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                modo === m ? "bg-violet text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {m === "entrada" ? "Entrada" : "Almuerzo VIP"}
            </button>
          ))}
        </div>

        {ultimas.length ? (
          <section className="mt-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">Últimos</p>
            <ul className="mt-3 divide-y divide-white/8 rounded-2xl border border-white/10 bg-white/[0.03]">
              {ultimas.map((m) => (
                <li key={`${m.tipo}-${m.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0 truncate text-sm font-medium text-white/85">{m.nombre}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${COLOR[m.tipo]}`}>
                      {ROTULO[m.tipo]}
                    </span>
                    <span className="text-xs tabular-nums text-white/40">{hora(m.en)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={refrescarPadron}
            disabled={ocupado}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:text-white disabled:opacity-50"
          >
            {ocupado ? "Actualizando…" : "Actualizar la lista desde Luma"}
          </button>
          {aviso ? <p className="text-sm text-white/55">{aviso}</p> : null}
        </div>
        <p className="mt-3 text-xs font-light leading-relaxed text-white/35">
          Haz esto si alguien activó su entrada hace un momento y no aparece. La lista no se
          actualiza sola para no pedírsela a Luma en cada escaneo.
        </p>
      </div>
    </>
  );
}
