import { crearSiNoExiste, escribir, leer, listarRutas, modificar } from "./almacen";
import { activeStageIndex, TICKETS, type Ticket } from "@/config/event";
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
  "registrado",
  "mensaje_enviado",
  "mensaje_entregado",
  "mensaje_leido",
  "pago_abierto",
  "comprobante_recibido",
  "pago_confirmado",
  "aprobado",
];

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
  /** Bitácora append-only: es lo que permite auditar qué pasó y cuándo. */
  bitacora: { en: string; que: string; detalle?: string }[];
  creadoEn: string;
  actualizadoEn: string;
};

export const rutaRegistro = (token: string) => `registros/${token}.json`;
const rutaIndiceGuest = (guestId: string) => `indice/guest/${guestId}.json`;
const rutaIndiceTelefono = (telefono: string) => `indice/telefono/${telefono}.json`;
const rutaIndiceReferencia = (ref: string) => `indice/referencia/${ref.toLowerCase()}.json`;
const rutaIndiceUpgrade = (email: string) =>
  `indice/upgrade/${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}.json`;

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
  const aNumero = (precio: string) => Number(precio.replace(/[^\d]/g, ""));
  const general = aNumero(precioVigente("general", ahora).precio);
  const vip = aNumero(precioVigente("vip", ahora).precio);
  return `$${(vip - general).toLocaleString("es-CO")}`;
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
}): Promise<{ registro: Registro; nuevo: boolean }> {
  const ahora = new Date().toISOString();
  const token = nuevoToken();

  // Quien vuelve de un upsell ya tiene registro: subió de General a VIP y
  // Luma lo dio de alta como invitado nuevo en el otro evento. Se reusa el
  // registro que ya venía en camino en vez de empezarle uno en blanco.
  const upgrade = await leer<{ token: string }>(rutaIndiceUpgrade(datos.email));
  if (upgrade?.token) {
    const previo = await porToken(upgrade.token);
    if (previo) {
      await escribir(rutaIndiceGuest(datos.guestId), { token: previo.token, en: ahora });
      return { registro: previo, nuevo: false };
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
export async function marcarUpgradePendiente(email: string, token: string): Promise<void> {
  await escribir(rutaIndiceUpgrade(email), { token, en: new Date().toISOString() });
}

export async function limpiarUpgrade(email: string): Promise<void> {
  await escribir(rutaIndiceUpgrade(email), { token: "", en: new Date().toISOString() });
}

/** Reapunta el registro al invitado nuevo del otro evento. */
export async function apuntarAInvitado(token: string, guestId: string): Promise<void> {
  await escribir(rutaIndiceGuest(guestId), { token, en: new Date().toISOString() });
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
