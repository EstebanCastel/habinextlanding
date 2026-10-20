"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { enCurso, type EnCurso } from "@/config/agenda";

/**
 * Lo que está pasando ahora mismo, en la barra de arriba.
 *
 * El día del evento la pregunta deja de ser «cuántos días faltan» y pasa a
 * ser «¿a dónde entro ahora?». Los dos salones corren en paralelo todo el
 * día, así que la barra muestra los dos: quien va por una charla de Inspira
 * necesita saber que en el Taller ya arrancó la suya.
 *
 * Se recalcula cada treinta segundos con la hora de Bogotá —no con el reloj
 * del teléfono, que en un recinto con mala señal se desfasa— y por eso es un
 * componente de cliente: pintado en el servidor se quedaría congelado en la
 * sesión de las nueve toda la mañana.
 */

function hora12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const doce = h % 12 === 0 ? 12 : h % 12;
  return `${doce}:${String(m).padStart(2, "0")}`;
}

export default function EnVivo() {
  // El primer render tiene que coincidir con el del servidor o React protesta
  // por la hidratación: arranca vacío y se llena en cuanto monta.
  const [salas, setSalas] = useState<EnCurso[] | null>(null);

  useEffect(() => {
    const tic = () => setSalas(enCurso(new Date()));
    tic();
    const id = setInterval(tic, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!salas) {
    return <span className="truncate text-[13px] font-semibold tracking-tight sm:text-sm">Hoy es Habi Next</span>;
  }

  const vivas = salas.filter((s) => s.ahora);

  // Antes de que arranque el primer salón, o después del cierre.
  if (!vivas.length) {
    const siguiente = salas.map((s) => s.sigue).filter(Boolean)[0];
    return (
      <span className="truncate text-[13px] font-semibold tracking-tight sm:text-sm">
        {siguiente ? `A las ${hora12(siguiente.desde!)} · ${siguiente.titulo}` : "Gracias por venir a Habi Next"}
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-violet" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-soft">Ahora</span>
      </span>

      <span className="flex min-w-0 items-center gap-2 text-[13px] sm:text-sm">
        {vivas.map((s, i) => (
          <span key={s.salon.id} className="flex min-w-0 items-center gap-1.5">
            {i > 0 ? <span className="text-white/20">·</span> : null}
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
              {s.salon.rotulo}
            </span>
            <span className="truncate font-semibold tracking-tight">{s.ahora!.titulo}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * La misma información, en grande, para la portada de la experiencia: las dos
 * salas una debajo de la otra con lo que corre y lo que sigue.
 */
export function Salas() {
  const [salas, setSalas] = useState<EnCurso[] | null>(null);

  useEffect(() => {
    const tic = () => setSalas(enCurso(new Date()));
    tic();
    const id = setInterval(tic, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!salas || !salas.some((s) => s.ahora)) return null;

  return (
    <section aria-label="Lo que está pasando ahora" className="grid gap-3 sm:grid-cols-2">
      {salas.map((s) => (
        <Link
          key={s.salon.id}
          href="/experiencia/agenda"
          className="flex flex-col rounded-2xl border border-violet/30 bg-violet/[0.07] p-4 transition-colors hover:border-violet/60"
        >
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-soft">
              Salón {s.salon.numero} · {s.salon.rotulo}
            </span>
          </span>
          <span className="mt-2 text-base font-semibold leading-tight tracking-tight text-white">
            {s.ahora ? s.ahora.titulo : "Sala libre"}
          </span>
          {s.ahora?.ponente ? (
            <span className="mt-0.5 text-sm font-light text-white/55">{s.ahora.ponente}</span>
          ) : null}
          {s.sigue ? (
            <span className="mt-3 text-xs font-light text-white/40">
              A las {hora12(s.sigue.desde!)} · {s.sigue.titulo}
            </span>
          ) : null}
        </Link>
      ))}
    </section>
  );
}
