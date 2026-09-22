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

export type ExperienciaId = "carnet" | "mapa" | "redes";

export type Mision = {
  id: MisionId;
  /** Antes del evento se promueve la asistencia; el día del evento, lo vivido. */
  fase: Fase;
  /** A cuál de las tres experiencias pertenece. */
  experiencia: ExperienciaId;
  titulo: string;
  resumen: string;
  puntos: number;
  red?: Red;
};

/**
 * Las tres experiencias. Son las tres tarjetas de la portada; cada una tiene
 * su propia pantalla y suma al mismo puntaje.
 */
export const EXPERIENCIAS: {
  id: ExperienciaId;
  numero: number;
  nombre: string;
  resumen: string;
  imagen: string;
  ruta: string;
}[] = [
  {
    id: "carnet",
    numero: 1,
    nombre: "Tu carnet",
    resumen: "Arma tu carnet oficial y publícalo en LinkedIn e Instagram.",
    imagen: "/img/experiencia/tarjeta-carnet.jpg",
    ruta: "/experiencia/carnet",
  },
  {
    id: "mapa",
    numero: 2,
    nombre: "El mapa del tesoro",
    resumen: "Dos rutas por el recinto: visita cada parada y súbenos la foto.",
    imagen: "/img/experiencia/tarjeta-mapa.jpg",
    ruta: "/experiencia/mapa",
  },
  {
    id: "redes",
    numero: 3,
    nombre: "Cuéntalo en tus redes",
    resumen: "Publica en LinkedIn, Instagram y WhatsApp, y sube la prueba.",
    imagen: "/img/experiencia/tarjeta-redes.jpg",
    ruta: "/experiencia/redes",
  },
];

export const MISIONES: Mision[] = [
  {
    id: "carnet",
    fase: "antes",
    experiencia: "carnet",
    titulo: "Crea tu carnet",
    resumen: "Tu foto, tu nombre y el sello de Habi Next Colombia.",
    puntos: 10,
  },
  {
    id: "linkedin_voy",
    fase: "antes",
    experiencia: "carnet",
    titulo: "Cuéntalo en LinkedIn",
    resumen: "Publica que vas, con tu carnet y el texto listo. Un clic.",
    puntos: 20,
    red: "linkedin",
  },
  {
    id: "instagram_voy",
    fase: "antes",
    experiencia: "carnet",
    titulo: "Súbelo a tus historias",
    resumen: "Tu carnet en formato vertical, directo a Instagram.",
    puntos: 15,
    red: "instagram",
  },
  {
    id: "invitar",
    fase: "antes",
    experiencia: "redes",
    titulo: "Invita a un colega",
    resumen: "Tu link personal por WhatsApp. Te contamos cuántos lo abren.",
    puntos: 10,
    red: "whatsapp",
  },
  {
    id: "fotos",
    fase: "evento",
    experiencia: "redes",
    titulo: "Sube tus fotos del evento",
    resumen: "Todas las que te tomaste en Habi Next. Quedan listas para publicar.",
    puntos: 10,
  },
  {
    id: "linkedin_fotos",
    fase: "evento",
    experiencia: "redes",
    titulo: "Tu Habi Next en LinkedIn",
    resumen: "Hasta nueve fotos con un texto ya escrito. Solo publicar.",
    puntos: 25,
    red: "linkedin",
  },
  {
    id: "instagram_fotos",
    fase: "evento",
    experiencia: "redes",
    titulo: "Tus fotos en Instagram",
    resumen: "Elige las mejores y compártelas con el texto copiado.",
    puntos: 20,
    red: "instagram",
  },
  {
    id: "frase",
    fase: "evento",
    experiencia: "redes",
    titulo: "Lo que te llevas",
    resumen: "Una frase tuya, convertida en una pieza para compartir.",
    puntos: 15,
  },
];

// ---------- el mapa del tesoro ----------

export type RutaId = "morada" | "dorada";

export type Parada = {
  id: string;
  nombre: string;
  /** Marca del stand, o el escenario si no es un stand. */
  marca: string;
  tipo: "stand" | "escenario";
  logo?: string;
  /** Fondo del stand en el plano cuando el logo no se lee sobre blanco. */
  fondo?: string;
  sitio?: string;
  ruta: RutaId;
  orden: number;
  /** Posición sobre el plano (viewBox 1200×900): el frente del stand o el centro del escenario. */
  x: number;
  y: number;
  /** Qué tiene que hacer ahí. */
  reto: string;
  puntos: number;
};

export const RUTAS: { id: RutaId; nombre: string; color: string; resumen: string; bono: number }[] = [
  {
    id: "morada",
    nombre: "Ruta morada",
    color: "#802ef6",
    resumen: "Financiación, taller y firma digital: la ruta del negocio que cierra.",
    bono: 25,
  },
  {
    id: "dorada",
    nombre: "Ruta dorada",
    color: "#f2b134",
    resumen: "Inspiración y herramientas: la ruta de lo que viene.",
    bono: 25,
  },
];

const RETO_STAND = "Tómale una foto al stand con el logo visible y súbela desde aquí.";

export const PARADAS: Parada[] = [
  { id: "caja-social", nombre: "Banco Caja Social", marca: "Banco Caja Social", tipo: "stand", logo: "/img/marcas/caja-social.svg", sitio: "https://www.bancocajasocial.com", ruta: "morada", orden: 1, x: 200, y: 445, reto: RETO_STAND, puntos: 10 },
  { id: "taller", nombre: "Escenario Taller", marca: "Habi Next", tipo: "escenario", ruta: "morada", orden: 2, x: 890, y: 165, reto: "Entra al Escenario Taller y tómale una foto a la tarima o a la pantalla.", puntos: 10 },
  { id: "auco", nombre: "Auco", marca: "Auco", tipo: "stand", logo: "/img/marcas/auco.png", sitio: "https://auco.ai", ruta: "morada", orden: 3, x: 800, y: 445, reto: RETO_STAND, puntos: 10 },
  { id: "inspira", nombre: "Escenario Inspira", marca: "Habi Next", tipo: "escenario", ruta: "dorada", orden: 1, x: 310, y: 165, reto: "Entra al Escenario Inspira y tómale una foto a la tarima.", puntos: 10 },
  { id: "wekall", nombre: "Wekall", marca: "Wekall", tipo: "stand", logo: "/img/marcas/wekall.svg", sitio: "https://wekall.co", ruta: "dorada", orden: 2, x: 500, y: 445, reto: RETO_STAND, puntos: 10 },
  { id: "palomma", nombre: "Palomma", marca: "Palomma", tipo: "stand", logo: "/img/marcas/palomma.png", sitio: "https://palomma.com", ruta: "dorada", orden: 3, x: 200, y: 612, reto: RETO_STAND, puntos: 10 },
  { id: "banco-bogota", nombre: "Banco de Bogotá", marca: "Banco de Bogotá", tipo: "stand", logo: "/img/marcas/banco-bogota.svg", sitio: "https://www.bancodebogota.com", ruta: "dorada", orden: 4, x: 500, y: 612, reto: RETO_STAND, puntos: 10 },
  { id: "grapez", nombre: "Grapez Studio", marca: "Grapez Studio", tipo: "stand", logo: "/img/marcas/grapez.png", fondo: "#161616", sitio: "https://www.grapezstudio.com", ruta: "dorada", orden: 5, x: 800, y: 612, reto: RETO_STAND, puntos: 10 },
];

export const paradasDe = (ruta: RutaId) => PARADAS.filter((p) => p.ruta === ruta).sort((a, b) => a.orden - b.orden);

/**
 * El recinto. El check-in de cada parada pide la ubicación del celular y la
 * compara con este punto; `radioM` es generoso porque el GPS bajo techo se
 * equivoca por decenas de metros.
 */
export const RECINTO = {
  nombre: "Centro de Convenciones Compensar Av. 68",
  direccion: "Av. Carrera 68 #49A-47, Bogotá",
  // Entrada sobre la Avenida 68 (Apple Maps / OpenStreetMap). El complejo mide
  // unos 200 m de lado; el radio cubre todo y algo más para el GPS bajo techo.
  lat: 4.66016,
  lng: -74.09930,
  radioM: 700,
};

export const PUNTOS_MAPA = PARADAS.reduce((s, p) => s + p.puntos, 0) + RUTAS.reduce((s, r) => s + r.bono, 0);
export const PUNTOS_TOTALES = MISIONES.reduce((s, m) => s + m.puntos, 0) + PUNTOS_MAPA;

export const puntosDeExperiencia = (id: ExperienciaId) =>
  id === "mapa" ? PUNTOS_MAPA : MISIONES.filter((m) => m.experiencia === id).reduce((s, m) => s + m.puntos, 0);

/** Los niveles se alcanzan por puntos; el último exige completar todo. */
export const NIVELES = [
  { desde: 0, nombre: "Asistente" },
  { desde: 30, nombre: "Explorador" },
  { desde: 120, nombre: "Embajador" },
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
