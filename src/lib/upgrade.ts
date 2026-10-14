import { confirmarEntrada } from "./altas";
import { pasarAVip } from "./bot";
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
 * Wompi nunca quedó conectado, así que la plata se ve en el panel de Wompi y
 * se marca acá. Marcarlo hace tres cosas de una: deja a la persona aprobada en
 * el evento VIP de Luma, le borra la entrada General y le manda la
 * confirmación con su QR nuevo.
 *
 * Hay dos caminos porque hay dos formas de llegar a este botón:
 *
 * - **Tiene un registro VIP aparte.** Es quien tocó «Prefiero el VIP» en
 *   WhatsApp o lo abrió desde la landing: le quedó un registro VIP esperando
 *   el pago y el General viejo sigue vivo. Se aprueba el VIP y se borra el
 *   General, que es lo que sobra.
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
      const ap = await aprobarInvitado(eventoVip, enVip.id);
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
    await borrarLaGeneral(registro, otro.token);
    const c = await confirmarEntrada(otro.token);
    return { ok: true, nota: `${nombre} quedó en VIP y se le quitó la General · ${c.nota}` };
  }

  // Solo tiene la General: se le sube de categoría ese mismo registro.
  const res = await pasarAVip(registro, { pagado: true, decididoPor });
  if (!res.ok) return res;
  const c = await confirmarEntrada(registro.token);
  return { ok: true, nota: `${nombre} pasó a VIP con el pago marcado a mano · ${c.nota}` };
}

/**
 * Le quita la entrada General a quien acaba de quedar en VIP.
 *
 * Se baja del evento General en Luma sin correo —un «no asistirás» justo
 * después de subir de categoría sería desconcertante—, se borra el registro y
 * se deja el correo apuntando al registro VIP, para que un webhook tardío del
 * invitado viejo no vuelva a abrir una General.
 */
async function borrarLaGeneral(registro: Registro, tokenVip: string): Promise<void> {
  const eventoGeneral = registro.luma.eventId;
  if (eventoGeneral && registro.luma.guestId) {
    await rechazarInvitado(eventoGeneral, registro.luma.guestId, undefined, false).catch(() => null);
  }
  if (registro.luma.guestId) await olvidarInvitado(registro.luma.guestId).catch(() => null);
  await descartar(registro.token);
  await reservarCorreo(registro.luma.email, tokenVip).catch(() => null);
}
