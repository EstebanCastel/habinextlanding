/**
 * Los temas que aparecen solos en las respuestas abiertas.
 *
 * No son categorías inventadas en una reunión: salieron de leer las 220
 * respuestas del día y quedarse con lo que la gente repitió. Las reglas son
 * deterministas a propósito, no un modelo: el tablero se recalcula en cada
 * visita y tiene que dar el mismo número dos veces seguidas, y cuando alguien
 * pregunte «¿por qué esta respuesta cayó en comida?» la respuesta tiene que
 * poder mirarse.
 *
 * Una respuesta puede caer en varios temas, y así debe ser: «que no se crucen
 * las salas y que haya más café» son dos quejas, no una.
 */

export type Campo = "cambiar" | "aplicar";

export type Tema = {
  id: string;
  nombre: string;
  /** Una línea de qué hay adentro, para quien no va a leer las respuestas. */
  pista: string;
  campo: Campo;
  patron: RegExp;
};

/** Sin tildes, en minúscula y sin signos: las respuestas vienen escritas a la carrera. */
export const normalizar = (t: string): string =>
  (t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * «No cambiaría nada» no es un tema, es una respuesta entera. Se aparta antes
 * de buscar temas porque si no, «todo estuvo bien, más café» y «nada» acaban
 * contando lo mismo y el tablero se lee como si nadie tuviera quejas.
 */
export const SIN_QUEJA =
  /^(nada|no|ninguno|ninguna|nulo|n\/a|na)\b|^no (cambiaria|tengo|hay|le cambio)|^(sin|no tengo) (comentario|observacion|sugerencia|nada)|^todo (estuvo |fue |me parecio |salio )?(bien|excelente|perfecto|super|ok|optimo|correcto|genial|maravilloso|extraordinario|acorde|claro)|^(esta|estuvo) (perfecto|excelente|muy bien|bien)|^asi estuvo bien|^por ahora no|^en general nada|^10 de 10|^excelente|^todo bien|^ninguna observacion/;

export const TEMAS: Tema[] = [
  // ---------- lo que hay que arreglar ----------
  {
    id: "salas-cruzadas",
    nombre: "Las dos salas se cruzaban",
    pista: "Pedían un solo salón, o poder ver lo que se perdieron",
    campo: "cambiar",
    patron:
      /simultane|se cruza|cruzab|cruzar|crucen|cruce de|un solo salon|una sola sala|un solo escenario|un mismo salon|mismo auditorio|una sola sal|solo una sala|dos sal(a|on)|2 sal(a|on)|ambos salon|paralel|al mismo tiempo|a la misma hora|mismos horarios|no alcance a (entrar|participar|asistir)|no logre (entrar|ingresar)|no pude (entrar|asistir|participar)|me perdi|perderme|perdimos|perdiendo|tener que (elegir|escoger)|dificil (elegir|escoger)|elegir entre|escoger entre|menos (ponentes|conferencistas|panelistas)|todas las charlas|todos los talleres|participar (de|en) (todo|el total)|\b1 sola sal|decidir a cual|por separado|seoarado|horarios de las charlas|tiempos de las charlas|no seguidos|distribucion de las/,
  },
  {
    id: "comida",
    nombre: "Comida, café y almuerzo",
    pista: "Almuerzo solo para VIP, y café y agua que se acababan",
    campo: "cambiar",
    patron:
      /almuerz|almorzar|comida|aliment|\bcafe\b|tinto|\bagua\b|refriger|pasaboca|onces|aromatica|cat(h)?ering|vegetarian|snack|hidrat|bebida|restaurante/,
  },
  {
    id: "talleres-practicos",
    nombre: "Talleres más prácticos",
    pista: "Teoría donde esperaban ejercicio; el de TikTok es el más citado",
    campo: "cambiar",
    patron:
      /practic|teoric|teoria|didactic|tik ?tok|tictoc|tic toc|ejercicio|interactiv|demostracion|en vivo|computador|portatil|hacerlo de una vez|salir con|crear(lo)? en|manos a la obra|profundiz|superficial|mas contenido|alto valor|basico|enfocad|aprendamos|mas dinamic|mas activ/,
  },
  {
    id: "jornada",
    nombre: "La jornada fue muy larga",
    pista: "Piden dos días, media jornada o un sábado",
    campo: "cambiar",
    patron:
      /dos dias|2 dias|mas dias|otro dia|varios dias|jornada (larga|extensa|bastante)|muy larga|es larga|extensa|agotad|cansad|mas corto|mas corta|sabado|fin de semana|dos veces al ano|entre semana/,
  },
  {
    id: "tecnica",
    nombre: "Sonido, pantallas y enchufes",
    pista: "No había tomacorrientes, y el sonido y las diapositivas fallaron",
    campo: "cambiar",
    patron:
      /toma ?corriente|conector|enchufe|cargar|punto(s)? de energia|fuentes de energia|energia|sonido|microfono|audio|no se (entendia|escuchaba)|pantalla|pixel|diapositiv|proyec|señaliz|senaliz|puntualidad|se corrieron|corrieron (algunos )?horarios|itinerario|logistic|tecnic(a|o)\b|espacios/,
  },
  {
    id: "acceso",
    nombre: "Llegar, parquear y entrar",
    pista: "Parqueadero, el puente cerrado por obras y la fila de ingreso",
    campo: "cambiar",
    patron:
      /parqueader|parquear|puente|peatonal|obras|llegada al sitio|otro sitio|mas central|ubicacion|lugar del evento|orientacion al ingreso|al ingresar|la entrada|otra ciudad|no me dejaron (ingresar|entrar)|tenia reserva|respete la agenda/,
  },
  {
    id: "vip-general",
    nombre: "La diferencia entre VIP y General",
    pista: "La separación se sintió como trato desigual",
    campo: "cambiar",
    patron:
      /\bvip\b|general y vip|discrimin|para todos (los )?(participantes|asistentes|brokers)|igual (para|lo que)|mal gusto|no es justo|cortarle la cara/,
  },
  {
    id: "stands",
    nombre: "Stands, aliados y merch",
    pista: "Los stands no se entendieron y faltó material de marca",
    campo: "cambiar",
    patron:
      /\bstand|aliado|proveedor|merch|souvenir|llavero|sombrilla|iman|kit de entrega|publicidad de habi|patrocin/,
  },
  {
    id: "app",
    nombre: "La app y el internet",
    pista: "Se caía o costaba manejarla",
    campo: "cambiar",
    patron: /\bapp\b|aplicacion|aplicativo|internet|wi-?fi|la plataforma/,
  },
  {
    id: "agenda-clara",
    nombre: "Saber qué venía y dónde",
    pista: "Querían la agenda por anticipado y avisos de qué sigue en cada salón",
    campo: "cambiar",
    patron:
      /enviar la agenda|mandar la agenda|agenda (a tratar|con anticipacion|previa)|cual sigue|que sigue|distribucion de las (charlas|chrlas)|organizacion de la agenda|mejor organizacion|explicacion de (la|como)|dinamica del evento|claridad|reservar el cupo|separa el cupo|aforo/,
  },

  {
    id: "ponentes",
    nombre: "Quiénes hablan",
    pista: "Más bancos y aliados, otros perfiles, y menos propaganda",
    campo: "cambiar",
    patron:
      /mas (invitados|bancos|speaker|ponentes|conferencistas|panelistas|expertos)|otros (speaker|ponentes)|speaker (expertos|de)|los conferencistas|propaganda|expositor|invitar mas|mas participacion de los asistentes|networking|mas interaccion|interactuar|mas empatic|humilde/,
  },

  // ---------- lo que se llevan ----------
  {
    id: "ia",
    nombre: "Inteligencia artificial y agentes",
    pista: "Claude, asistentes, prompts y el segundo cerebro",
    campo: "aplicar",
    patron:
      /\bia\b|\bias\b|\biag\b|inteligencia artificial|\bai\b|claude|cloud|asistente|prompt|promp|agente|segundo cerebro|brain|chatgpt|automatiz|herramientas? (de|tecnolog)/,
  },
  {
    id: "redes",
    nombre: "Redes y contenido",
    pista: "Publicar seguido, video y el algoritmo",
    campo: "aplicar",
    patron:
      /redes|contenido|tik ?tok|tictoc|publicar|publicacion|algoritmo|instagram|facebook|\bvideo|reel|meta\b|campan|pauta|mercadeo|publicidad|digital/,
  },
  {
    id: "marca-personal",
    nombre: "Marca personal",
    pista: "El reto de las cuatro semanas de Camilo Olarte",
    campo: "aplicar",
    patron: /marca personal|olarte|marca propia|masca personal/,
  },
  {
    id: "crm",
    nombre: "CRM y seguimiento",
    pista: "Ordenar la base y no soltar al cliente",
    campo: "aplicar",
    patron:
      /\bcrm\b|\bcmr\b|seguimiento|agendamiento|agendar|base de datos|organiz|cronograma|proceso de venta|prospect/,
  },
  {
    id: "inversion",
    nombre: "Inversión y patrimonio",
    pista: "Lo de Juan Pablo Zuluaga y el crédito",
    campo: "aplicar",
    patron: /inversion|patrimoni|zuluaga|finanza|credito|rentabilidad|largo plazo/,
  },
  {
    id: "red-habi",
    nombre: "Mi Red y el inventario de Habi",
    pista: "Subir inmuebles y usar la red",
    campo: "aplicar",
    patron: /red habi|mi red|\bla red\b|inventario|referid|aliados de habi/,
  },
];

export type Agrupado = {
  tema: Tema;
  n: number;
  /** Lo que escribió la gente, tal cual, para quien quiera leer. */
  citas: { texto: string; nps: number }[];
};

/**
 * Agrupa las respuestas de un campo. Devuelve los temas con al menos una
 * respuesta, del más mencionado al menos, y aparte cuántas dijeron que no
 * cambiarían nada.
 */
export function agrupar(
  respuestas: { texto: string; nps: number }[],
  campo: Campo
): { temas: Agrupado[]; sinQueja: number; total: number; sinClasificar: number } {
  const temas = TEMAS.filter((t) => t.campo === campo);
  const cubos = new Map<string, Agrupado>(temas.map((t) => [t.id, { tema: t, n: 0, citas: [] }]));
  let sinQueja = 0;
  let sinClasificar = 0;
  let total = 0;

  for (const r of respuestas) {
    const t = normalizar(r.texto);
    if (t.length < 4) continue;
    total++;
    // Primero los temas: «todo bien pero más café» empieza como un elogio y
    // termina siendo una queja, y lo que vale es la queja.
    let cayo = false;
    for (const tema of temas) {
      if (!tema.patron.test(t)) continue;
      const c = cubos.get(tema.id)!;
      c.n++;
      // Las citas largas explican; las de tres palabras no dicen nada nuevo.
      if (r.texto.trim().length >= 40) c.citas.push(r);
      cayo = true;
    }
    if (cayo) continue;
    if (campo === "cambiar" && SIN_QUEJA.test(t)) sinQueja++;
    else sinClasificar++;
  }

  for (const c of cubos.values()) {
    c.citas.sort((a, b) => b.texto.length - a.texto.length);
    c.citas = c.citas.slice(0, 4);
  }

  return {
    temas: [...cubos.values()].filter((c) => c.n > 0).sort((a, b) => b.n - a.n),
    sinQueja,
    total,
    sinClasificar,
  };
}
