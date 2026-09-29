/**
 * La agenda del 20 de octubre, tal como la trabaja el equipo: dos salones en
 * paralelo de 9:00 a 18:00.
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
      "El escenario grande. Conferencias de formato amplio, el futuro de Habi contado por quienes lo están construyendo y los conversatorios con los brokers que más venden.",
    imagen: "/img/evento/totem.jpg",
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
    imagen: "/img/evento/senalizacion.jpg",
    montaje: ["Mesas de trabajo con corriente", "Pantallas a dos lados", "Wifi reforzado para la sala", "Acompañamiento del equipo Habi"],
    aforo: "Cupo limitado por sesión, por orden de llegada",
  },
];

export const salonDe = (id: SalonId): Salon => SALONES.find((s) => s.id === id)!;

export type Sesion = {
  id: string;
  salon: SalonId;
  /** Formato HH:MM en hora de Bogotá. */
  desde: string;
  hasta: string;
  titulo: string;
  /** Quién la dicta. Vacío cuando todavía se está cerrando. */
  ponente?: string;
  /** Empresa o cargo de quien dicta, cuando aporta. */
  detallePonente?: string;
  porConfirmar?: boolean;
  /** Pausas y bloqueos: se pintan distinto y no se pueden abrir. */
  tipo?: "pausa" | "bloqueo";
  /** El gancho de una línea que se lee en la tarjeta. */
  resumen?: string;
  /** Lo que se lleva quien entra. Es el contenido de la previsualización. */
  contenido?: string[];
  /** Qué hay que traer o tener listo. */
  necesitas?: string;
};

export const SESIONES: Sesion[] = [
  // ---------- Salón Principal · Inspira ----------
  {
    id: "agente-futuro",
    salon: "inspira",
    desde: "9:00",
    hasta: "10:00",
    titulo: "El agente inmobiliario del futuro",
    ponente: "Pipe Restrepo",
    porConfirmar: true,
    resumen: "Cómo se ve el oficio dentro de cinco años.",
    contenido: [
      "Qué partes del trabajo de un asesor van a desaparecer y cuáles se vuelven más valiosas.",
      "Lo que ya está pasando en otros mercados y todavía no llega a Colombia.",
      "Qué hacer este año para no quedar del lado equivocado del cambio.",
    ],
  },
  {
    id: "marca-personal",
    salon: "inspira",
    desde: "10:00",
    hasta: "11:00",
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
    id: "receso",
    salon: "inspira",
    desde: "11:00",
    hasta: "11:15",
    titulo: "Receso corto",
    tipo: "pausa",
    resumen: "Café, baño y una vuelta por los stands.",
  },
  {
    id: "futuro-habi",
    salon: "inspira",
    desde: "11:15",
    hasta: "11:30",
    titulo: "El futuro de Habi",
    ponente: "Sebastián Noguera",
    detallePonente: "Cofundador de Habi",
    resumen: "Hacia dónde va la compañía y qué significa para ti.",
    contenido: [
      "Dónde está parada Habi hoy en Colombia y en México, con las cifras reales del año.",
      "Qué se viene en producto y qué parte de eso queda en manos de los aliados.",
      "Cómo encaja un asesor independiente en lo que Habi está construyendo.",
    ],
  },
  {
    id: "mi-red",
    salon: "inspira",
    desde: "11:30",
    hasta: "11:45",
    titulo: "El futuro de Habi · Mi Red",
    ponente: "Agustín Iglesias",
    resumen: "La red de aliados y cómo se gana dentro de ella.",
    contenido: [
      "Cómo funciona la red de aliados: quién entra, qué recibe y qué se espera de cada uno.",
      "El inventario que puedes mostrar desde el primer día y cómo se reparte la comisión.",
      "Lo que viene para quienes ya están adentro.",
    ],
  },
  {
    id: "habi-capital",
    salon: "inspira",
    desde: "11:45",
    hasta: "12:00",
    titulo: "El futuro de Habi · Habi Capital",
    ponente: "Martín Oviedo",
    resumen: "El brazo de inversión, explicado sin jerga.",
    contenido: [
      "Qué es Habi Capital y qué tipo de operaciones financia.",
      "Cómo se le presenta una oportunidad y qué la hace viable.",
      "Qué puede ofrecerle un asesor a un cliente inversionista con este respaldo.",
    ],
  },
  {
    id: "habi-credit",
    salon: "inspira",
    desde: "12:00",
    hasta: "12:15",
    titulo: "El futuro de Habi · Habi Credit",
    ponente: "Gabriel Morris",
    resumen: "Crédito hipotecario como parte de tu cierre.",
    contenido: [
      "Cómo entra el crédito en una venta y en qué momento hay que hablarlo con el comprador.",
      "Qué frena un desembolso y cómo anticiparlo antes de firmar promesa.",
      "Lo que un asesor gana por acompañar el crédito, no solo la venta.",
    ],
  },
  {
    id: "franquicias",
    salon: "inspira",
    desde: "12:15",
    hasta: "12:30",
    titulo: "El futuro de Habi · Franquicias",
    ponente: "Edwin Alejo o Matías",
    porConfirmar: true,
    resumen: "El modelo de franquicia, de frente.",
    contenido: [
      "Qué incluye una franquicia Habi y qué no.",
      "La inversión, los tiempos y el punto de equilibrio con números.",
      "Para quién tiene sentido y para quién no vale la pena.",
    ],
  },
  {
    id: "conversatorio-brokers",
    salon: "inspira",
    desde: "12:30",
    hasta: "13:00",
    titulo: "Conversatorio: los mejores brokers",
    ponente: "Anderson (hipoteca) y un invitado de vivienda",
    porConfirmar: true,
    resumen: "Los que más venden, contando cómo lo hacen.",
    contenido: [
      "Cómo organizan su semana los asesores que cierran todos los meses.",
      "Qué dejaron de hacer para crecer, que suele ser lo más útil de la conversación.",
      "Preguntas abiertas de la sala.",
    ],
  },
  {
    id: "almuerzo",
    salon: "inspira",
    desde: "13:00",
    hasta: "14:00",
    titulo: "Almuerzo",
    tipo: "pausa",
    resumen: "Zona de comida y networking. Los VIP tienen su propia sala.",
  },
  {
    id: "finanzas-personales",
    salon: "inspira",
    desde: "14:00",
    hasta: "15:00",
    titulo: "Finanzas personales: mis propias finanzas",
    ponente: "Mis Propias Finanzas",
    resumen: "Vender bien y que además te quede.",
    contenido: [
      "Cómo separar la plata del negocio de la plata de la casa cuando tus ingresos son por comisión.",
      "Qué hacer con un mes bueno para que aguante los dos siguientes.",
      "Un esquema simple de ahorro e inversión para ingresos irregulares.",
    ],
  },
  {
    id: "maraton-herramientas",
    salon: "inspira",
    desde: "15:00",
    hasta: "16:00",
    titulo: "Maratón de herramientas para asesores",
    ponente: "Dapta, Auco, Wekall y Funnel Chat",
    resumen: "Cuatro herramientas, quince minutos cada una.",
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
    desde: "16:00",
    hasta: "17:00",
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
    id: "asistente-claude",
    salon: "inspira",
    desde: "17:00",
    hasta: "18:00",
    titulo: "Crea tu asistente personal con Claude",
    resumen: "Sales del evento con tu asistente funcionando.",
    contenido: [
      "Cómo se le enseña a un asistente tu forma de trabajar, tus inmuebles y tus clientes.",
      "Las tres tareas que conviene delegarle primero, y las que no conviene delegarle nunca.",
      "Montamos el tuyo en la sesión y te vas con él andando.",
    ],
    necesitas: "Computador con batería y tu correo a mano.",
  },

  // ---------- Salón Taller ----------
  {
    id: "tiktok",
    salon: "taller",
    desde: "9:00",
    hasta: "9:45",
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
    id: "score-crediticio",
    salon: "taller",
    desde: "9:45",
    hasta: "10:30",
    titulo: "¿Cómo mejorar el score crediticio de tus clientes?",
    porConfirmar: true,
    resumen: "Rescatar la venta que el banco frenó.",
    contenido: [
      "Qué mira realmente un banco y qué pesa más en la decisión.",
      "Los arreglos que suben el puntaje en semanas y los que toman meses.",
      "Cómo acompañar a un cliente negado sin perder la venta.",
    ],
  },
  {
    id: "ventas-ia",
    salon: "taller",
    desde: "10:30",
    hasta: "11:15",
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
    desde: "11:15",
    hasta: "12:30",
    titulo: "Sala en montaje",
    tipo: "bloqueo",
    resumen: "Mientras tanto, el salón principal tiene El futuro de Habi.",
  },
  {
    id: "inversionistas",
    salon: "taller",
    desde: "12:30",
    hasta: "13:15",
    titulo: "Ventas a inversionistas",
    ponente: "Juan Londoño y Laura M.",
    porConfirmar: true,
    resumen: "El cliente que compra por números, no por gusto.",
    contenido: [
      "Cómo presentar un inmueble como inversión: rentabilidad, valorización y riesgo.",
      "Qué información pide un inversionista antes de mirar una foto.",
      "Cómo se construye una cartera de clientes que repiten compra.",
    ],
  },
  {
    id: "creditos-proyectos",
    salon: "taller",
    desde: "13:15",
    hasta: "14:00",
    titulo: "Véndele créditos a los proyectos inmobiliarios",
    porConfirmar: true,
    resumen: "Cómo vender más créditos hipotecarios.",
    contenido: [
      "Cómo entrar a una sala de ventas de proyecto y salir con acuerdo.",
      "Qué le resuelves tú a un constructor que él no puede resolver solo.",
      "La conversación de crédito con el comprador de vivienda nueva.",
    ],
  },
  {
    id: "recorridos-virtuales",
    salon: "taller",
    desde: "14:00",
    hasta: "14:45",
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
    desde: "14:45",
    hasta: "15:30",
    titulo: "Optimización de campañas de Meta",
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
    desde: "15:30",
    hasta: "16:30",
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
    id: "segundo-cerebro",
    salon: "taller",
    desde: "16:30",
    hasta: "17:15",
    titulo: "Crea tu segundo cerebro con IA",
    ponente: "Dani Bravo o Juan José",
    porConfirmar: true,
    resumen: "Todo lo que sabes, buscable en un segundo.",
    contenido: [
      "Cómo guardar lo que aprendes de forma que lo vuelvas a encontrar.",
      "Un sistema para que tus notas, contratos y fichas respondan preguntas.",
      "Qué herramienta usar según cómo trabajes hoy.",
    ],
  },
  {
    id: "canva",
    salon: "taller",
    desde: "17:15",
    hasta: "18:00",
    titulo: "Crea tu propio diseñador con Canva",
    porConfirmar: true,
    resumen: "Piezas que se ven profesionales sin diseñador.",
    contenido: [
      "Cómo armar tu plantilla de marca para que todo salga parejo.",
      "Las piezas que un asesor usa cada semana, resueltas de una vez.",
    ],
  },
];

/** Las sesiones de un salón, en orden. */
export const sesionesDe = (salon: SalonId) => SESIONES.filter((s) => s.salon === salon);

/** Una sesión por su id. */
export const sesionDe = (id: string) => SESIONES.find((s) => s.id === id);

/** Minutos desde medianoche, para ubicar la sesión en la línea del tiempo. */
export function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Los extremos de la jornada, calculados: si se agrega una sesión, la rejilla crece sola. */
export const INICIO = Math.min(...SESIONES.map((s) => minutos(s.desde)));
export const FIN = Math.max(...SESIONES.map((s) => minutos(s.hasta)));

export const HORAS = Array.from({ length: Math.ceil((FIN - INICIO) / 60) + 1 }, (_, i) => {
  const t = INICIO + i * 60;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:00`;
});

/** «10:00 a. m.» en vez de «10:00», que es como lo lee la gente acá. */
export function enReloj(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
