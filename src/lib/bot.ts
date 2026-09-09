import {
  agregarInvitado,
  buscarInvitadoPorEmail,
  eventoDeTier,
  rechazarInvitado,
} from "./luma";
import * as codigos from "./codigos";
import {
  anotar,
  apuntarAInvitado,
  crearCortesia,
  diferenciaVip,
  precioVigente,
  reservarCorreo,
  soltarCorreo,
  type Registro,
  type Tier,
} from "./registros";
import { nuevoToken } from "./seguridad";
import { enviarPlantilla, enviarTexto } from "./whatsapp";

/**
 * El bot de boletería. Toda la conversación cabe en dos decisiones:
 *
 *   se registró  →  ¿VIP o General?
 *                   VIP     → link de pago, y a esperar el comprobante
 *                   General → link de pago + «por X más te pasas a VIP»
 *                             └─ si dice que sí → se pasa a VIP y recibe el
 *                                link del VIP; si no dice nada, sigue en
 *                                General, que es lo que la mayoría hará
 *
 * De ahí en adelante solo queda recibir el comprobante y esperar a que alguien
 * apruebe en Luma. La aprobación no vive acá: se hace desde Luma, y este
 * servicio se entera por el webhook `guest.updated`.
 */

/** Payloads de los botones. Llevan el token para saber de quién es la respuesta. */
export const BOTON_VIP = "VIP";
export const BOTON_DUDA = "DUDA";
const payload = (prefijo: string, token: string) => `${prefijo}_${token}`;

/**
 * Cuando el bot no sabe qué hacer, se lo pasa a una persona.
 *
 * Va por plantilla y no por texto libre a propósito: quien opera no le escribe
 * a la línea todos los días, así que la ventana de 24 horas de Meta suele
 * estar cerrada y un mensaje de texto se perdería justo cuando más falta hace.
 *
 * Nunca lanza. Que falle un aviso no puede tumbar la conversación con la
 * persona que está del otro lado.
 */
export async function escalarAUnaPersona(
  registro: Registro,
  quePaso: string
): Promise<void> {
  const destino = process.env.WHATSAPP_ESCALAMIENTO;
  const plantilla = process.env.INFOBIP_TPL_ALERTA;
  if (!destino || !plantilla) return;

  const quien =
    `${registro.luma.nombre || "Sin nombre"}` +
    `${registro.telefono ? ` (+${registro.telefono})` : ""}` +
    ` · ${registro.tier === "vip" ? "VIP" : "General"}`;

  try {
    await enviarPlantilla({
      a: destino,
      plantilla,
      placeholders: [quien.slice(0, 300), quePaso.slice(0, 500)],
      botones: [],
    });
    await anotar(registro.token, "escalado a una persona", () => ({}), quePaso.slice(0, 200));
  } catch (error) {
    console.warn("[bot] no se pudo escalar:", (error as Error).message);
  }
}

/**
 * Primer mensaje, el que sale apenas alguien se registra en Luma.
 *
 * Son dos plantillas distintas porque son dos conversaciones distintas: a
 * quien ya eligió VIP no hay nada que ofrecerle, y a quien eligió General se
 * le muestra qué se está perdiendo antes de que pague — que es el único
 * momento en que ese mensaje no suena a venta insistente, porque todavía no
 * ha pagado nada.
 */
export async function darLaBienvenida(registro: Registro): Promise<void> {
  if (!registro.telefono) {
    await anotar(
      registro.token,
      "sin WhatsApp",
      (r) => ({ whatsapp: { ...r.whatsapp, error: "el registro no trae un celular usable" } }),
      registro.luma.telefonoCrudo || "(vacío)"
    );
    // Se registró y no hay por dónde escribirle: es una venta que se pierde en
    // silencio si nadie se entera.
    await escalarAUnaPersona(
      registro,
      `se registró sin un celular usable ("${registro.luma.telefonoCrudo || "vacío"}"). ` +
        `Su correo es ${registro.luma.email}`
    );
    return;
  }
  if (registro.whatsapp.enviadoEn) return; // ya se le escribió

  const esVip = registro.tier === "vip";
  const plantilla = esVip
    ? process.env.INFOBIP_TPL_VIP
    : process.env.INFOBIP_TPL_GENERAL_UPSELL;
  if (!plantilla) {
    await anotar(registro.token, "sin plantilla configurada", () => ({}));
    return;
  }

  const diferencia = diferenciaVip();
  const nombre = registro.luma.nombreCorto || "hola";

  const salida = await enviarPlantilla({
    a: registro.telefono,
    plantilla,
    // El orden es el de los marcadores del cuerpo de cada plantilla: la de VIP
    // lleva nombre y token; la de General mete la diferencia de precio en medio.
    placeholders: esVip ? [nombre, registro.token] : [nombre, diferencia, registro.token],
    botones: esVip
      ? [payload(BOTON_DUDA, registro.token)]
      : [payload(BOTON_VIP, registro.token), payload(BOTON_DUDA, registro.token)],
    callbackData: { token: registro.token },
  }).catch((error: Error) => ({
    ok: false as const,
    status: 0,
    messageId: null,
    estado: null,
    error: error.message,
  }));

  await anotar(
    registro.token,
    salida.ok ? "WhatsApp de bienvenida enviado" : "falló el envío de WhatsApp",
    (r) => ({
      etapa: salida.ok ? ("mensaje_enviado" as const) : r.etapa,
      whatsapp: {
        ...r.whatsapp,
        plantilla,
        ...(salida.messageId ? { messageId: salida.messageId } : {}),
        ...(salida.ok ? { enviadoEn: new Date().toISOString(), error: undefined } : {}),
        ...(salida.ok ? {} : { error: salida.error || `HTTP ${salida.status}` }),
      },
      ...(esVip || !salida.ok
        ? {}
        : { upsell: { ...r.upsell, ofrecidoEn: new Date().toISOString(), diferencia } }),
    }),
    salida.ok ? (salida.estado ?? undefined) : salida.error
  );

  if (!salida.ok) {
    await escalarAUnaPersona(
      registro,
      `no se le pudo mandar el WhatsApp de bienvenida: ${salida.error ?? `HTTP ${salida.status}`}`
    );
  }
}

/**
 * Alguien que venía por General tocó «Prefiero el VIP».
 *
 * En Luma son dos eventos separados, así que subir de categoría es darse de
 * alta en el de VIP y bajarse del de General. El orden importa: primero se
 * marca el upgrade —porque el alta dispara un `guest.registered` que si no
 * partiría a la persona en dos registros—, después se da de alta, y solo al
 * final se la baja del evento viejo. Si algo falla en medio, la persona queda
 * inscrita en los dos y eso se arregla mirando; queda registrado en la
 * bitácora.
 */
export async function pasarAVip(registro: Registro): Promise<{ ok: boolean; nota: string }> {
  if (registro.tier === "vip") return { ok: true, nota: "ya era VIP" };

  const eventoVip = eventoDeTier("vip");
  const eventoGeneral = registro.luma.eventId;
  if (!eventoVip) return { ok: false, nota: "falta LUMA_EVENT_VIP" };

  await reservarCorreo(registro.luma.email, registro.token);

  const alta = await agregarInvitado(eventoVip, {
    email: registro.luma.email,
    nombre: registro.luma.nombre,
    telefono: registro.luma.telefonoCrudo || (registro.telefono ? `+${registro.telefono}` : null),
  });
  if (!alta.ok) {
    await soltarCorreo(registro.luma.email);
    await anotar(registro.token, "no se pudo pasar a VIP", () => ({}), alta.cuerpo);
    return { ok: false, nota: `Luma rechazó el alta en VIP (${alta.status})` };
  }

  // El alta no devuelve el id del invitado, así que se busca por correo. Sin
  // ese id no se podría relacionar la aprobación que se haga después en Luma.
  const nuevo = await buscarInvitadoPorEmail(eventoVip, registro.luma.email);
  if (nuevo?.id) await apuntarAInvitado(registro.token, nuevo.id);

  const { etiqueta, precio } = precioVigente("vip");
  const actualizado = await anotar(
    registro.token,
    "se pasó a VIP desde WhatsApp",
    (r) => ({
      tier: "vip" as const,
      luma: { ...r.luma, eventId: eventoVip, ...(nuevo?.id ? { guestId: nuevo.id } : {}) },
      // El precio se recalcula: ya no paga General.
      pago: { ...r.pago, etiquetaEtapa: etiqueta, precio, abiertoEn: undefined, url: undefined },
      upsell: { ...r.upsell, respondidoEn: new Date().toISOString(), decision: "vip" as const },
    }),
    precio
  );

  // Bajarlo de General va al final y sin correo: que Luma le mande un "no
  // asistirás" justo cuando acaba de subir de categoría sería desconcertante.
  if (eventoGeneral && eventoGeneral !== eventoVip) {
    await rechazarInvitado(eventoGeneral, registro.luma.guestId, undefined, false).catch(() => null);
  }
  await soltarCorreo(registro.luma.email);

  // La persona acaba de escribirnos, así que la ventana de 24 horas de Meta
  // está abierta y esto puede ir como texto libre, sin plantilla.
  if (actualizado?.telefono) {
    await enviarTexto({
      a: actualizado.telefono,
      texto:
        `¡Excelente decisión, ${actualizado.luma.nombreCorto}! 🙌 Te pasamos a *VIP*.\n\n` +
        `Vas a estar en primeras filas, con acceso a la zona VIP, almuerzo, kit premium, ` +
        `las guías exclusivas y tu avatar digital. Son 250 cupos y uno acaba de quedar a tu nombre.\n\n` +
        `Tu entrada VIP queda en ${precio} (${etiqueta.toLowerCase()}). Este es tu link seguro y personal:\n` +
        `https://www.habinext.com/p/${actualizado.token}\n\n` +
        `Apenas confirmemos el pago te llega tu entrada con el código QR. 💜`,
    }).catch(() => null);
  }

  return { ok: true, nota: "pasado a VIP" };
}

/** Acuse cuando alguien manda el comprobante. */
export const RESPUESTA_COMPROBANTE =
  "¡Gracias! 🙌 Ya recibimos tu comprobante y lo estamos revisando. " +
  "Apenas quede confirmado te llega tu entrada de Habi Next al correo, con tu código QR. " +
  "Te avisamos por acá mismo cuando esté lista.";

export const RESPUESTA_DUDA =
  "¡Hola! 👋 Con gusto te ayudamos. Cuéntanos por acá qué necesitas saber de Habi Next " +
  "y una persona del equipo te responde por este mismo chat.";

/**
 * Lo que se le contesta a alguien cuyo mensaje el bot no supo resolver. Se dice
 * en primera persona y sin prometer un tiempo que no controlamos: lo que sí es
 * cierto es que a partir de aquí hay una persona mirando.
 */
export const RESPUESTA_ESCALADA =
  "¡Gracias por escribirnos! 🙌 Esto lo va a ver una persona del equipo, " +
  "que te responde por acá mismo.";

/** Lo que se le dice a quien acaba de ser aprobado en Luma. */
export function textoDeAprobacion(nombre: string): string {
  return (
    `¡Listo${nombre ? `, ${nombre}` : ""}! 🎉 Tu registro a Habi Next quedó aprobado.\n\n` +
    "Tu entrada con el código QR va en camino al correo con el que te registraste. " +
    "Guárdala: es la que te van a pedir en la puerta.\n\n" +
    "Nos vemos el martes 20 de octubre en el Centro de Convenciones Avenida 68. 💜"
  );
}

/**
 * Redime un código de invitación: la entrada sale gratis y aprobada.
 *
 * Es el único camino en que alguien queda aprobado sin que una persona lo
 * mire, y se sostiene porque el código es la autorización: alguien del equipo
 * lo creó, decidió cuántas entradas regala y hasta cuándo sirve. Por eso el
 * cupo se descuenta antes de tocar Luma y se devuelve si el alta falla.
 *
 * A diferencia del registro normal, aquí no hay embudo de pago: se da de alta
 * en Luma con `approval_status: "approved"` —y Luma manda la entrada con el QR
 * en el acto— y el WhatsApp que sale es de bienvenida, sin link de pago.
 */
export async function redimirCodigo(datos: {
  codigo: string;
  tier: Tier;
  nombre: string;
  email: string;
  telefono: string | null;
}): Promise<{ ok: boolean; nota: string; token?: string }> {
  const evento = eventoDeTier(datos.tier);
  if (!evento) return { ok: false, nota: "Ese evento no está configurado" };

  const correo = datos.email.trim().toLowerCase();
  const token = nuevoToken();

  const cupo = await codigos.tomarCupo(datos.codigo, {
    email: correo,
    nombre: datos.nombre,
    tier: datos.tier,
    token,
  });
  if (!cupo.ok) return { ok: false, nota: codigos.explicar(cupo.motivo) };

  const ahora = new Date().toISOString();

  // El orden de estos dos pasos es lo que evita que la persona termine con dos
  // registros. El alta en Luma dispara un `guest.registered` que vuelve por el
  // webhook casi de inmediato, y ese webhook necesita encontrar **ya escrito**
  // el registro al que apunta la reserva. Si solo dejáramos la marca y
  // creáramos el registro después del alta, el webhook llegaría en medio, no
  // encontraría nada y abriría un registro de pago paralelo — a alguien que
  // acaba de entrar gratis.
  await reservarCorreo(correo, token);
  const registro = await crearCortesia({
    token,
    tier: datos.tier,
    codigo: codigos.normalizar(datos.codigo),
    guestId: "",
    eventId: evento,
    email: correo,
    nombre: datos.nombre,
    telefonoCrudo: datos.telefono,
    redimidoEn: ahora,
  });

  const alta = await agregarInvitado(evento, {
    email: correo,
    nombre: datos.nombre,
    telefono: datos.telefono,
    aprobado: true,
  });
  if (!alta.ok) {
    await soltarCorreo(correo);
    await codigos.devolverCupo(datos.codigo, token);
    await anotar(token, "no se pudo dar de alta en Luma", () => ({}), alta.cuerpo);
    return { ok: false, nota: "No pudimos registrarte en Luma. Inténtalo de nuevo en un momento." };
  }

  // El id del invitado no viene en la respuesta del alta; sin él no se podría
  // relacionar después nada que se haga desde Luma con esta persona.
  const invitado = await buscarInvitadoPorEmail(evento, correo);
  if (invitado?.id) {
    await apuntarAInvitado(token, invitado.id);
    await anotar(token, "entrada emitida por Luma", (r) => ({
      luma: { ...r.luma, guestId: invitado.id },
    }));
  }

  await soltarCorreo(correo);

  if (registro.telefono) {
    const plantilla = process.env.INFOBIP_TPL_CORTESIA;
    if (plantilla) {
      const salida = await enviarPlantilla({
        a: registro.telefono,
        plantilla,
        placeholders: [
          registro.luma.nombreCorto || "hola",
          datos.tier === "vip" ? "VIP" : "General",
        ],
        botones: [],
        callbackData: { token },
      }).catch(() => null);
      if (salida?.ok) {
        await anotar(token, "WhatsApp de cortesía enviado", (r) => ({
          whatsapp: { ...r.whatsapp, plantilla, enviadoEn: ahora, messageId: salida.messageId ?? undefined },
        }));
      }
    }
  }

  return { ok: true, nota: "Entrada confirmada", token };
}
