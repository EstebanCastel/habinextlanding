"use client";

import Image from "next/image";
import Link from "next/link";
import type { Vista } from "@/lib/experiencia";

/**
 * Todo lo que se hace en la experiencia, en una sola rejilla.
 *
 * Antes había tres sitios: una fila de botones pequeños, las tarjetas de las
 * tres experiencias y una tarjeta grande suelta para la agenda. Tres formas
 * distintas de decir «entra acá» en la misma pantalla, y la gente bajaba
 * buscando la que necesitaba.
 *
 * Ahora es una sola gramática: imagen, título, una línea de qué hay dentro y
 * la flecha. Lo del día del evento va primero —el QR, la agenda, el almuerzo—
 * y lo de los días previos, que da puntos, va después con su avance.
 *
 * El del almuerzo solo sale para quien tiene entrada VIP, y se destaca
 * mientras no haya escogido turno: lo que mueve a alguien a tocarlo es ver
 * que le falta, no que exista.
 */

type Tarjeta = {
  href: string;
  rotulo: string;
  nota: string;
  imagen: string;
  /** Lo pinta en morado: es lo que a esta persona le falta hacer. */
  urgente?: boolean;
  /** Cerrada, con el motivo. */
  cerrada?: string;
  /** Avance en puntos, para las tres experiencias. */
  puntos?: { hechos: number; posibles: number };
};

export default function Accesos({
  yo,
  experiencias,
  alPedirEntrada,
}: {
  yo: Vista | null;
  experiencias: Tarjeta[];
  alPedirEntrada: (destino: string) => void;
}) {
  const esVip = yo?.registro?.tier === "vip";
  const conAlmuerzo = Boolean(yo?.almuerzo);
  const talleres = yo?.talleres?.length ?? 0;

  const delDia: Tarjeta[] = [
    {
      href: "/experiencia/carnet",
      rotulo: "Mi entrada",
      nota: yo ? "Tu QR para la puerta y tu carnet" : "Entra para ver tu QR",
      imagen: "/img/evento/senalizacion.jpg",
      // Solo urge si todavía no ha entrado: a quien ya tiene su QR a la vista
      // decirle «te falta» es mentirle.
      urgente: !yo,
    },
    {
      href: "/experiencia/agenda",
      rotulo: "La agenda",
      nota: "Dos salones, un día entero. Con lo que te llevas de cada sesión.",
      imagen: "/img/escenario-inspira.webp",
    },
    {
      href: "/experiencia/agenda#taller",
      rotulo: "Mis talleres",
      nota: talleres
        ? `${talleres} ${talleres === 1 ? "reservado" : "reservados"} · tu QR de cada uno`
        : "El Salón Taller tiene cupo. Reserva tu puesto.",
      imagen: "/img/escenario-taller.webp",
      urgente: talleres === 0,
    },
    ...(esVip
      ? [
          {
            href: "/experiencia/agenda#almuerzo",
            rotulo: "Mi almuerzo",
            nota: conAlmuerzo ? "Turno escogido · tu pase del restaurante" : "Son tres turnos. Escoge el tuyo.",
            imagen: "/img/evento/stand-marcas.jpg",
            urgente: !conAlmuerzo,
          } as Tarjeta,
        ]
      : []),
    {
      href: "/experiencia/preguntas",
      rotulo: "Preguntas",
      nota: "Cómo llegar, a qué hora abre, qué llevar.",
      imagen: "/img/evento/totem-cubos.jpg",
    },
  ];

  return (
    <>
      <Rejilla tarjetas={delDia} yo={yo} alPedirEntrada={alPedirEntrada} />
      {experiencias.length ? (
        <section className="mt-10">
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
            Suma puntos para el ranking
          </p>
          <Rejilla tarjetas={experiencias} yo={yo} alPedirEntrada={alPedirEntrada} />
        </section>
      ) : null}
    </>
  );
}

function Rejilla({
  tarjetas,
  yo,
  alPedirEntrada,
}: {
  tarjetas: Tarjeta[];
  yo: Vista | null;
  alPedirEntrada: (destino: string) => void;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tarjetas.map((t) => {
        const contenido = (
          <>
            <span className="relative block aspect-[16/9] overflow-hidden sm:aspect-[5/3]">
              <Image
                src={t.imagen}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className={`object-cover transition-transform duration-500 ${
                  t.cerrada ? "saturate-[0.3] brightness-[0.55]" : "group-hover:scale-[1.04]"
                }`}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-transparent" />
              {t.cerrada ? (
                <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-night/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/80 backdrop-blur">
                  Cerrada
                </span>
              ) : t.urgente ? (
                <span className="absolute right-3 top-3 rounded-full bg-violet px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white">
                  Te falta
                </span>
              ) : null}
            </span>

            <span className="flex flex-1 flex-col gap-2 p-5">
              <span className="text-xl font-semibold leading-tight tracking-tight text-white">{t.rotulo}</span>
              <span className="text-sm font-light leading-relaxed text-white/55">{t.cerrada ?? t.nota}</span>

              {t.puntos ? (
                <span className="mt-auto block pt-3">
                  <span className="flex items-baseline justify-between text-xs">
                    <span className="text-white/45">{t.cerrada ? "En espera" : yo ? "Llevas" : "En juego"}</span>
                    <span className={`font-semibold tabular-nums ${t.cerrada ? "text-white/40" : "text-violet-soft"}`}>
                      {yo && !t.cerrada ? `${t.puntos.hechos} / ${t.puntos.posibles}` : t.puntos.posibles} pts
                    </span>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-violet"
                      style={{
                        width: t.cerrada
                          ? "0%"
                          : `${t.puntos.posibles ? Math.round((t.puntos.hechos / t.puntos.posibles) * 100) : 0}%`,
                      }}
                    />
                  </span>
                </span>
              ) : null}

              {!t.cerrada ? (
                <span className={`inline-flex items-center gap-2 text-sm font-semibold text-white ${t.puntos ? "mt-3" : "mt-auto pt-2"}`}>
                  Entrar
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              ) : null}
            </span>
          </>
        );

        const base =
          "group flex h-full flex-col overflow-hidden rounded-[22px] border bg-ink text-left focus-visible:outline-none";
        const vivas = `${base} transition-colors ${
          t.urgente ? "border-violet/55 hover:border-violet" : "border-white/12 hover:border-violet/60"
        }`;

        return (
          <li key={t.href + t.rotulo}>
            {t.cerrada ? (
              <div className={`${base} cursor-not-allowed border-white/10`} aria-disabled="true">
                {contenido}
              </div>
            ) : yo ? (
              <Link href={t.href} className={vivas}>
                {contenido}
              </Link>
            ) : (
              <button type="button" onClick={() => alPedirEntrada(t.href)} className={`${vivas} w-full`}>
                {contenido}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
