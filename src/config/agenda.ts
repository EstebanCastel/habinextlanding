/**
 * La agenda del 20 de octubre, tal como la trabaja el equipo: dos salones en
 * paralelo durante todo el día.
 *
 * Las sesiones van en el orden del programa, sin horas: los horarios todavía
 * se están cerrando y publicar uno que después cambie es peor que no
 * publicarlo. Cuando el equipo los confirme, se agregan acá y la pantalla
 * los muestra.
 *
 * Cada sesión trae, además del título y quién la dicta, **qué se lleva** quien
 * entre: tres o cuatro frases concretas, escritas como las fichas de la
 * cartilla de IA. Eso es lo que se ve al tocar una sesión, y es lo que hace
 * que alguien decida entrar a esta y no a la otra.
 *
 * Lo que todavía no está cerrado se marca con `porConfirmar`: la sesión se
 * anuncia igual, pero sin poner un nombre que después toque desdecir.
 */

export type SalonId = "inspira" | "taller";

export type Salon = {
  id: SalonId;
  /** Número del tótem en el recinto: es como está señalizado en piso. */
  numero: string;
  nombre: string;
  /** El nombre corto que va en la señalización del recinto. */
  rotulo: string;
  claim: string;
  resumen: string;
  /** Render del montaje, para la previsualización del lugar. */
  imagen: string;
  /** Lo que hay en la sala: sirve para que alguien sepa a qué va. */
  montaje: string[];
  aforo: string;
};

export const SALONES: Salon[] = [
  {
    id: "inspira",
    numero: "01",
    nombre: "Salón Principal · Inspira",
    rotulo: "Inspira",
    claim: "Las charlas que marcan el día",
    resumen:
      "El escenario grande. Conferencias de formato amplio, el futuro de Habi contado por quienes lo están construyendo y las herramientas que ya están cambiando el oficio.",
    imagen: "/img/escenario-inspira.webp",
    montaje: ["Tarima con pantalla gigante", "Sillas en formato auditorio", "Streaming y grabación", "Traducción de la jornada en vivo"],
    aforo: "Aforo amplio, sin inscripción previa",
  },
  {
    id: "taller",
    numero: "02",
    nombre: "Salón Taller",
    rotulo: "Taller",
    claim: "Con el computador abierto",
    resumen:
      "La sala práctica. Se entra a hacer, no a mirar: cada sesión termina con algo montado en tu propio computador, así que conviene llegar con batería y con las cuentas abiertas.",
    imagen: "/img/escenario-taller.webp",
    montaje: ["Mesas de trabajo con corriente", "Pantallas a dos lados", "Wifi reforzado para la sala", "Acompañamiento del equipo Habi"],
    aforo: "Cupo limitado por sesión, por orden de llegada",
  },
];

export const salonDe = (id: SalonId): Salon => SALONES.find((s) => s.id === id)!;

export type Sesion = {
  id: string;
  salon: SalonId;
  titulo: string;
  /**
   * Hora de inicio «HH:MM» (Bogotá), solo cuando el equipo la confirme. La
   * pantalla no la muestra todavía; la barra de «lo que sigue» sí la usa
   * para saber cuál es la próxima sesión el día del evento.
   */
  desde?: string;
  /** Quién la dicta. Vacío cuando todavía se está cerrando. */
  ponente?: string;
  /** Empresa o cargo de quien dicta, cuando aporta. */
  detallePonente?: string;
  /** Varias voces en una misma sesión: la maratón, el conversatorio. */
  ponentes?: string[];
  porConfirmar?: boolean;
  /** Pausas y bloqueos: se pintan distinto y no se pueden abrir. */
  tipo?: "pausa" | "bloqueo";
  /** El gancho de una línea que se lee en la tarjeta. */
  resumen?: string;
  /** Lo que se lleva quien entra. Es el contenido de la previsualización. */
  contenido?: string[];
  /** Qué hay que traer o tener listo. */
  necesitas?: string;
  /** Un bloque de charlas cortas bajo un mismo título, una detrás de otra. */
  partes?: { titulo: string; ponente: string; detalle?: string }[];
};

export const SESIONES: Sesion[] = [
  // ---------- Salón Principal · Inspira ----------
  {
    id: "marca-personal",
    salon: "inspira",
    titulo: "Construcción de marca personal con IA",
    ponente: "Camilo Olarte",
    resumen: "Que te busquen a ti y no a la inmobiliaria.",
    contenido: [
      "Cómo se ve hoy un perfil de asesor que genera contactos solo, y en qué se diferencia del que no.",
      "Un sistema para producir un mes de contenido en una tarde, con IA que escribe en tu voz y no en la de un robot.",
      "Qué publicar en cada red sin repetirte, y cómo convertir un cierre en tres piezas distintas.",
      "Los errores que hacen que el algoritmo te esconda, con ejemplos de cuentas reales del gremio.",
    ],
    necesitas: "Tu celular con tus redes abiertas.",
  },
  {
    id: "agente-futuro",
    salon: "inspira",
    titulo: "El agente inmobiliario del futuro",
    ponente: "Pipe Restrepo",
    resumen: "Cómo se ve el oficio dentro de cinco años.",
    contenido: [
      "Qué partes del trabajo de un asesor van a desaparecer y cuáles se vuelven más valiosas.",
      "Lo que ya está pasando en otros mercados y todavía no llega a Colombia.",
      "Qué hacer este año para no quedar del lado equivocado del cambio.",
    ],
  },
  {
    id: "receso-manana",
    salon: "inspira",
    titulo: "Receso corto",
    tipo: "pausa",
    resumen: "Café, baño y una vuelta por los stands.",
  },
  {
    id: "futuro-habi",
    salon: "inspira",
    titulo: "El futuro de Habi",
    ponente: "Sebastián Noguera",
    detallePonente: "Cofundador de Habi",
    resumen: "Hacia dónde va la compañía, contado por quienes la construyen.",
    partes: [
      { titulo: "La compañía", ponente: "Sebastián Noguera", detalle: "Cofundador de Habi" },
      { titulo: "Mi Red", ponente: "Agustín Iglesias" },
      { titulo: "Habi Capital", ponente: "Martín Oviedo" },
      { titulo: "Habi Credit", ponente: "Gabriel Morris" },
      { titulo: "Franquicias", ponente: "Edwin Alejo o Matías" },
    ],
    contenido: [
      "Dónde está parada Habi hoy en Colombia y en México, con las cifras reales del año.",
      "Mi Red: cómo funciona la red de aliados, qué recibe cada uno y cómo se reparte la comisión.",
      "Habi Capital: el brazo de inversión, qué financia y cómo se le presenta una oportunidad.",
      "Habi Credit: cómo entra el crédito en una venta y qué gana el asesor por acompañarlo.",
      "Franquicias: qué incluye, cuánto cuesta y para quién tiene sentido.",
    ],
  },
  {
    id: "almuerzo",
    salon: "inspira",
    titulo: "Almuerzo",
    tipo: "pausa",
    resumen: "Zona de comida y networking. Los VIP tienen su propia sala.",
  },
  {
    id: "venderle-inversionistas",
    salon: "inspira",
    titulo: "¿Cómo venderle a inversionistas? Y volverme uno de ellos",
    ponente: "Mis Propias Finanzas",
    resumen: "El cliente que compra por números, y cómo pensar como él.",
    contenido: [
      "Cómo presentar un inmueble como inversión: rentabilidad, valorización y riesgo, sin adornos.",
      "Qué información pide un inversionista antes de mirar una sola foto.",
      "Cómo separar la plata del negocio de la plata de la casa cuando tus ingresos son por comisión.",
      "Un esquema simple para que un mes bueno aguante los dos siguientes y empiece a invertir.",
    ],
  },
  {
    id: "receso-tarde",
    salon: "inspira",
    titulo: "Receso corto",
    tipo: "pausa",
    resumen: "Café y una vuelta por los stands.",
  },
  {
    id: "maraton-herramientas",
    salon: "inspira",
    titulo: "Maratón de herramientas para asesores inmobiliarios y financieros",
    ponentes: ["Dapta", "Auco", "Wekall", "Funnel Chat"],
    resumen: "Cuatro herramientas, una detrás de otra, con demostración en vivo.",
    contenido: [
      "Dapta: automatizaciones que responden y hacen seguimiento por ti.",
      "Auco: firma electrónica y validación de identidad sin papeleo.",
      "Wekall: la llamada y el WhatsApp de tu operación en un solo lugar.",
      "Funnel Chat: cómo no perder un lead entre tantas conversaciones.",
    ],
  },
  {
    id: "confianza-negocios",
    salon: "inspira",
    titulo: "¿Cómo construir confianza y hacer negocios?",
    ponente: "Mabel Quintero",
    resumen: "Lo que decide una venta y no está en el inmueble.",
    contenido: [
      "Por qué un cliente elige a un asesor y no a otro con la misma propiedad.",
      "Cómo se construye reputación en un gremio donde todos se conocen.",
      "Qué decir cuando la respuesta honesta es la que el cliente no quiere oír.",
    ],
  },
  {
    id: "segundo-cerebro",
    salon: "inspira",
    titulo: "Crea tu segundo cerebro con IA",
    ponente: "Dani Bravo",
    resumen: "Todo lo que sabes, buscable en un segundo.",
    contenido: [
      "Cómo guardar lo que aprendes de forma que lo vuelvas a encontrar.",
      "Un sistema para que tus notas, contratos y fichas respondan preguntas.",
      "Qué herramienta usar según cómo trabajes hoy.",
    ],
  },

  // ---------- Salón Taller ----------
  {
    id: "tiktok",
    salon: "taller",
    titulo: "Crea contenidos virales en TikTok",
    porConfirmar: true,
    resumen: "El formato que más alcance orgánico da hoy.",
    contenido: [
      "Los cuatro formatos de video inmobiliario que funcionan y por qué.",
      "Cómo grabar un recorrido con el celular que la gente vea completo.",
      "Qué poner en los primeros tres segundos para que no se salgan.",
      "Grabas y publicas uno en la sesión.",
    ],
    necesitas: "Tu celular con TikTok instalado.",
  },
  {
    id: "asistente-claude",
    salon: "taller",
    titulo: "Crea tu asistente personal con Claude",
    ponentes: ["Juanfe Quiñones", "Carlos M."],
    resumen: "Sales del evento con tu asistente funcionando.",
    contenido: [
      "Cómo se le enseña a un asistente tu forma de trabajar, tus inmuebles y tus clientes.",
      "Las tres tareas que conviene delegarle primero, y las que no conviene delegarle nunca.",
      "Montamos el tuyo en la sesión y te vas con él andando.",
    ],
    necesitas: "Computador con batería y tu correo a mano.",
  },
  {
    id: "ventas-ia",
    salon: "taller",
    titulo: "Ventas con inteligencia artificial",
    ponente: "Dapta",
    resumen: "Una demostración corta, con tu operación en mente.",
    contenido: [
      "Cómo se ve un embudo de ventas con IA atendiendo la primera respuesta.",
      "Qué se automatiza sin que el cliente sienta que habla con una máquina.",
    ],
  },
  {
    id: "bloqueo-taller",
    salon: "taller",
    titulo: "Sala en pausa",
    tipo: "bloqueo",
    resumen: "Mientras tanto, en Inspira: El futuro de Habi.",
  },
  {
    id: "conversatorio-brokers",
    salon: "taller",
    titulo: "Conversatorio: los mejores brokers",
    ponentes: ["Anderson · Hipoteca", "Vivienda · por confirmar", "Germán Rueda · entrevista"],
    resumen: "Los que más venden, contando cómo lo hacen.",
    contenido: [
      "Cómo organizan su semana los asesores que cierran todos los meses.",
      "Qué dejaron de hacer para crecer, que suele ser lo más útil de la conversación.",
      "Preguntas abiertas de la sala.",
    ],
  },
  {
    id: "constructores",
    salon: "taller",
    titulo: "¿Cómo ser más atractivos para financiar proyectos inmobiliarios?",
    ponentes: ["Amarilo", "Bolívar"],
    resumen: "Una conversación con constructores.",
    contenido: [
      "Qué mira una constructora cuando decide con qué asesores trabajar un proyecto.",
      "Cómo entrar a una sala de ventas y salir con un acuerdo, y qué le resuelves tú que ella no puede sola.",
      "La conversación de crédito con el comprador de vivienda nueva: cuándo empezarla y con quién.",
    ],
  },
  {
    id: "recorridos-virtuales",
    salon: "taller",
    titulo: "Crea contenidos con IA: recorridos virtuales",
    ponente: "Camilo Olarte",
    resumen: "Un inmueble vacío que se ve habitado.",
    contenido: [
      "Cómo armar un recorrido virtual con lo que ya tienes: fotos y celular.",
      "Amoblar digitalmente un inmueble vacío sin que se note falso.",
      "Qué está permitido mostrar y qué cruza la línea de la publicidad engañosa.",
      "Te llevas uno hecho con tus propias fotos.",
    ],
    necesitas: "Fotos de un inmueble tuyo en el computador o el celular.",
  },
  {
    id: "campanas-meta",
    salon: "taller",
    titulo: "¿Cómo crear campañas en Meta que sí venden?",
    ponente: "Olivia Robles Gorriti",
    resumen: "Dejar de quemar plata en Facebook e Instagram.",
    contenido: [
      "Cómo se arma una campaña inmobiliaria que trae interesados y no curiosos.",
      "Qué segmentación funciona en Colombia y cuál es plata perdida.",
      "Cómo leer los números de la campaña para saber cuándo apagarla.",
      "Dejas una campaña montada y lista para publicar.",
    ],
    necesitas: "Acceso a tu Business Manager.",
  },
  {
    id: "crm",
    salon: "taller",
    titulo: "Aprende a implementar un CRM",
    ponente: "Mateo Jaramillo",
    detallePonente: "Grapez Studio",
    resumen: "Dejar de perder clientes en las notas del celular.",
    contenido: [
      "Qué es lo mínimo que un asesor necesita registrar de cada cliente.",
      "Cómo se monta un CRM en una tarde sin pagar una fortuna.",
      "Los recordatorios que hacen que no se caiga un negocio por olvido.",
      "Sales con tu CRM creado y tus primeros contactos cargados.",
    ],
    necesitas: "Computador y tu lista de clientes actual.",
  },
  {
    id: "ventas-inversionistas",
    salon: "taller",
    titulo: "Ventas a inversionistas",
    porConfirmar: true,
    resumen: "Taller práctico: el guion y los números, en tu computador.",
    contenido: [
      "Armar la ficha de inversión de un inmueble real: renta, valorización y riesgo, con una plantilla que te llevas.",
      "El guion de la primera llamada con un inversionista, y qué objeciones salen siempre.",
      "Cómo se construye una cartera de clientes que repiten compra.",
    ],
  },
  {
    // En la hoja del equipo esta sesión aparece con «Alternativa» en la
    // columna del ponente: se lee como sesión de respaldo, no como quien la
    // dicta. Por eso va sin nombre y por confirmar.
    id: "score-crediticio",
    salon: "taller",
    titulo: "¿Cómo mejorar el score crediticio de tus clientes?",
    porConfirmar: true,
    resumen: "Rescatar la venta que el banco frenó.",
    contenido: [
      "Qué mira realmente un banco y qué pesa más en la decisión.",
      "Los arreglos que suben el puntaje en semanas y los que toman meses.",
      "Cómo acompañar a un cliente negado sin perder la venta.",
    ],
  },
];

/** Las sesiones de un salón, en el orden del programa. */
export const sesionesDe = (salon: SalonId) => SESIONES.filter((s) => s.salon === salon);

/** Una sesión por su id. */
export const sesionDe = (id: string) => SESIONES.find((s) => s.id === id);

/** Las que son charla o taller de verdad: las pausas no cuentan ni se numeran. */
export const esSesion = (s: Sesion) => !s.tipo;

/** El número de la sesión dentro de su salón (1, 2, 3…), sin contar pausas. */
export function numeroDe(s: Sesion): number {
  return sesionesDe(s.salon).filter(esSesion).findIndex((x) => x.id === s.id) + 1;
}

// ---------- lo que sigue ----------

export type Proximo =
  | { tipo: "antes"; dias: number }
  | { tipo: "hoy"; sesion: Sesion | null; arranca: boolean }
  | { tipo: "despues" };

const DIA_EVENTO = "2026-10-20";

/** «YYYY-MM-DD» y «HH:MM» en hora de Bogotá, para no depender del reloj del servidor. */
function enBogota(ahora: Date): { fecha: string; hora: string } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(ahora);
  const v = (t: string) => partes.find((x) => x.type === t)?.value ?? "00";
  return { fecha: `${v("year")}-${v("month")}-${v("day")}`, hora: `${v("hour") === "24" ? "00" : v("hour")}:${v("minute")}` };
}

/**
 * Qué viene: antes del evento, cuántos días faltan; el día del evento, la
 * próxima sesión con hora confirmada o, si no hay horas, con qué arranca el
 * salón principal; después, nada que anunciar.
 */
export function proximo(ahora = new Date()): Proximo {
  const { fecha, hora } = enBogota(ahora);
  if (fecha < DIA_EVENTO) {
    const dias = Math.round((Date.parse(`${DIA_EVENTO}T00:00:00-05:00`) - Date.parse(`${fecha}T00:00:00-05:00`)) / 86_400_000);
    return { tipo: "antes", dias };
  }
  if (fecha > DIA_EVENTO) return { tipo: "despues" };
  const conHora = SESIONES.filter((s) => esSesion(s) && s.desde).sort((a, b) => a.desde!.localeCompare(b.desde!));
  if (conHora.length) {
    const siguiente = conHora.find((s) => s.desde! >= hora) ?? null;
    return { tipo: "hoy", sesion: siguiente, arranca: false };
  }
  return { tipo: "hoy", sesion: sesionesDe("inspira").find(esSesion) ?? null, arranca: true };
}
