import { EVENT } from "./event";

/**
 * La experiencia del asistente (`/experiencia`): su carnet y una serie de
 * misiones que lo llevan a contar Habi Next en sus redes.
 *
 * Qué se busca con cada misión está escrito al lado. Lo que no está acá es el
 * cómo: la mecánica vive en `src/lib/experiencia.ts` y las pantallas en
 * `src/components/experiencia/`. Este archivo es lo que se toca para cambiar
 * un texto, un puntaje o el premio.
 */

export type Fase = "antes" | "evento";
export type Red = "linkedin" | "instagram" | "whatsapp";

export type MisionId =
  | "carnet"
  | "linkedin_voy"
  | "instagram_voy"
  | "invitar"
  | "fotos"
  | "linkedin_fotos"
  | "instagram_fotos"
  | "frase";

export type Mision = {
  id: MisionId;
  /** Antes del evento se promueve la asistencia; el día del evento, lo vivido. */
  fase: Fase;
  titulo: string;
  resumen: string;
  puntos: number;
  red?: Red;
};

export const MISIONES: Mision[] = [
  {
    id: "carnet",
    fase: "antes",
    titulo: "Crea tu carnet",
    resumen: "Tu foto, tu nombre y el sello de Habi Next Colombia.",
    puntos: 10,
  },
  {
    id: "linkedin_voy",
    fase: "antes",
    titulo: "Cuéntalo en LinkedIn",
    resumen: "Publica que vas, con tu carnet y el texto listo. Un clic.",
    puntos: 20,
    red: "linkedin",
  },
  {
    id: "instagram_voy",
    fase: "antes",
    titulo: "Súbelo a tus historias",
    resumen: "Tu carnet en formato vertical, directo a Instagram.",
    puntos: 15,
    red: "instagram",
  },
  {
    id: "invitar",
    fase: "antes",
    titulo: "Invita a un colega",
    resumen: "Tu link personal por WhatsApp. Te contamos cuántos lo abren.",
    puntos: 10,
    red: "whatsapp",
  },
  {
    id: "fotos",
    fase: "evento",
    titulo: "Sube tus fotos del evento",
    resumen: "Todas las que te tomaste en Habi Next. Quedan listas para publicar.",
    puntos: 10,
  },
  {
    id: "linkedin_fotos",
    fase: "evento",
    titulo: "Tu Habi Next en LinkedIn",
    resumen: "Hasta nueve fotos con un texto ya escrito. Solo publicar.",
    puntos: 25,
    red: "linkedin",
  },
  {
    id: "instagram_fotos",
    fase: "evento",
    titulo: "Tus fotos en Instagram",
    resumen: "Elige las mejores y compártelas con el texto copiado.",
    puntos: 20,
    red: "instagram",
  },
  {
    id: "frase",
    fase: "evento",
    titulo: "Lo que te llevas",
    resumen: "Una frase tuya, convertida en una pieza para compartir.",
    puntos: 15,
  },
];

export const PUNTOS_TOTALES = MISIONES.reduce((s, m) => s + m.puntos, 0);

/** Los niveles se alcanzan por puntos; el último exige completar todo. */
export const NIVELES = [
  { desde: 0, nombre: "Asistente" },
  { desde: 40, nombre: "Embajador" },
  { desde: PUNTOS_TOTALES, nombre: "Voz de Habi Next" },
];

/**
 * El premio se anuncia acá. Está escrito para no prometer algo concreto hasta
 * que el equipo defina qué se entrega y a cuántos.
 */
export const PREMIO = {
  titulo: "Cada misión suma puntos",
  detalle:
    "Quienes más compartan Habi Next se llevan una sorpresa el día del evento. El ranking se cierra el 20 de octubre a medianoche.",
};

export const LIMITES = {
  /** Fotos por persona. Es lo que cabe en dos o tres publicaciones. */
  fotos: 30,
  /** Por archivo, ya reducido en el navegador antes de subir. */
  bytesPorArchivo: 6 * 1024 * 1024,
  /** LinkedIn admite hasta 20 imágenes por publicación; nueve se ven bien. */
  fotosPorPublicacion: 9,
  frase: 160,
};

const HASHTAGS = "#HabiNext #InteligenciaArtificial #Inmobiliario";

/**
 * Los textos salen escritos en primera persona y ya listos: la evidencia de
 * otros eventos es que un texto pensado para esa persona se comparte dos o
 * tres veces más que un enlace pelado. Todos se pueden editar antes de
 * publicar.
 */
export function textoVoy(tier?: "general" | "vip"): string {
  const como = tier === "vip" ? "Voy como VIP a" : "Voy a";
  return [
    `${como} ${EVENT.fullName}.`,
    "",
    `El ${EVENT.dateShort}, en ${EVENT.city}, un día completo para aprender a usar Inteligencia Artificial en el negocio inmobiliario: atraer más clientes, crear contenido, organizar oportunidades y construir un asistente que trabaje 24/7.`,
    "",
    "El agente inmobiliario del futuro no trabajará solo. Nos vemos allá.",
    "",
    "Entradas en habinext.com",
    "",
    HASHTAGS,
  ].join("\n");
}

export function textoFotos(): string {
  return [
    `Así viví ${EVENT.fullName}.`,
    "",
    `Un día en ${EVENT.city} aprendiendo a usar Inteligencia Artificial en el negocio inmobiliario, con la gente que está construyendo lo que viene.`,
    "",
    "Gracias a Habi por el espacio. Lo que aprendí ya lo estoy aplicando.",
    "",
    HASHTAGS,
  ].join("\n");
}

export function textoFrase(frase: string): string {
  return [
    `Lo que me llevo de ${EVENT.fullName}:`,
    "",
    `«${frase.trim()}»`,
    "",
    `Un día en ${EVENT.city}, con Habi, aprendiendo a usar Inteligencia Artificial en el negocio inmobiliario.`,
    "",
    HASHTAGS,
  ].join("\n");
}

/** Lo que va en el WhatsApp de invitación. Corto: se lee en la vista previa. */
export function textoInvitacion(url: string): string {
  return `Voy a ${EVENT.fullName}, el ${EVENT.dateShort} en ${EVENT.city}: un día completo de Inteligencia Artificial para el negocio inmobiliario. Ven conmigo: ${url}`;
}

/** Instagram no acepta texto prellenado; este es el que se copia al portapapeles. */
export function textoInstagram(fase: Fase): string {
  return fase === "evento"
    ? `Así viví ${EVENT.fullName} ✦ Un día de Inteligencia Artificial para el negocio inmobiliario, en ${EVENT.city}. ${HASHTAGS}`
    : `Voy a ${EVENT.fullName} ✦ ${EVENT.dateShort}, ${EVENT.city}. Un día de Inteligencia Artificial para el negocio inmobiliario. Entradas en habinext.com ${HASHTAGS}`;
}
