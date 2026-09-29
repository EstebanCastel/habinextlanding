"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  FIN,
  INICIO,
  SALONES,
  SESIONES,
  enReloj,
  minutos,
  salonDe,
  sesionesDe,
  type Sesion,
} from "@/config/agenda";

/**
 * La agenda del día entero, de un solo vistazo.
 *
 * Es una rejilla de franjas de quince minutos: cada sesión ocupa las franjas
 * que dura, así que lo que pasa a la misma hora queda a la misma altura y se
 * ve de inmediato qué se está perdiendo quien entra a la otra sala. Las
 * franjas crecen si el texto lo pide, de modo que nunca se corta un título, y
 * las dos columnas están siempre a la vista, también en celular: son dos
 * salas, y la pregunta de todo el día es a cuál de las dos entrar.
 */

const FRANJA = 15;
const FRANJAS = Math.ceil((FIN - INICIO) / FRANJA);
const franjaDe = (hhmm: string) => Math.round((minutos(hhmm) - INICIO) / FRANJA);
const HORAS_EN_PUNTO = Array.from({ length: Math.ceil((FIN - INICIO) / 60) }, (_, i) => INICIO + i * 60);

export default function Agenda() {
  const [abierta, setAbierta] = useState<Sesion | null>(null);
  const raiz = useRef<HTMLDivElement>(null);

  // La rejilla no se anima al entrar: es una tabla horaria, lo que la gente
  // quiere es verla completa desde el primer cuadro. La animación queda para
  // el panel, que sí es un gesto de la persona.

  const conteo = SALONES.map((s) => ({ salon: s, sesiones: sesionesDe(s.id).filter((x) => !x.tipo).length }));

  return (
    <div ref={raiz}>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Tile valor="9" unidad="horas" nota="de 9 a. m. a 6 p. m." />
        {conteo.map(({ salon, sesiones }) => (
          <Tile key={salon.id} valor={String(sesiones)} unidad="sesiones" nota={salon.rotulo} />
        ))}
      </div>

      {/* Cabecera de salas, pegada arriba mientras se recorre el día. */}
      <div className="sticky top-0 z-20 mt-8 grid grid-cols-[2.6rem_1fr_1fr] gap-x-1.5 bg-night/95 py-3 backdrop-blur sm:grid-cols-[3.4rem_1fr_1fr] sm:gap-x-3">
        <span />
        {SALONES.map((s) => (
          <div key={s.id} className="flex items-center gap-2 sm:gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet text-[11px] font-bold tabular-nums text-white sm:h-9 sm:w-9 sm:text-sm">
              {s.numero}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight tracking-tight sm:text-base">{s.rotulo}</p>
              <p className="hidden truncate text-xs font-light text-white/45 sm:block">{s.claim}</p>
            </div>
          </div>
        ))}
      </div>

      {/* La rejilla del día: una fila por cada quince minutos. */}
      <div
        className="grid grid-cols-[2.6rem_1fr_1fr] gap-x-1.5 sm:grid-cols-[3.4rem_1fr_1fr] sm:gap-x-3"
        style={{ gridTemplateRows: `repeat(${FRANJAS}, minmax(1.15rem, auto))` }}
      >
        {HORAS_EN_PUNTO.map((t, i) => (
          <div
            key={t}
            className="col-start-1 flex items-start justify-end border-t border-white/[0.07] pr-1 pt-1 sm:pr-2"
            style={{ gridRow: `${i * 4 + 1} / ${i * 4 + 5}` }}
          >
            <span className="text-[10px] font-semibold tabular-nums text-white/35 sm:text-xs">
              {String(Math.floor(t / 60)).padStart(2, "0")}:00
            </span>
          </div>
        ))}

        {SALONES.map((salon, col) =>
          sesionesDe(salon.id).map((s) => (
            <Tarjeta key={s.id} sesion={s} columna={col + 2} onAbrir={() => setAbierta(s)} />
          ))
        )}
      </div>

      <p className="mt-6 text-sm font-light text-white/45">
        Toca cualquier sesión para ver el salón por dentro y lo que te llevas de ella.
      </p>

      {abierta ? <Panel sesion={abierta} onCerrar={() => setAbierta(null)} /> : null}
    </div>
  );
}

function Tile({ valor, unidad, nota }: { valor: string; unidad: string; nota: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.03] px-3 py-3 sm:px-5 sm:py-4">
      <p className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums tracking-tighter sm:text-4xl">{valor}</span>
        <span className="text-xs font-light text-white/50 sm:text-sm">{unidad}</span>
      </p>
      <p className="mt-0.5 truncate text-[11px] font-light text-white/40 sm:text-xs">{nota}</p>
    </div>
  );
}

function Tarjeta({ sesion: s, columna, onAbrir }: { sesion: Sesion; columna: number; onAbrir: () => void }) {
  const desde = franjaDe(s.desde);
  const hasta = franjaDe(s.hasta);
  const franjas = hasta - desde;
  const pausa = s.tipo === "pausa" || s.tipo === "bloqueo";
  const estilo = { gridColumn: columna, gridRow: `${desde + 1} / ${hasta + 1}` };

  const base = "m-[2px] flex flex-col overflow-hidden rounded-xl border px-2 py-1.5 text-left sm:rounded-2xl sm:px-3.5 sm:py-2.5";
  const piel = pausa
    ? "justify-center border-dashed border-white/10 bg-white/[0.02]"
    : "border-white/12 bg-gradient-to-br from-violet-shade/85 to-night transition-colors hover:border-violet/60";

  const cuerpo = (
    <>
      <span className={`text-[10px] font-semibold tabular-nums sm:text-[11px] ${pausa ? "text-white/30" : "text-violet-soft"}`}>
        {enReloj(s.desde)}
        <span className="font-light text-white/25"> · {enReloj(s.hasta)}</span>
      </span>
      <span
        className={`mt-0.5 font-semibold leading-tight tracking-tight ${
          pausa ? "text-[11px] text-white/45 sm:text-sm" : "text-[11.5px] sm:text-[15px]"
        }`}
      >
        {s.titulo}
      </span>
      {!pausa && (s.ponente || s.porConfirmar) ? (
        <span className="mt-0.5 truncate text-[10px] font-light text-white/50 sm:text-xs">
          {s.ponente ?? "Por confirmar"}
        </span>
      ) : null}
      {!pausa && franjas >= 4 && s.resumen ? (
        <span className="mt-1 hidden text-xs font-light leading-snug text-white/40 sm:block">{s.resumen}</span>
      ) : null}
    </>
  );

  if (pausa) {
    return (
      <div style={estilo} className={`${base} ${piel}`}>
        {cuerpo}
      </div>
    );
  }

  return (
    <button type="button" onClick={onAbrir} style={estilo} className={`${base} ${piel}`}>
      {cuerpo}
    </button>
  );
}

/**
 * El panel de una sesión: primero el lugar, después el contenido. Está en ese
 * orden a propósito — la pregunta que la gente hace antes de moverse es «¿a
 * cuál salón voy?», y la foto la responde sin leer.
 */
function Panel({ sesion, onCerrar }: { sesion: Sesion; onCerrar: () => void }) {
  const salon = salonDe(sesion.salon);
  const caja = useRef<HTMLDivElement>(null);
  const fondo = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(fondo.current, { opacity: 0, duration: 0.25, ease: "power1.out" });
      gsap.from(caja.current, { opacity: 0, y: 40, scale: 0.98, duration: 0.45, ease: "power3.out" });
      gsap.from(caja.current?.querySelectorAll("[data-linea]") ?? [], {
        opacity: 0, x: -12, duration: 0.4, delay: 0.15, stagger: 0.06, ease: "power2.out",
      });
    });
    return () => mm.revert();
  });

  // Qué pasa al mismo tiempo en la otra sala: esa es la decisión real.
  const enParalelo = SESIONES.filter(
    (s) => s.salon !== sesion.salon && minutos(s.desde) < minutos(sesion.hasta) && minutos(s.hasta) > minutos(sesion.desde)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div ref={fondo} className="absolute inset-0 bg-night/80 backdrop-blur-sm" onClick={onCerrar} />
      <div ref={caja} className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] border border-white/12 bg-night sm:rounded-[28px]">
        <div className="relative h-48 w-full overflow-hidden sm:h-60">
          <Image src={salon.imagen} alt={`Montaje del ${salon.nombre}`} fill sizes="(max-width: 640px) 100vw, 42rem" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-night/10" />
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-night/70 text-white/70 backdrop-blur transition-colors hover:text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-5 right-5 flex items-end gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet text-sm font-bold tabular-nums">{salon.numero}</span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-soft">Escenario</p>
              <p className="truncate text-lg font-semibold tracking-tight">{salon.nombre}</p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 pt-5 md:px-8">
          <div data-linea className="flex flex-wrap gap-2">
            {salon.montaje.map((m) => (
              <span key={m} className="rounded-full border border-white/12 px-3 py-1 text-xs font-light text-white/60">{m}</span>
            ))}
          </div>

          <p data-linea className="mt-5 text-sm font-semibold tabular-nums text-violet-soft">
            {enReloj(sesion.desde)} — {enReloj(sesion.hasta)}
          </p>
          <h3 data-linea className="mt-1.5 text-3xl font-bold leading-tight tracking-tighter">{sesion.titulo}</h3>
          <p data-linea className="mt-2 text-base font-light text-white/60">
            {sesion.ponente ?? "Ponente por confirmar"}
            {sesion.detallePonente ? <span className="text-white/40"> · {sesion.detallePonente}</span> : null}
          </p>

          {sesion.contenido?.length ? (
            <>
              <p data-linea className="mt-7 text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">Qué te llevas</p>
              <ul className="mt-3 flex flex-col gap-3">
                {sesion.contenido.map((c) => (
                  <li data-linea key={c} className="flex gap-3 text-[15px] font-light leading-snug text-white/75">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet" />
                    {c}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {sesion.necesitas ? (
            <p data-linea className="mt-6 rounded-2xl border border-violet/25 bg-violet/10 px-4 py-3 text-sm font-light text-white/75">
              <span className="font-semibold text-white">Trae contigo: </span>
              {sesion.necesitas}
            </p>
          ) : null}

          {enParalelo.length ? (
            <>
              <p data-linea className="mt-8 text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">
                A esa hora, en {salonDe(enParalelo[0].salon).rotulo}
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                {enParalelo.map((s) => (
                  <p data-linea key={s.id} className="text-sm font-light text-white/55">
                    <span className="tabular-nums text-white/40">{enReloj(s.desde)}</span> · {s.titulo}
                  </p>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
