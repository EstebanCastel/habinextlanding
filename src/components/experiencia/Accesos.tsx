"use client";

import Image from "next/image";
import Link from "next/link";
import { ARTICULOS } from "@/config/tienda";
import type { Vista } from "@/lib/experiencia";

/**
 * Todo lo que se hace en la experiencia, en una sola rejilla.
 *
 * Antes había tres sitios distintos diciendo «entra acá» en la misma pantalla:
 * una fila de botones, las tarjetas de las tres experiencias y una tarjeta
 * suelta para la agenda. Y «Tu carnet» salía dos veces, arriba como acceso y
 * abajo como experiencia.
 *
 * Ahora es una sola gramática y cada cosa aparece una vez. Las tarjetas son
 * deliberadamente pequeñas —dos por fila en el teléfono— porque son ocho y lo
 * que importa es verlas todas sin bajar, no que cada una luzca.
 *
 * Lo que da puntos los muestra en su propia tarjeta. El almuerzo solo sale
 * para VIP, y lo que a esta persona le falta va marcado: lo que mueve a
 * alguien a tocar algo es ver que le falta, no que exista.
 */

export type Tarjeta = {
  href: string;
  rotulo: string;
  nota: string;
  imagen: string;
  /** Lo pinta en morado: es lo que a esta persona le falta hacer. */
  urgente?: boolean;
  /** Cerrada, con el motivo. */
  cerrada?: string;
  /** Avance en puntos, para lo que da puntos. */
  puntos?: { hechos: number; posibles: number };
};

export default function Accesos({
  yo,
  experiencias,
  alPedirEntrada,
}: {
  yo: Vista | null;
  /** Las que dan puntos, ya resueltas por la portada: carnet, mapa y redes. */
  experiencias: Record<string, Tarjeta>;
  alPedirEntrada: (destino: string) => void;
}) {
  const esVip = yo?.registro?.tier === "vip";
  const conAlmuerzo = Boolean(yo?.almuerzo);
  const talleres = yo?.talleres?.length ?? 0;
  const carnet = experiencias.carnet;
  const puntos = yo?.puntos ?? 0;
  const alcanza = yo ? ARTICULOS.filter((a) => !a.agotado && a.puntos > 0 && a.puntos <= puntos).length : 0;

  const tarjetas: Tarjeta[] = [
    // «Mi entrada» y «Tu carnet» eran la misma pantalla con dos nombres: van
    // juntas, con los puntos del carnet.
    {
      href: "/experiencia/carnet",
      rotulo: "Mi entrada",
      nota: yo ? "Tu QR para la puerta y tu carnet" : "Entra para ver tu QR",
      imagen: carnet?.imagen ?? "/img/evento/senalizacion.jpg",
      urgente: !yo,
      ...(carnet?.puntos ? { puntos: carnet.puntos } : {}),
    },
    { href: "/experiencia/agenda", rotulo: "La agenda", nota: "Dos salones, un día entero", imagen: "/img/escenario-inspira.webp" },
    {
      href: "/experiencia/agenda#taller",
      rotulo: "Mis talleres",
      nota: talleres ? `${talleres} ${talleres === 1 ? "reservado" : "reservados"}` : "El cupo es limitado",
      imagen: "/img/escenario-taller.webp",
      urgente: Boolean(yo) && talleres === 0,
    },
    ...(esVip
      ? [
          {
            href: "/experiencia/almuerzo",
            rotulo: "Mi almuerzo",
            nota: conAlmuerzo ? "Turno escogido · tu pase" : "Son tres turnos",
            imagen: "/img/evento/stand-marcas.jpg",
            urgente: !conAlmuerzo,
          } as Tarjeta,
        ]
      : []),
    ...(experiencias.mapa ? [experiencias.mapa] : []),
    ...(experiencias.redes ? [experiencias.redes] : []),
    // La tienda va después de lo que da puntos: primero se ve cómo se ganan
    // y enseguida para qué sirven. Antes los puntos no compraban nada visible.
    // Una sola tarjeta: el podio y la tienda son la misma pregunta.
    {
      href: "/experiencia/tienda",
      rotulo: "Podio y tienda",
      nota: alcanza ? `Ya alcanzas ${alcanza === 1 ? "1 artículo" : `${alcanza} artículos`}` : "Quién gana y qué se canjea",
      imagen: "/img/evento/podio.jpg",
      urgente: alcanza > 0,
    },
    { href: "/experiencia/preguntas", rotulo: "Preguntas", nota: "Cómo llegar y qué llevar", imagen: "/img/evento/totem-cubos.jpg" },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {tarjetas.map((t) => {
        const contenido = (
          <>
            <span className="relative block aspect-[4/3] overflow-hidden">
              <Image
                src={t.imagen}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className={`object-cover transition-transform duration-500 ${
                  t.cerrada ? "saturate-[0.3] brightness-[0.55]" : "group-hover:scale-[1.05]"
                }`}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
              {t.cerrada ? (
                <span className="absolute right-2 top-2 rounded-full border border-white/20 bg-night/75 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/80 backdrop-blur">
                  Cerrada
                </span>
              ) : t.urgente ? (
                <span className="absolute right-2 top-2 rounded-full bg-violet px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                  Te falta
                </span>
              ) : null}
            </span>

            <span className="flex flex-1 flex-col gap-1 p-3.5 sm:p-4">
              <span className="text-base font-semibold leading-tight tracking-tight text-white sm:text-[1.05rem]">
                {t.rotulo}
              </span>
              <span className="text-xs font-light leading-snug text-white/50">{t.cerrada ?? t.nota}</span>

              {t.puntos ? (
                <span className="mt-auto block pt-2.5">
                  <span className="mb-1 flex items-baseline justify-between text-[11px]">
                    <span className="text-white/40">{t.cerrada ? "En espera" : yo ? "Llevas" : "En juego"}</span>
                    <span className={`font-semibold tabular-nums ${t.cerrada ? "text-white/40" : "text-violet-soft"}`}>
                      {yo && !t.cerrada ? `${t.puntos.hechos}/${t.puntos.posibles}` : t.puntos.posibles} pts
                    </span>
                  </span>
                  <span className="block h-1 overflow-hidden rounded-full bg-white/10">
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
            </span>
          </>
        );

        const base = "group flex h-full flex-col overflow-hidden rounded-2xl border bg-ink text-left focus-visible:outline-none";
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
