import { crearSiNoExiste, escribir, leer, listarRutas, modificar } from "./almacen";
import { activeStageIndex, precioNumerico, TICKETS, type Ticket } from "@/config/event";
import { nuevoToken } from "./seguridad";

/**
 * El embudo de una entrada, de punta a punta: alguien se registra en Luma, le
 * escribimos por WhatsApp, abre su link de pago, paga, y recién ahí se aprueba
 * su registro y Luma le manda la entrada.
 *
 * Cada paso queda anotado en el mismo documento. Eso es lo que después se
 * refleja en la hoja de cálculo: no un conteo, sino la historia de cada
 * persona con la hora exacta de cada cosa.
 */

export type Tier = "general" | "vip";

export type Etapa =
  | "por_pagar"
  | "registrado"
  | "mensaje_enviado"
  | "mensaje_entregado"
  | "mensaje_leido"
  | "pago_abierto"
  | "comprobante_recibido"
  | "pago_confirmado"
  | "aprobado"
  | "rechazado";

/** Orden del embudo. Solo se avanza; un DLR viejo nunca retrocede la etapa. */
const ORDEN: Etapa[] = [
  "por_pagar",
  "registrado",
  "mensaje_enviado",
  "mensaje_entregado",
  "mensaje_leido",
  "pago_abierto",
  "comprobante_recibido",
  "pago_confirmado",
  "aprobado",
];

export type EstadoEnvio = {
  enviadoEn?: string;
  messageId?: string;
  entregadoEn?: string;
  leidoEn?: string;
  abiertoEn?: string;
  clicEn?: string;
  error?: string;
  plantilla?: string;
};

export type Comprobante = {
  en: string;
  tipo: string;
  /** URL del archivo en Infobip. Caduca; el panel la abre con el operador presente. */
  url?: string;
  texto?: string;
};

export type Registro = {
  token: string;
  tier: Tier;
  etapa: Etapa;
  /**
   * Por dónde nació el registro. `luma`: se inscribió en Luma y le mandamos
   * el link de pago. `compra`: pagó primero desde la landing y se da de alta
   * en Luma después, ya aprobado.
   */
  via?: "luma" | "compra";
  luma: {
    guestId: string;
    eventId: string;
    email: string;
    nombre: string;
    nombreCorto: string;
    telefonoCrudo: string | null;
    registradoEn: string;
    estadoAprobacion: string;
    empresa?: string;
    /** Solo dígitos. Es lo que se coteja en la puerta contra el documento. */
    cedula?: string;
    /**
     * `utm_source` con el que la persona llegó a Luma. Es lo que permite saber
     * a quién atribuirle el registro cuando alguien comparte su enlace; llega
     * vacío en quien entró escribiendo la dirección a mano.
     */
    origen?: string;
    /** `utm_content`: el id de quien invitó, si llegó por un link personal. */
    contenido?: string;
  };
  /** Solo dígitos, con indicativo (57…). Es la llave del canal de WhatsApp. */
  telefono: string | null;
  whatsapp: {
    plantilla?: string;
    messageId?: string;
    enviadoEn?: string;
    entregadoEn?: string;
    leidoEn?: string;
    error?: string;
  };
  pago: {
    etiquetaEtapa: string;
    precio: string;
    abiertoEn?: string;
    url?: string;
    referencia?: string;
    montoCentavos?: number;
    confirmadoEn?: string;
    transaccionId?: string;
    comprobantes: Comprobante[];
  };
  aprobacion: {
    decididoEn?: string;
    decididoPor?: string;
    motivo?: string;
  };
  /**
   * Solo para General: el recordatorio de que por la diferencia se pasa a VIP.
   * `decision` queda en null mientras la persona no conteste — que es la
   * respuesta más común y significa que se queda en General.
   */
  upsell?: {
    ofrecidoEn?: string;
    diferencia?: string;
    respondidoEn?: string;
    decision?: "vip" | "general";
  };
  /**
   * Presente solo si la entrada salió de un código de invitación. Quien entra
   * por acá no pasa por el embudo de pago: nace aprobado.
   */
  cortesia?: { codigo: string; redimidoEn: string };
  /**
   * Los recordatorios de pago: qué se le mandó por cada canal y qué pasó con
   * cada envío. Separado del WhatsApp de bienvenida para no confundir «le
   * llegó el primer mensaje» con «le llegó el recordatorio».
   */
  recordatorio?: {
    whatsapp?: EstadoEnvio;
    sms?: EstadoEnvio;
    correo?: EstadoEnvio;
    ultimoEn?: string;
    veces?: number;
  };
  /** La confirmación de la entrada (correo, SMS y WhatsApp) cuando quedó en Luma. */
  confirmacion?: {
    whatsapp?: EstadoEnvio;
    sms?: EstadoEnvio;
    correo?: EstadoEnvio;
    enviadaEn?: string;
  };
  /** Bitácora append-only: es lo que permite auditar qué pasó y cuándo. */
  bitacora: { en: string; que: string; detalle?: string }[];
  creadoEn: string;
  actualizadoEn: string;
};

export const rutaRegistro = (token: string) => `registros/${token}.json`;
const rutaIndiceGuest = (guestId: string) => `indice/guest/${guestId}.json`;
const rutaIndiceTelefono = (telefono: string) => `indice/telefono/${telefono}.json`;
const rutaIndiceReferencia = (ref: string) => `indice/referencia/${ref.toLowerCase()}.json`;
/**
 * Marca de «este correo ya tiene registro, no le abras otro».
 *
 * La ponemos antes de dar de alta a alguien en Luma por nuestra cuenta —al
 * pasarlo a VIP o al redimir un código—, porque esa alta dispara un
 * `guest.registered` que si no crearía un registro nuevo y partiría a la
 * persona en dos.
 */
const rutaIndiceReserva = (email: string) =>
  `indice/reserva/${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}.json`;

/**
 * Normaliza a dígitos con indicativo de país. Luma entrega el número como lo
 * escribió la persona, y en Colombia lo normal es escribirlo sin indicativo
 * («300 123 4567»): esos diez dígitos se completan a 57XXXXXXXXXX, que es lo
 * único que Infobip acepta. Un número que no encaje devuelve null en vez de
 * inventar un destinatario.
 */
export function normalizarTelefono(crudo: string | null | undefined): string | null {
  const d = String(crudo ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10 && d.startsWith("3")) return `57${d}`;
  if (d.length === 12 && d.startsWith("57")) return d;
  // Otro país: se acepta tal cual si tiene forma de E.164 sin el "+".
  if (d.length >= 11 && d.length <= 15) return d;
  return null;
}

export function ticketDe(tier: Tier): Ticket {
  const t = TICKETS.find((x) => x.id === tier);
  if (!t) throw new Error(`tier desconocido: ${tier}`);
  return t;
}

/** Etapa de precio vigente hoy. Es lo que se le cobra a quien se registra ahora. */
export function precioVigente(tier: Tier, ahora = new Date()) {
  const ticket = ticketDe(tier);
  const etapa = ticket.stages[activeStageIndex(ticket.stages, ahora)];
  return { etiqueta: etapa.label, precio: etapa.price, nota: etapa.note };
}

/**
 * Cuánto más cuesta el VIP que el General en la etapa vigente. Es el número
 * con el que se le habla a quien eligió General, y cambia con la etapa: en
 * preventa la diferencia es de $100.000 y al final del calendario, de $160.000.
 */
export function diferenciaVip(ahora = new Date()): string {
  const general = precioNumerico(precioVigente("general", ahora).precio);
  const vip = precioNumerico(precioVigente("vip", ahora).precio);
  if (general !== null && vip !== null) return `$${(vip - general).toLocaleString("es-CO")}`;

  // La tarifa del día del evento se anuncia sin cifra ("En taquilla"). Para
  // hablarle a la persona se usa la última etapa que sí tiene precio, en vez
  // de mandarle un "$NaN" por WhatsApp.
  const g = ticketDe("general").stages;
  const v = ticketDe("vip").stages;
  for (let i = Math.min(g.length, v.length) - 1; i >= 0; i -= 1) {
    const pg = precioNumerico(g[i].price);
    const pv = precioNumerico(v[i].price);
    if (pg !== null && pv !== null) return `$${(pv - pg).toLocaleString("es-CO")}`;
  }
  return "la diferencia";
}

/**
 * Deja la cédula en dígitos. Luma no tiene campo numérico, así que la pregunta
 * es de texto libre y la gente la escribe como quiere: con puntos, con guiones,
 * con un "CC" delante. En la puerta se coteja contra un documento, y ahí «1.234»
 * y «1234» tienen que ser el mismo número.
 */
export function normalizarCedula(crudo: unknown): string | undefined {
  const d = String(crudo ?? "").replace(/\D/g, "");
  // Una cédula colombiana va de 6 a 10 dígitos; fuera de ahí es un dato malo
  // y es mejor guardarlo vacío que guardarlo mal.
  return d.length >= 6 && d.length <= 12 ? d : undefined;
}

export function primerNombre(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  if (!limpio) return "";
  const primero = limpio.split(" ")[0];
  // WhatsApp muestra el nombre tal cual; "JUAN" gritando queda mal.
  return primero.length > 2 && primero === primero.toUpperCase()
    ? primero[0] + primero.slice(1).toLowerCase()
    : primero;
}

export function avanzar(actual: Etapa, siguiente: Etapa): Etapa {
  if (actual === "rechazado" || siguiente === "rechazado") return siguiente;
  return ORDEN.indexOf(siguiente) > ORDEN.indexOf(actual) ? siguiente : actual;
}

export async function porToken(token: string): Promise<Registro | null> {
  return leer<Registro>(rutaRegistro(token));
}

export async function tokenDeGuest(guestId: string): Promise<string | null> {
  const i = await leer<{ token: string }>(rutaIndiceGuest(guestId));
  return i?.token ?? null;
}

export async function porTelefono(telefono: string): Promise<Registro | null> {
  const i = await leer<{ token: string }>(rutaIndiceTelefono(telefono));
  return i?.token ? porToken(i.token) : null;
}

export async function porReferencia(referencia: string): Promise<Registro | null> {
  const i = await leer<{ token: string }>(rutaIndiceReferencia(referencia));
  return i?.token ? porToken(i.token) : null;
}

export async function guardarReferencia(referencia: string, token: string): Promise<void> {
  await escribir(rutaIndiceReferencia(referencia), { token, en: new Date().toISOString() });
}

/**
 * Crea el registro de una persona, o devuelve el que ya existía.
 *
 * La idempotencia es lo importante: Luma reintenta un webhook hasta tres veces
 * y una persona puede cancelar y volver a registrarse. Sin el índice por
 * `guestId`, cada reintento crearía otro token y le mandaría otro WhatsApp con
 * otro link de pago a la misma persona.
 */
export async function crearORecuperar(datos: {
  guestId: string;
  eventId: string;
  tier: Tier;
  email: string;
  nombre: string;
  telefonoCrudo: string | null;
  registradoEn: string;
  estadoAprobacion: string;
  empresa?: string;
  cedula?: string;
  origen?: string;
  contenido?: string;
}): Promise<{ registro: Registro; nuevo: boolean }> {
  const ahora = new Date().toISOString();
  const token = nuevoToken();

  // Quien viene de un alta nuestra ya tiene registro: subió de General a VIP,
  // o redimió un código. Se reusa el que ya venía en camino en vez de
  // empezarle uno en blanco.
  const reservado = await leer<{ token: string }>(rutaIndiceReserva(datos.email));
  if (reservado?.token) {
    // La reserva puede llegar antes que el registro al que apunta: quien la
    // puso está a mitad de escribirlo. Se espera en vez de darlo por
    // inexistente, porque darlo por inexistente significa abrirle a esa
    // persona un segundo registro —y, si venía de un código, mandarle un link
    // de pago por una entrada que ya es suya.
    for (let intento = 0; intento < 5; intento += 1) {
      const previo = await porToken(reservado.token);
      if (previo) {
        await escribir(rutaIndiceGuest(datos.guestId), { token: previo.token, en: ahora });
        return { registro: previo, nuevo: false };
      }
      await new Promise((r) => setTimeout(r, 150 * (intento + 1)));
    }
  }

  // Reserva atómica del invitado. Si otro webhook llegó primero —Luma manda
  // `guest.registered` y `ticket.registered` casi a la vez— este pierde y se
  // queda con el registro que aquel creó, en vez de duplicar la persona.
  const gano = await crearSiNoExiste(rutaIndiceGuest(datos.guestId), { token, en: ahora });
  if (!gano) {
    for (let intento = 0; intento < 5; intento += 1) {
      const yaHecho = await tokenDeGuest(datos.guestId);
      const existente = yaHecho ? await porToken(yaHecho) : null;
      if (existente) return { registro: existente, nuevo: false };
      // El que ganó todavía está escribiendo su registro: se le da un momento.
      await new Promise((r) => setTimeout(r, 120 * (intento + 1)));
    }
    throw new Error(`el índice de ${datos.guestId} existe pero su registro no aparece`);
  }

  const { etiqueta, precio } = precioVigente(datos.tier);
  const telefono = normalizarTelefono(datos.telefonoCrudo);

  const registro: Registro = {
    token,
    tier: datos.tier,
    etapa: "registrado",
    luma: {
      guestId: datos.guestId,
      eventId: datos.eventId,
      email: datos.email,
      nombre: datos.nombre,
      nombreCorto: primerNombre(datos.nombre),
      telefonoCrudo: datos.telefonoCrudo,
      registradoEn: datos.registradoEn,
      estadoAprobacion: datos.estadoAprobacion,
      ...(datos.empresa ? { empresa: datos.empresa } : {}),
      ...(datos.cedula ? { cedula: datos.cedula } : {}),
      ...(datos.origen ? { origen: datos.origen } : {}),
      ...(datos.contenido ? { contenido: datos.contenido } : {}),
    },
    telefono,
    whatsapp: {},
    pago: { etiquetaEtapa: etiqueta, precio, comprobantes: [] },
    aprobacion: {},
    bitacora: [{ en: ahora, que: "registrado en Luma", detalle: datos.estadoAprobacion }],
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  await escribir(rutaRegistro(token), registro);
  if (telefono) await escribir(rutaIndiceTelefono(telefono), { token, en: ahora });

  return { registro, nuevo: true };
}

/**
 * Pasa un registro de General a VIP.
 *
 * En Luma son dos eventos distintos, así que subir de categoría es darse de
 * alta en el de VIP y bajarse del de General. El índice por correo se escribe
 * **antes** de tocar Luma: el alta dispara `guest.registered` del evento VIP,
 * y sin esa marca puesta de antemano ese webhook crearía un registro nuevo y
 * la persona quedaría partida en dos.
 */
export async function reservarCorreo(email: string, token: string): Promise<void> {
  await escribir(rutaIndiceReserva(email), { token, en: new Date().toISOString() });
}

export async function soltarCorreo(email: string): Promise<void> {
  await escribir(rutaIndiceReserva(email), { token: "", en: new Date().toISOString() });
}

/** Reapunta el registro al invitado nuevo del otro evento. */
export async function apuntarAInvitado(token: string, guestId: string): Promise<void> {
  await escribir(rutaIndiceGuest(guestId), { token, en: new Date().toISOString() });
}

/**
 * Registro de alguien que entró con un código de invitación. Nace en la última
 * etapa: no hay pago que esperar ni aprobación que pedir, porque el código ya
 * era la autorización y Luma acaba de mandarle la entrada.
 */
export async function crearCortesia(datos: {
  token: string;
  tier: Tier;
  codigo: string;
  guestId: string;
  eventId: string;
  email: string;
  nombre: string;
  telefonoCrudo: string | null;
  cedula?: string;
  redimidoEn: string;
}): Promise<Registro> {
  const telefono = normalizarTelefono(datos.telefonoCrudo);
  const registro: Registro = {
    token: datos.token,
    tier: datos.tier,
    etapa: "aprobado",
    luma: {
      guestId: datos.guestId,
      eventId: datos.eventId,
      email: datos.email,
      nombre: datos.nombre,
      nombreCorto: primerNombre(datos.nombre),
      telefonoCrudo: datos.telefonoCrudo,
      registradoEn: datos.redimidoEn,
      estadoAprobacion: "approved",
      ...(datos.cedula ? { cedula: datos.cedula } : {}),
    },
    telefono,
    whatsapp: {},
    pago: { etiquetaEtapa: "Cortesía", precio: "$0", comprobantes: [] },
    aprobacion: {
      decididoEn: datos.redimidoEn,
      decididoPor: `código ${datos.codigo}`,
    },
    cortesia: { codigo: datos.codigo, redimidoEn: datos.redimidoEn },
    bitacora: [{ en: datos.redimidoEn, que: "redimió un código de invitación", detalle: datos.codigo }],
    creadoEn: datos.redimidoEn,
    actualizadoEn: datos.redimidoEn,
  };

  await escribir(rutaRegistro(datos.token), registro);
  if (datos.guestId) await escribir(rutaIndiceGuest(datos.guestId), { token: datos.token, en: datos.redimidoEn });
  if (telefono) await escribir(rutaIndiceTelefono(telefono), { token: datos.token, en: datos.redimidoEn });
  return registro;
}

/**
 * Registro de alguien que compra desde la landing: paga primero y se da de
 * alta en Luma después. Nace en `por_pagar`, sin invitado de Luma; el correo
 * queda reservado para que, cuando se le dé de alta, el webhook de Luma
 * reconozca el registro en vez de abrirle otro.
 */
export async function crearCompra(datos: {
  tier: Tier;
  email: string;
  nombre: string;
  telefonoCrudo: string | null;
  cedula?: string;
  origen?: string;
  contenido?: string;
}): Promise<Registro> {
  const ahora = new Date().toISOString();
  const token = nuevoToken();
  const telefono = normalizarTelefono(datos.telefonoCrudo);
  const { etiqueta, precio } = precioVigente(datos.tier);
  const registro: Registro = {
    token,
    tier: datos.tier,
    etapa: "por_pagar",
    via: "compra",
    luma: {
      guestId: "",
      eventId: "",
      email: datos.email.trim().toLowerCase(),
      nombre: datos.nombre,
      nombreCorto: primerNombre(datos.nombre),
      telefonoCrudo: datos.telefonoCrudo,
      registradoEn: ahora,
      estadoAprobacion: "sin_luma",
      ...(datos.cedula ? { cedula: datos.cedula } : {}),
      ...(datos.origen ? { origen: datos.origen } : {}),
      ...(datos.contenido ? { contenido: datos.contenido } : {}),
    },
    telefono,
    whatsapp: {},
    pago: { etiquetaEtapa: etiqueta, precio, comprobantes: [] },
    aprobacion: {},
    bitacora: [{ en: ahora, que: "empezó su compra desde la landing", detalle: datos.tier }],
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
  await escribir(rutaRegistro(token), registro);
  await reservarCorreo(registro.luma.email, token);
  if (telefono) await escribir(rutaIndiceTelefono(telefono), { token, en: ahora });
  return registro;
}

/** Aplica un cambio sobre el registro, anota la bitácora y refresca la etapa. */
export async function anotar(
  token: string,
  que: string,
  cambio: (r: Registro) => Partial<Registro> & { etapa?: Etapa },
  detalle?: string
): Promise<Registro | null> {
  return modificar<Registro>(rutaRegistro(token), (actual) => {
    if (!actual) return null;
    const parche = cambio(actual);
    const ahora = new Date().toISOString();
    return {
      ...actual,
      ...parche,
      etapa: parche.etapa ? avanzar(actual.etapa, parche.etapa) : actual.etapa,
      bitacora: [...actual.bitacora, { en: ahora, que, ...(detalle ? { detalle } : {}) }].slice(-60),
      actualizadoEn: ahora,
    };
  });
}

/** Todos los registros, del más reciente al más viejo. Alimenta panel y hoja. */
export async function todos(tope = 2000): Promise<Registro[]> {
  const rutas = await listarRutas("registros/", tope);
  const lote = 20;
  const salida: Registro[] = [];
  for (let i = 0; i < rutas.length; i += lote) {
    const trozo = await Promise.all(rutas.slice(i, i + lote).map((r) => leer<Registro>(r)));
    for (const r of trozo) if (r) salida.push(r);
  }
  return salida.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}
