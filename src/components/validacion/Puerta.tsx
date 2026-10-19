"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Lector from "./Lector";

/**
 * Los tres controles del día, en una pantalla.
 *
 * Son tres puertas distintas —la entrada al recinto, el restaurante y el
 * Salón Taller— y cada una la atiende alguien distinto con su propio teléfono.
 * Por eso lo primero y más grande son tres botones: se escoge el puesto, se
 * abre la cámara y ya.
 *
 * Las cuentas se refrescan solas cada pocos segundos porque hay varios
 * teléfonos a la vez y cada uno tiene que ver el total de todos, no el suyo.
 * Mientras el lector está abierto no se consulta: la cámara ya gasta batería
 * y cada escaneo trae las cuentas al día por su cuenta.
 */

type Tipo = "general" | "vip" | "equipo";
type Modo = "entrada" | "almuerzo" | "taller";

type Conteo = {
  general: number;
  vip: number;
  equipo: number;
  total: number;
  padron: { general: number; vip: number; equipo: number; total: number };
  almuerzo: { total: number; porTurno: Record<string, number> };
  taller: { total: number; porSesion: Record<string, number> };
};

type Marca = { id: string; tipo: Tipo; nombre: string; en: string; turno?: string; taller?: string };

type Turno = { id: string; rotulo: string; desde: string; hasta: string };
type Taller = { id: string; titulo: string; desde: string };

const ROTULO: Record<Tipo, string> = { general: "General", vip: "VIP", equipo: "Equipo" };
const COLOR: Record<Tipo, string> = {
  general: "text-violet-soft",
  vip: "text-amber-300",
  equipo: "text-sky-300",
};

/** El puesto de quien escanea, guardado en este teléfono. */
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

const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const PUESTOS: { modo: Modo; rotulo: string; nota: string; icono: React.ReactNode }[] = [
  {
    modo: "entrada",
    rotulo: "Entradas",
    nota: "La puerta del recinto",
    icono: (
      <svg viewBox="0 0 24 24" {...trazo} aria-hidden="true">
        <path d="M14 3h4.5A1.5 1.5 0 0 1 20 4.5v15a1.5 1.5 0 0 1-1.5 1.5H14" />
        <path d="M10 8l4 4-4 4M14 12H4" />
      </svg>
    ),
  },
  {
    modo: "almuerzo",
    rotulo: "Almuerzo VIP",
    nota: "Tres turnos, solo VIP",
    icono: (
      <svg viewBox="0 0 24 24" {...trazo} aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    modo: "taller",
    rotulo: "Salón Taller",
    nota: "Con reserva de puesto",
    icono: (
      <svg viewBox="0 0 24 24" {...trazo} aria-hidden="true">
        <rect x="3" y="4.5" width="18" height="11" rx="1.6" />
        <path d="M8 19.5h8M12 15.5v4" />
      </svg>
    ),
  },
];

export default function Puerta({ turnos, talleres }: { turnos: Turno[]; talleres: Taller[] }) {
  const [conteo, setConteo] = useState<Conteo | null>(null);
  const [ultimas, setUltimas] = useState<Marca[]>([]);
  const [modo, setModo] = useState<Modo | null>(null);
  const [abierto, setAbierto] = useState(false);
  const quien = useSyncExternalStore(sinCambios, leerQuien, () => "");

  const refrescar = useCallback(async () => {
    try {
      const r = await fetch(`/api/validacion?modo=${modo ?? "entrada"}`, { cache: "no-store" });
      const d = await r.json();
      if (d?.conteo) setConteo(d.conteo);
      if (d?.ultimas) setUltimas(d.ultimas);
    } catch {
      // una consulta perdida no se avisa: la siguiente llega en cinco segundos
    }
  }, [modo]);

  useEffect(() => {
    let vivo = true;
    const tic = () => {
      if (vivo) refrescar();
    };
    const t = setTimeout(tic, 0);
    const i = abierto ? null : setInterval(tic, 5000);
    return () => {
      vivo = false;
      clearTimeout(t);
      if (i) clearInterval(i);
    };
  }, [refrescar, abierto]);

  const c = conteo;

  // Sin puesto escogido: los tres botones y el total del día, nada más.
  if (!modo) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">Habi Next · Control</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">¿Qué vas a validar?</h1>

        <ul className="mt-7 grid gap-3">
          {PUESTOS.map((x) => {
            const n = x.modo === "entrada" ? (c?.total ?? 0) : x.modo === "almuerzo" ? (c?.almuerzo.total ?? 0) : (c?.taller.total ?? 0);
            return (
              <li key={x.modo}>
                <button
                  type="button"
                  onClick={() => setModo(x.modo)}
                  className="flex w-full items-center gap-4 rounded-3xl border border-white/12 bg-white/[0.04] p-5 text-left transition-colors hover:border-violet/60 hover:bg-violet/[0.08]"
                >
                  <span className="size-10 shrink-0 text-violet-soft">{x.icono}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-semibold leading-tight text-white">{x.rotulo}</span>
                    <span className="mt-0.5 block text-sm font-light text-white/50">{x.nota}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-3xl font-extrabold tabular-nums text-white">{n}</span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-white/35">validados</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {c ? (
          <p className="mt-7 text-center text-sm font-light text-white/45">
            {c.padron.total} personas con entrada · {c.padron.general} General · {c.padron.vip} VIP ·{" "}
            {c.padron.equipo} equipo
          </p>
        ) : null}
      </div>
    );
  }

  const puesto = PUESTOS.find((x) => x.modo === modo)!;

  return (
    <>
      {abierto ? (
        <Lector
          modo={modo}
          por={quien || modo}
          alValidar={() => refrescar()}
          alCerrar={() => setAbierto(false)}
        />
      ) : null}

      <div className="mx-auto w-full max-w-2xl px-5 py-8">
        <button
          type="button"
          onClick={() => setModo(null)}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-white/50 transition-colors hover:text-white"
        >
          <svg className="size-4" {...trazo} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 19l-7-7 7-7M3 12h18" />
          </svg>
          Cambiar de puesto
        </button>

        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{puesto.rotulo}</h1>

        <div className="mt-6 rounded-3xl border border-violet/30 bg-violet/[0.07] px-6 py-7 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-soft">
            {modo === "entrada" ? "Personas adentro" : modo === "almuerzo" ? "Almuerzos servidos" : "Puestos ocupados"}
          </p>
          <p className="mt-2 text-6xl font-extrabold tabular-nums tracking-tight text-white sm:text-7xl">
            {modo === "entrada" ? (c?.total ?? 0) : modo === "almuerzo" ? (c?.almuerzo.total ?? 0) : (c?.taller.total ?? 0)}
          </p>
          {modo === "entrada" && c ? (
            <p className="mt-2 text-sm font-light text-white/50">
              de {c.padron.total} con entrada · faltan {Math.max(0, c.padron.total - c.total)}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="mt-5 w-full rounded-full bg-violet px-6 py-5 text-lg font-bold text-white shadow-[0_18px_40px_-18px_rgba(128,46,246,0.9)] transition-colors hover:bg-violet/90"
        >
          Abrir el lector
        </button>

        {modo === "entrada" ? (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {(["general", "vip", "equipo"] as Tipo[]).map((t) => (
              <div key={t} className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-5 text-center">
                <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${COLOR[t]}`}>{ROTULO[t]}</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-white">{c?.[t] ?? 0}</p>
                <p className="mt-1 text-[11px] font-light text-white/40">de {c?.padron[t] ?? 0}</p>
              </div>
            ))}
          </div>
        ) : modo === "almuerzo" ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
        ) : (
          <ul className="mt-5 divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03]">
            {talleres.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="text-xs font-bold tabular-nums text-white/55">{t.desde}</span>
                  <span className="ml-2 text-sm font-medium text-white/85">{t.titulo}</span>
                </span>
                <span className="shrink-0 text-lg font-bold tabular-nums text-white">
                  {c?.taller.porSesion?.[t.id] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        )}

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
      </div>
    </>
  );
}
