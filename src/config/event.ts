/**
 * Fuente única de verdad del evento. Todo lo que cambia entre etapas de
 * boletería o al confirmarse la sede se edita aquí, no en las secciones.
 */

export const EVENT = {
  name: "Habi Next",
  city: "Bogotá",
  /** Fecha oficial confirmada: martes 20 de octubre de 2026, hora Colombia. */
  startsAt: "2026-10-20T08:00:00-05:00",
  dateLong: "Martes 20 de octubre de 2026",
  dateShort: "20 de octubre",
  /** Pendiente de confirmar: al tenerla, reemplazar por el nombre del recinto. */
  venue: "",
  venueLabel: "Sede por confirmar",
  durationLabel: "Un día completo",
} as const;

/**
 * La venta se hace en Luma. Se configuran por variable de entorno para poder
 * cambiar el link sin tocar código; los valores por defecto son placeholders.
 */
export const LINKS = {
  general: process.env.NEXT_PUBLIC_LUMA_GENERAL || "https://lu.ma/habinext",
  vip: process.env.NEXT_PUBLIC_LUMA_VIP || "https://lu.ma/habinext-vip",
  sponsors: process.env.NEXT_PUBLIC_SPONSOR_URL || "mailto:habinext@habi.co",
} as const;

export type Stage = {
  id: string;
  label: string;
  price: string;
  /** Último instante en el que la etapa sigue vigente. */
  until: string | null;
  note: string;
};

export type Ticket = {
  id: "general" | "vip";
  name: string;
  claim: string;
  href: string;
  cta: string;
  featured: boolean;
  stages: Stage[];
  includesTitle: string;
  includes: string[];
  footnote?: string;
};

export const TICKETS: Ticket[] = [
  {
    id: "general",
    name: "General",
    claim: "Acceso completo a Habi Next.",
    href: LINKS.general,
    cta: "Comprar General",
    featured: false,
    stages: [
      {
        id: "preventa",
        label: "Preventa",
        price: "$190.000",
        until: "2026-09-17T23:59:59-05:00",
        note: "Hasta el 17 de septiembre",
      },
      {
        id: "etapa-1",
        label: "Etapa 1",
        price: "$220.000",
        until: "2026-09-30T23:59:59-05:00",
        note: "Hasta el 30 de septiembre",
      },
      {
        id: "etapa-2",
        label: "Etapa 2",
        price: "$290.000",
        until: null,
        note: "Hasta agotar boletería",
      },
    ],
    includesTitle: "Incluye",
    includes: [
      "Evento y talleres",
      "Experiencia práctica",
      "Kit oficial Habi Next",
      "Acceso a las experiencias del evento",
    ],
  },
  {
    id: "vip",
    name: "VIP",
    claim: "Vive Habi Next con una experiencia preferencial.",
    href: LINKS.vip,
    cta: "Quiero ser VIP",
    featured: true,
    stages: [
      {
        id: "preventa",
        label: "Preventa",
        price: "$290.000",
        until: "2026-09-17T23:59:59-05:00",
        note: "Hasta el 17 de septiembre",
      },
      {
        id: "etapa-1",
        label: "Etapa 1",
        price: "$350.000",
        until: "2026-09-30T23:59:59-05:00",
        note: "Hasta el 30 de septiembre",
      },
      {
        id: "etapa-2",
        label: "Etapa 2",
        price: "$450.000",
        until: null,
        note: "Hasta agotar boletería",
      },
    ],
    includesTitle: "Todo lo de General, más",
    includes: [
      "Ubicación preferencial en primeras filas",
      "Kit premium Habi Next",
      "Material y guías exclusivas",
      "Acceso a zona VIP",
      "Barra de snacks y bebidas exclusiva",
      "Almuerzo",
      "Crea tu avatar digital (cupos limitados)",
    ],
    footnote: "Solo 250 cupos VIP. Es posible que se agoten antes de cerrar la etapa.",
  },
];

/** Índice de la etapa vigente según la fecha dada. */
export function activeStageIndex(stages: Stage[], now: Date): number {
  const found = stages.findIndex((s) => s.until !== null && now.getTime() <= new Date(s.until).getTime());
  return found === -1 ? stages.length - 1 : found;
}
