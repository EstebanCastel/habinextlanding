import { pasarAVip } from "./bot";
import { enviarTexto } from "./whatsapp";
import { aprobarInvitado, buscarInvitadoPorEmail, eventoDeTier, rechazarInvitado } from "./luma";
import {
  anotar,
  descartar,
  olvidarInvitado,
  porToken,
  reservarCorreo,
  tokenDeGuest,
  type Registro,
} from "./registros";

/**
 * «Pagó el upgrade a VIP», marcado a mano desde el panel.
 *
 * El pago del upgrade no lo confirma nadie automáticamente: el webhook de
 * Wompi nunca quedó conectado, así que la plata se ve en Wompi, la persona
 * manda su comprobante y quien lo recibe marca acá. Marcarlo deja a la persona
 * aprobada en el evento VIP y le quita la entrada General.
 *
 * **No le llega nada.** Ni correo de Luma, ni WhatsApp, ni SMS. Para cuando se
 * marca el check, quien cobró ya habló con la persona y le dijo lo que tenía
 * que decirle; un mensaje automático encima solo confunde.
 *
 * Hay dos caminos porque hay dos formas de llegar a este botón:
 *
 * - **Tiene un registro VIP aparte.** Es quien tocó «Prefiero el VIP» en
 *   WhatsApp o se inscribió por su cuenta en el evento VIP: le quedó un
 *   registro VIP esperando el pago y el General viejo sigue vivo. Se aprueba el
 *   VIP y se borra el General, que es lo que sobra.
 * - **Solo tiene el General.** Se le sube de categoría ese mismo registro
 *   (`pasarAVip`), que crea el invitado en el evento VIP y baja el de General.
 *
 * En los dos casos el registro de General deja de existir: no queremos a nadie
 * ocupando dos cupos.
 */
export async function marcarUpgradePagado(
  registro: Registro,
  decididoPor = "panel · upgrade pagado"
): Promise<{ ok: boolean; nota: string }> {
  if (registro.tier === "vip") return { ok: false, nota: "Esa persona ya es VIP" };

  const eventoVip = eventoDeTier("vip");
  if (!eventoVip) return { ok: false, nota: "falta LUMA_EVENT_VIP" };

  const correo = registro.luma.email;
  const nombre = registro.luma.nombreCorto || registro.luma.nombre;

  // ¿Ya existe en el evento VIP? Se pregunta por correo porque el registro
  // VIP, si lo hay, es otro distinto y no lo conocemos desde acá.
  const enVip = await buscarInvitadoPorEmail(eventoVip, correo).catch(() => null);
  const tokenVip = enVip?.id ? await tokenDeGuest(enVip.id).catch(() => null) : null;
  const otro = tokenVip && tokenVip !== registro.token ? await porToken(tokenVip) : null;

  if (enVip?.id && otro && otro.tier === "vip") {
    if (enVip.estado !== "approved") {
      // Sin correo: la aprobación en Luma dispara la entrada por mail y acá no
      // se le manda nada a nadie.
      const ap = await aprobarInvitado(eventoVip, enVip.id, undefined, false);
      if (!ap.ok) return { ok: false, nota: `Luma no aprobó la entrada VIP (${ap.status})` };
    }
    const ahora = new Date().toISOString();
    await anotar(
      otro.token,
      "pagó el upgrade a VIP, verificado a mano en el panel",
      (r) => ({
        etapa: "aprobado" as const,
        luma: { ...r.luma, estadoAprobacion: "approved" },
        pago: { ...r.pago, confirmadoEn: r.pago.confirmadoEn ?? ahora },
        aprobacion: {
          ...r.aprobacion,
          decididoEn: r.aprobacion.decididoEn ?? ahora,
          decididoPor,
        },
      }),
      decididoPor
    );
    const baja = await borrarLaGeneral(registro, otro.token);
    return {
      ok: true,
      nota: baja
        ? `${nombre} quedó en VIP y se le quitó la General. No se le avisó nada.`
        : `${nombre} quedó en VIP, pero Luma no aceptó bajarla de General: revisa que no ocupe dos cupos.`,
    };
  }

  // Solo tiene la General: se le sube de categoría ese mismo registro.
  const res = await pasarAVip(registro, { pagado: true, decididoPor });
  if (!res.ok) return res;
  return { ok: true, nota: `${nombre} pasó a VIP con el pago marcado a mano. No se le avisó nada.` };
}

/**
 * Le quita la entrada General a quien acaba de quedar en VIP.
 *
 * Se baja del evento General en Luma sin correo, se borra el registro y se
 * deja el correo apuntando al registro VIP, para que un webhook tardío del
 * invitado viejo no vuelva a abrir una General.
 *
 * Si Luma no acepta la baja **no se borra nada**: la persona seguiría aprobada
 * en General con su QR válido, y borrar el registro dejaría esa entrada viva
 * sin rastro en el panel, que es la peor combinación posible. Queda anotado
 * para que alguien lo vea y lo arregle a mano.
 */
async function borrarLaGeneral(registro: Registro, tokenVip: string): Promise<boolean> {
  const eventoGeneral = registro.luma.eventId;
  if (eventoGeneral && registro.luma.guestId) {
    const baja = await rechazarInvitado(eventoGeneral, registro.luma.guestId, undefined, false).catch(
      () => null
    );
    if (!baja?.ok) {
      await anotar(
        registro.token,
        "quedó en VIP pero Luma no aceptó bajarla de General: sigue ocupando ese cupo",
        () => ({}),
        `invitado ${registro.luma.guestId} · ${baja ? `HTTP ${baja.status}` : "sin respuesta"}`
      ).catch(() => null);
      return false;
    }
  }
  if (registro.luma.guestId) await olvidarInvitado(registro.luma.guestId).catch(() => null);
  await descartar(registro.token);
  await reservarCorreo(registro.luma.email, tokenVip).catch(() => null);
  return true;
}

/** El cobro del cambio de General a VIP: un link de Wompi de monto fijo. */
export const UPGRADE_VIP = {
  monto: "$160.000",
  pago: "https://checkout.wompi.co/l/QfUXmc",
  evento: "https://luma.com/habinext-vip",
};

/**
 * Los pasos para pasarse a VIP, por WhatsApp.
 *
 * No toca Luma ni mueve a nadie: es la respuesta a «quiero el VIP». La persona
 * paga, se inscribe sola en el evento VIP y manda su comprobante; recién ahí
 * alguien marca el check del upgrade, que es lo que de verdad la cambia.
 *
 * Por eso el paso 1 dice que no active su código de General: si lo activa,
 * gasta el código y ocupa un cupo que después hay que deshacer.
 */
export async function mandarLinkDeUpgrade(registro: Registro): Promise<{ ok: boolean; nota: string }> {
  const nombre = registro.luma.nombreCorto || registro.luma.nombre || "";
  if (!registro.telefono) return { ok: false, nota: `${nombre || "Esa persona"} no tiene un celular usable` };

  const texto =
    `Hola ${nombre} 👋 Cambiarte de *General a VIP* sí se puede, pero tenemos *cupo limitado*.\n\n` +
    `Estos son los pasos:\n\n` +
    `1. *No actives tu código de General.*\n` +
    `2. Paga el incremento a VIP, ${UPGRADE_VIP.monto}:\n${UPGRADE_VIP.pago}\n` +
    `3. Regístrate en el evento VIP:\n${UPGRADE_VIP.evento}\n` +
    `4. Mándanos el comprobante de pago con tu correo de broker.\n\n` +
    `Apenas recibamos el comprobante te dejamos en VIP. 💜`;

  const salida = await enviarTexto({ a: registro.telefono, texto }).catch((error: Error) => ({
    ok: false as const,
    status: 0,
    messageId: null,
    estado: null,
    error: error.message,
  }));

  await anotar(
    registro.token,
    salida.ok ? "se le mandaron los pasos para pasarse a VIP" : "falló el envío de los pasos para pasarse a VIP",
    () => ({}),
    salida.ok ? UPGRADE_VIP.pago : salida.error || `HTTP ${salida.status}`
  ).catch(() => null);

  return salida.ok
    ? { ok: true, nota: `${nombre} recibió los pasos y el link de pago del VIP` }
    : {
        ok: false,
        nota: `No se le pudo escribir a ${nombre}: ${salida.error || `HTTP ${salida.status}`}. Si hace más de 24 horas que no nos escribe, WhatsApp no deja mandarle texto libre.`,
      };
}
