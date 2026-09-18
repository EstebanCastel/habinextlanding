/**
 * Fuente única de verdad del evento. Todo lo que cambia entre etapas de
 * boletería o al confirmarse la sede se edita aquí, no en las secciones.
 */

export const EVENT = {
  name: "Habi Next",
  /**
   * Nombre completo del evento. La edición es de país, aunque se realice en
   * Bogotá: donde se *nombra* el evento va este valor, y `city` queda solo
   * para lo que es ubicación (la sede, el domicilio del schema, el dato del
   * pie del hero).
   */
  fullName: "Habi Next Colombia",
  city: "Bogotá",
  country: "Colombia",
  /** Fecha oficial confirmada: martes 20 de octubre de 2026, hora Colombia. */
  startsAt: "2026-10-20T08:00:00-05:00",
  dateLong: "Martes 20 de octubre de 2026",
  dateShort: "20 de octubre",
  /** Sede confirmada (4 sep 2026). */
  venue: "Centro de Convenciones Avenida 68",
  /**
   * Domicilio del recinto. Solo alimenta el schema.org del evento; si queda
   * vacío, el dato de ubicación se limita a la ciudad.
   */
  venueAddress: "",
  /** Se usa como respaldo si `venue` se vacía entre ediciones del evento. */
  venueLabel: "Sede por confirmar",
  durationLabel: "Un día completo",
} as const;

/**
 * El CTA de patrocinios abre WhatsApp con el mensaje ya escrito.
 *
 * Un `mailto:` obliga a redactar un correo desde cero, y en el celular —que es
 * de donde llegan 8 de cada 10 visitas— muchas veces ni siquiera abre nada.
 * Con el mensaje puesto, a quien le interesa solo le queda darle enviar.
 *
 * El texto se escribe en claro y se codifica acá: dejarlo escapado a mano en la
 * URL lo vuelve ilegible y cualquiera que lo edite después rompe el enlace.
 */
function whatsappPatrocinios(): string {
  const numero = "573043342330";
  const mensaje = "Hola, quiero ser patrocinador del evento Habi Next";
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * El registro se hace en Luma, uno por tipo de entrada. Los dos eventos tienen
 * aprobación obligatoria: quien se registra queda pendiente y recibe por
 * WhatsApp su link de pago; el cupo se aprueba —y Luma manda la entrada con el
 * QR— solo cuando el pago está confirmado. Ese recorrido vive en `/webhook`,
 * `/p/[token]` y `/admin`.
 *
 * Se leen de variables de entorno para poder cambiarlos sin tocar código; los
 * valores por defecto son los eventos reales de octubre de 2026.
 */
export const LINKS = {
  general: process.env.NEXT_PUBLIC_LUMA_GENERAL || "https://luma.com/habinext-general",
  vip: process.env.NEXT_PUBLIC_LUMA_VIP || "https://luma.com/habinext-vip",
  sponsors: process.env.NEXT_PUBLIC_SPONSOR_URL || whatsappPatrocinios(),
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
        until: "2026-10-05T23:59:59-05:00",
        note: "Hasta el 5 de octubre",
      },
      {
        id: "etapa-2",
        label: "Etapa 2",
        price: "$290.000",
        until: "2026-10-16T23:59:59-05:00",
        note: "Hasta el 16 de octubre",
      },
      {
        id: "final",
        label: "Tarifa final",
        // El precio del día del evento no está definido todavía: mientras
        // tanto se anuncia como venta en taquilla. Cuando exista, va acá.
        price: "En taquilla",
        until: null,
        note: "El día del evento",
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
        until: "2026-10-05T23:59:59-05:00",
        note: "Hasta el 5 de octubre",
      },
      {
        id: "etapa-2",
        label: "Etapa 2",
        price: "$450.000",
        until: "2026-10-16T23:59:59-05:00",
        note: "Hasta el 16 de octubre",
      },
      {
        id: "final",
        label: "Tarifa final",
        price: "En taquilla",
        until: null,
        note: "El día del evento",
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

/**
 * Una etapa puede anunciarse sin precio ("En taquilla"). Esta función dice si
 * el precio es una cifra con la que se puede calcular.
 */
export function precioNumerico(price: string): number | null {
  const n = Number(price.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Índice de la etapa vigente según la fecha dada. */
export function activeStageIndex(stages: Stage[], now: Date): number {
  const found = stages.findIndex((s) => s.until !== null && now.getTime() <= new Date(s.until).getTime());
  return found === -1 ? stages.length - 1 : found;
}
