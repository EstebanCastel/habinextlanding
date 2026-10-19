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
    nombre: "Mapa Habi Next",
    resumen: "Nueve paradas por el recinto: visita cada una y súbenos la foto.",
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

// ---------- el mapa del recinto ----------

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
  /**
   * Dónde cae la parada sobre el plano oficial, en porcentaje del ancho y del
   * alto de la imagen. Va en porcentaje y no en píxeles porque el plano se
   * mira en un teléfono de 380 px y en una pantalla de 1400: lo único estable
   * entre los dos es la proporción.
   */
  x: number;
  y: number;
  /** Qué tiene que hacer ahí. */
  reto: string;
  puntos: number;
};

export const RUTAS: { id: RutaId; nombre: string; color: string; resumen: string; bono: number }[] = [
  {
    id: "morada",
    nombre: "Paradas 1 a 5",
    color: "#802ef6",
    resumen: "Del café del registro a los dos salones: las paradas 1 a 5 del plano.",
    bono: 25,
  },
  {
    id: "dorada",
    nombre: "Paradas 6 a 9",
    color: "#f2b134",
    resumen: "Los stands, el bar, el estudio y la zona VIP: las paradas 6 a 9.",
    bono: 25,
  },
];

const RETO_STAND = "Tómale una foto al stand con el logo visible y súbela desde aquí.";

/**
 * Las nueve paradas del recinto, en el orden del plano oficial.
 *
 * Las coordenadas son las del plano que se imprimió para la señalización, en
 * un lienzo de 1200×900: el mapa de la app y el del piso tienen que ser el
 * mismo dibujo, o la gente mira uno y busca en el otro.
 *
 * Las dos rutas parten el recorrido en dos mitades de cinco y cuatro. No es
 * un orden obligatorio —en el plano dice que el recorrido es sugerido— pero
 * sí da un hilo: empezar por el café del registro y terminar en el Salón VIP
 * es el camino que de verdad hace alguien que llega a las ocho.
 */
export const PARADAS: Parada[] = [
  { id: "cafe-registro", nombre: "Café · Registro", marca: "Habi Next", tipo: "escenario", ruta: "morada", orden: 1, x: 82.3, y: 57.2, reto: "Recoge tu café en el registro y tómale una foto al punto.", puntos: 10 },
  { id: "spot-fotos", nombre: "Spot para fotos", marca: "Habi Next", tipo: "escenario", ruta: "morada", orden: 2, x: 80.2, y: 43.1, reto: "Tómate una foto en el spot y súbela desde aquí.", puntos: 10 },
  { id: "stand-habi", nombre: "Stand Habi", marca: "Habi", tipo: "stand", ruta: "morada", orden: 3, x: 55.7, y: 43.1, reto: "Pásate por el stand de Habi y tómale una foto.", puntos: 10 },
  { id: "inspira", nombre: "Salón Inspira", marca: "Habi Next", tipo: "escenario", ruta: "morada", orden: 4, x: 43.0, y: 57.5, reto: "Entra al Salón Inspira y tómale una foto a la tarima.", puntos: 10 },
  { id: "caja-social", nombre: "Salón Banco Caja Social", marca: "Banco Caja Social", tipo: "escenario", logo: "/img/marcas/caja-social.svg", ruta: "morada", orden: 5, x: 64.4, y: 57.5, reto: "Entra al salón y tómale una foto a la tarima o a la pantalla.", puntos: 10 },
  { id: "stands-comerciales", nombre: "Stands comerciales", marca: "Aliados", tipo: "stand", ruta: "dorada", orden: 1, x: 57.8, y: 35.0, reto: "Visita los stands de los aliados y tómale una foto a uno.", puntos: 10 },
  { id: "bar-bogota", nombre: "Bar Banco de Bogotá", marca: "Banco de Bogotá", tipo: "stand", logo: "/img/marcas/banco-bogota.svg", ruta: "dorada", orden: 2, x: 35.2, y: 43.1, reto: RETO_STAND, puntos: 10 },
  { id: "estudio-foto", nombre: "Estudio fotográfico", marca: "Habi Next", tipo: "escenario", ruta: "dorada", orden: 3, x: 17.6, y: 42.7, reto: "Hazte tu retrato en el estudio y súbelo desde aquí.", puntos: 10 },
  { id: "salon-vip", nombre: "Salón VIP", marca: "Habi Next", tipo: "escenario", ruta: "dorada", orden: 4, x: 21.4, y: 31.8, reto: "Pásate por el Salón VIP y tómale una foto.", puntos: 10 },
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

/**
 * Las experiencias que todavía no se abren. Quedan a la vista en la portada,
 * con candado, pero nadie entra: ni por la tarjeta, ni por la URL, ni por
 * las APIs que dan puntos. Para abrir una, se quita de esta lista.
 */
export const BLOQUEADAS: Partial<Record<ExperienciaId, { desde: string; nota: string; hasta?: string }>> = {
  // Todo abierto desde el 19 de octubre. El mapa esperaba al día del evento
  // —las paradas son físicas— pero tenerlo cerrado la víspera escondía el
  // plano justo cuando la gente está planeando por dónde entrar.
};

/** Cerrada hoy: está en la lista y, si tiene fecha de apertura, todavía no llegó. */
export const bloqueada = (id: ExperienciaId, ahora = Date.now()) => {
  const b = BLOQUEADAS[id];
  if (!b) return false;
  return b.hasta ? ahora < new Date(b.hasta).getTime() : true;
};

/** Si una misión pertenece a una experiencia cerrada, tampoco se puede completar. */
export const misionBloqueada = (id: MisionId) => {
  const m = MISIONES.find((x) => x.id === id);
  return m ? bloqueada(m.experiencia) : false;
};

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
 * tres veces más que un enlace pelado. El del carnet se publica tal cual,
 * sin editor: es la frase del evento.
 */
export function textoVoy(tier?: "general" | "vip"): string {
  const como = tier === "vip" ? "Voy como VIP a hacer parte" : "Voy a hacer parte";
  return [
    `${como} del evento más importante para brokers inmobiliarios y de crédito este ${EVENT.dateShort}, realizado por Habi 💜`,
    "",
    `${EVENT.fullName} · ${EVENT.city} · habinext.com`,
    "",
    "#HabiNext #Habi #Brokers #Inmobiliario",
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
