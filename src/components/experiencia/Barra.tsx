import Link from "next/link";
import { PUNTOS_TOTALES } from "@/config/experiencia";
import { proximo, salonDe } from "@/config/agenda";
import type { Vista } from "@/lib/experiencia";

/**
 * La barra fija de la experiencia: a la izquierda, qué viene en el evento;
 * a la derecha, los puntos. Va pegada arriba en todas las pantallas, como
 * el reloj de un celular: siempre se sabe cuánto falta y cuánto se lleva.
 * Tocar el evento abre la agenda; tocar los puntos, la portada.
 */
export default function Barra({ yo }: { yo: Vista | null }) {
  const p = proximo();
  let evento: string;
  let detalle: string | null = null;
  if (p.tipo === "antes") {
    evento = p.dias === 1 ? "Mañana es Habi Next" : `Faltan ${p.dias} días`;
    detalle = "20 de octubre · Av. 68";
  } else if (p.tipo === "hoy") {
    evento = p.sesion ? (p.arranca ? `Arranca: ${p.sesion.titulo}` : `Sigue: ${p.sesion.titulo}`) : "Hoy es Habi Next";
    detalle = p.sesion ? salonDe(p.sesion.salon).rotulo : null;
  } else {
    evento = "Gracias por venir a Habi Next";
  }

  const puntos = yo?.puntos ?? 0;
  const pct = Math.min(100, Math.round((puntos / PUNTOS_TOTALES) * 100));

  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-night/90 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between gap-3 px-5 sm:px-8 md:px-14 lg:px-20">
        <Link href="/experiencia/agenda" className="group flex min-w-0 items-center gap-2.5 text-white/80 transition-colors hover:text-white">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-violet-soft" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
            <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
          </svg>
          <span className="truncate text-[13px] font-semibold tracking-tight sm:text-sm">{evento}</span>
          {detalle ? <span className="hidden truncate text-xs font-light text-white/45 sm:inline">· {detalle}</span> : null}
        </Link>

        {yo ? (
          <Link href="/experiencia" className="flex shrink-0 items-center gap-2.5 text-white/80 transition-colors hover:text-white" aria-label={`${puntos} de ${PUNTOS_TOTALES} puntos`}>
            <span className="text-[13px] font-semibold tabular-nums tracking-tight sm:text-sm">
              {puntos}
              <span className="font-light text-white/45"> / {PUNTOS_TOTALES} pts</span>
            </span>
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10 sm:w-28" aria-hidden="true">
              <span className="block h-full rounded-full bg-violet" style={{ width: `${pct}%` }} />
            </span>
          </Link>
        ) : (
          <Link href="/experiencia?entrar=%2Fexperiencia" className="shrink-0 text-[13px] font-semibold text-violet-soft transition-colors hover:text-white sm:text-sm">
            Entra y suma puntos
          </Link>
        )}
      </div>
    </div>
  );
}
