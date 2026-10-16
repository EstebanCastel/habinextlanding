/**
 * La entrada de una persona: el QR con el que pasa por la puerta y los datos
 * que van impresos alrededor.
 *
 * El QR no lo generamos nosotros: lo emite Luma al aprobar el cupo
 * (`check_in_qr_code`) y es el que reconoce su lector el día del evento.
 * Inventar uno propio significaría montar un segundo control de acceso en la
 * puerta, que es justo lo que no queremos.
 *
 * Mientras el pago no esté confirmado no hay QR, y eso no es un error: es el
 * estado normal de alguien que acaba de reservar. Por eso la respuesta
 * siempre trae `motivo`, para que la pantalla explique qué falta en vez de
 * quedarse en blanco.
 */

import { fichaDeEquipo, selloDeEquipo, urlDeEquipo } from "@/config/equipo";
import { eventoDeTier, traerInvitado } from "./luma";
import { porToken, type Registro, type Tier } from "./registros";

export type Entrada = {
  tier: Tier;
  nombre: string;
  correo: string;
  cedula?: string;
  /** URL que codifica el QR; null mientras no haya entrada emitida. */
  qr: string | null;
  /** Del equipo de Habi: su QR es su credencial, no una entrada de Luma. */
  equipo?: boolean;
  /** Por qué todavía no hay QR, en palabras que se le puedan mostrar a alguien. */
  motivo?: string;
  /** Página de la entrada en Luma, para quien prefiera abrirla allá. */
  enLuma?: string;
  /** El estado de la compra, para decidir si se ofrece pagar o mejorar a VIP. */
  etapa: Registro["etapa"];
  token: string;
};

const MOTIVOS: Partial<Record<Registro["etapa"], string>> = {
  por_pagar: "Tu QR aparece aquí apenas confirmemos tu pago.",
  registrado: "Tu QR aparece aquí apenas confirmemos tu pago.",
  mensaje_enviado: "Tu QR aparece aquí apenas confirmemos tu pago.",
  mensaje_entregado: "Tu QR aparece aquí apenas confirmemos tu pago.",
  mensaje_leido: "Tu QR aparece aquí apenas confirmemos tu pago.",
  pago_abierto: "Tu QR aparece aquí apenas confirmemos tu pago.",
  pago_confirmado: "Recibimos tu pago. Estamos emitiendo tu entrada.",
  rechazado: "Este registro no está activo. Escríbenos y lo revisamos.",
};

/** Arma la entrada de un registro, con el QR si ya existe. */
export async function entradaDe(token: string): Promise<Entrada | null> {
  const r = await porToken(token);
  if (!r) return null;

  const base: Entrada = {
    tier: r.tier,
    nombre: r.luma.nombre || r.luma.nombreCorto,
    correo: r.luma.email,
    ...(r.luma.cedula ? { cedula: r.luma.cedula } : {}),
    qr: null,
    etapa: r.etapa,
    token: r.token,
  };

  if (r.etapa !== "aprobado" || !r.luma.guestId) {
    return { ...base, motivo: MOTIVOS[r.etapa] ?? "Tu QR aparece aquí cuando tu entrada esté confirmada." };
  }

  const evento = r.luma.eventId || eventoDeTier(r.tier);
  const invitado = evento ? await traerInvitado(evento, r.luma.guestId).catch(() => null) : null;
  const g = (invitado?.guest ?? invitado) as Record<string, unknown> | null;
  const qr = typeof g?.check_in_qr_code === "string" ? g.check_in_qr_code : null;

  return {
    ...base,
    qr,
    ...(qr ? {} : { motivo: "Tu entrada está aprobada; el QR tarda unos minutos en emitirse." }),
    ...(typeof g?.url === "string" ? { enLuma: g.url } : {}),
  };
}

/**
 * La «entrada» de quien trabaja en el evento.
 *
 * El equipo no tiene cupo en Luma —entra sin registro— pero sí necesita
 * identificarse, así que su QR no es el de la puerta sino el de su propia
 * ficha de staff, firmada con el sello del correo. Con esto su credencial se
 * arma igual que la de un asistente y cabe en los mismos sitios: el reverso
 * del carnet y el pase de la billetera.
 *
 * El token de un registro abre su expediente; el equipo no tiene registro.
 * En su lugar va el sello, que sirve para lo mismo acá —distinguir un pase de
 * otro y mantenerlo estable entre descargas— y que de todos modos ya viaja
 * dentro de su propio QR.
 *
 * Devuelve `null` cuando ese correo no está en la lista o falta el secreto:
 * sin sello no hay credencial que valga, y una sin firmar sería peor que
 * ninguna.
 */
export function entradaDeEquipo(email: string, secreto: string, sitio: string): Entrada | null {
  const correo = email.trim().toLowerCase();
  const ficha = correo ? fichaDeEquipo(correo) : undefined;
  if (!ficha || !secreto) return null;

  return {
    tier: "general",
    nombre: `${ficha.nombre ?? ""} ${ficha.apellido ?? ""}`.trim() || correo,
    correo,
    ...(ficha.cedula ? { cedula: ficha.cedula } : {}),
    qr: urlDeEquipo(correo, secreto, sitio),
    equipo: true,
    etapa: "aprobado",
    token: `equipo:${selloDeEquipo(correo, secreto)}`,
  };
}
