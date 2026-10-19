"use client";

import Link from "next/link";
import type { Vista } from "@/lib/experiencia";

/**
 * Los accesos del día del evento, arriba de todo.
 *
 * La experiencia está armada para los días previos —el carnet, los puntos, el
 * podio— pero el 20 de octubre la gente llega con el teléfono en una mano
 * buscando una de cinco cosas: su QR, la agenda, su almuerzo, su taller o un
 * teléfono al que escribir. Antes todo eso estaba repartido entre tarjetas
 * grandes y había que bajar; acá está en el primer pantallazo.
 *
 * Son cuadrados grandes a propósito: se tocan de pie, con una mano y a veces
 * con la pantalla a medio ver por el sol.
 *
 * El del almuerzo solo sale para quien tiene entrada VIP, y cambia de texto
 * según si ya escogió turno: lo que mueve a alguien a tocarlo es ver que le
 * falta, no que exista.
 */

type Acceso = {
  href: string;
  rotulo: string;
  nota: string;
  icono: React.ReactNode;
  destaca?: boolean;
};

const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const Qr = (
  <svg viewBox="0 0 24 24" {...trazo} aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1" />
  </svg>
);
const Reloj = (
  <svg viewBox="0 0 24 24" {...trazo} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 2" />
  </svg>
);
const Plato = (
  <svg viewBox="0 0 24 24" {...trazo} aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);
const Mesa = (
  <svg viewBox="0 0 24 24" {...trazo} aria-hidden="true">
    <rect x="3" y="4.5" width="18" height="11" rx="1.6" />
    <path d="M8 19.5h8M12 15.5v4" />
  </svg>
);
const Duda = (
  <svg viewBox="0 0 24 24" {...trazo} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.4 9.3a2.7 2.7 0 1 1 3.4 2.6c-.6.2-.9.7-.9 1.3v.4" />
    <path d="M12 17h.01" />
  </svg>
);
const Mapa = (
  <svg viewBox="0 0 24 24" {...trazo} aria-hidden="true">
    <path d="M9 4.5 3.5 6.8v12.7L9 17.2l6 2.3 5.5-2.3V4.5L15 6.8z" />
    <path d="M9 4.5v12.7M15 6.8v12.7" />
  </svg>
);

export default function Accesos({ yo }: { yo: Vista | null }) {
  const esVip = yo?.registro?.tier === "vip";
  const conAlmuerzo = Boolean(yo?.almuerzo);
  const talleres = yo?.talleres?.length ?? 0;

  const accesos: Acceso[] = [
    {
      href: "/experiencia/carnet",
      rotulo: "Mi entrada",
      nota: yo ? "Tu QR y tu carnet" : "Entra para verla",
      icono: Qr,
      destaca: true,
    },
    { href: "/experiencia/agenda", rotulo: "La agenda", nota: "Dos salones, todo el día", icono: Reloj },
    {
      href: "/experiencia/agenda#taller",
      rotulo: "Mis talleres",
      nota: talleres ? `${talleres} ${talleres === 1 ? "reservado" : "reservados"}` : "Reserva tu puesto",
      icono: Mesa,
    },
    ...(esVip
      ? [
          {
            href: "/experiencia/agenda#almuerzo",
            rotulo: "Mi almuerzo",
            nota: conAlmuerzo ? "Turno escogido" : "Escoge tu turno",
            icono: Plato,
            destaca: !conAlmuerzo,
          } as Acceso,
        ]
      : []),
    { href: "/experiencia/mapa", rotulo: "El mapa", nota: "Cómo llegar y moverse", icono: Mapa },
    { href: "/experiencia/preguntas", rotulo: "Preguntas", nota: "Lo que todos preguntan", icono: Duda },
  ];

  return (
    <nav aria-label="Accesos del día" className="mb-10">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {accesos.map((a) => (
          <li key={a.href}>
            <Link
              href={a.href}
              className={`flex h-full flex-col gap-2.5 rounded-2xl border p-4 transition-colors ${
                a.destaca
                  ? "border-violet/55 bg-violet/[0.13] hover:border-violet hover:bg-violet/20"
                  : "border-white/12 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.07]"
              }`}
            >
              <span className={`size-7 ${a.destaca ? "text-violet-soft" : "text-white/55"}`}>{a.icono}</span>
              <span className="text-base font-semibold leading-tight text-white">{a.rotulo}</span>
              <span className="text-xs font-light leading-snug text-white/50">{a.nota}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
