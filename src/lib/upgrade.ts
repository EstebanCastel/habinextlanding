import { pasarAVip } from "./bot";
import {
  agregarInvitadoConRespaldo,
  aprobarInvitado,
  buscarInvitadoPorEmail,
  eventoDeTier,
  rechazarInvitado,
} from "./luma";
import {
  anotar,
  apuntarAInvitado,
  apuntarTelefono,
  descartar,
  olvidarInvitado,
  reservarCorreo,
  soltarCorreo,
  todos,
  type Registro,
} from "./registros";
import { enviarTexto } from "./whatsapp";

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
 * - **Ya tiene un registro VIP aparte.** Es quien tocó «Prefiero el VIP» en
 *   WhatsApp, o se inscribió por su cuenta en el evento VIP, o compró el VIP
 *   desde la landing sin llegar todavía a Luma. Se le confirma ese VIP y se le
 *   borra el General, que es lo que sobra.
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

  const correo = registro.luma.email.trim().toLowerCase();
  const nombre = registro.luma.nombreCorto || registro.luma.nombre;

  // Se busca su otro registro por correo y no por Luma: quien compró el VIP
  // desde la landing todavía no existe allá, y preguntándole solo a Luma se
  // caía al otro camino y le abría un segundo VIP.
  const suyos = (await todos().catch(() => [] as Registro[])).filter(
    (r) => r.token !== registro.token && r.luma.email.trim().toLowerCase() === correo
  );
  const otroVip = suyos.find((r) => r.tier === "vip");

  if (otroVip) {
    const vip = await asegurarVipAprobado(otroVip, eventoVip);
    if (!vip.ok) return { ok: false, nota: vip.nota };

    const ahora = new Date().toISOString();
    await anotar(
      otroVip.token,
      "pagó el upgrade a VIP, verificado a mano en el panel",
      (r) => ({
        etapa: "aprobado" as const,
        luma: {
          ...r.luma,
          eventId: eventoVip,
          ...(vip.guestId ? { guestId: vip.guestId } : {}),
          estadoAprobacion: "approved",
        },
        pago: { ...r.pago, confirmadoEn: r.pago.confirmadoEn ?? ahora },
        aprobacion: {
          ...r.aprobacion,
          decididoEn: r.aprobacion.decididoEn ?? ahora,
          decididoPor,
        },
      }),
      decididoPor
    );
    const baja = await borrarLaGeneral(registro, otroVip.token);
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
 * Deja a alguien aprobado en el evento VIP de Luma, en silencio.
 *
 * Su registro VIP puede estar en tres estados: ya aprobado allá (no se toca),
 * dado de alta pero pendiente (se aprueba), o sin existir todavía porque compró
 * desde la landing (se crea). En los tres casos sin correo: el aviso lo da
 * quien cobró.
 */
async function asegurarVipAprobado(
  registroVip: Registro,
  eventoVip: string
): Promise<{ ok: true; guestId: string } | { ok: false; nota: string }> {
  const correo = registroVip.luma.email;
  const existente = await buscarInvitadoPorEmail(eventoVip, correo).catch(() => null);

  if (existente?.id) {
    if (existente.estado !== "approved") {
      const ap = await aprobarInvitado(eventoVip, existente.id, undefined, false);
      if (!ap.ok) return { ok: false, nota: `Luma no aprobó la entrada VIP (${ap.status})` };
    }
    if (existente.id !== registroVip.luma.guestId) await apuntarAInvitado(registroVip.token, existente.id);
    return { ok: true, guestId: existente.id };
  }

  // Compró el VIP y nunca llegó a Luma: se crea ahora, aprobado y mudo. La
  // reserva evita que el `guest.registered` del alta le abra otro registro.
  await reservarCorreo(correo, registroVip.token);
  const alta = await agregarInvitadoConRespaldo(eventoVip, {
    email: correo,
    nombre: registroVip.luma.nombre,
    aprobado: true,
    avisarPorCorreo: false,
    ...(registroVip.luma.cedula
      ? { respuestas: [{ id: "cedula", tipo: "text", valor: registroVip.luma.cedula }] }
      : {}),
  });
  if (!alta.ok) {
    await soltarCorreo(correo);
    return { ok: false, nota: `Luma rechazó el alta en VIP (${alta.status})` };
  }
  const nuevo = await buscarInvitadoPorEmail(eventoVip, alta.email);
  await soltarCorreo(correo);
  if (!nuevo?.id) {
    return { ok: false, nota: "Luma aceptó el alta pero el invitado VIP no aparece en la lista" };
  }
  await apuntarAInvitado(registroVip.token, nuevo.id);
  return { ok: true, guestId: nuevo.id };
}

/**
 * Le quita la entrada General a quien acaba de quedar en VIP.
 *
 * Se baja del evento General en Luma sin correo, se borra el registro y se
 * dejan sus índices —correo y teléfono— apuntando al registro VIP: si quedaran
 * apuntando al registro borrado, un webhook tardío le abriría otra General y
 * sus WhatsApp entrantes se tirarían en silencio.
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
  if (registro.telefono) await apuntarTelefono(registro.telefono, tokenVip).catch(() => null);
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
