import { EVENT } from "@/config/event";
import { enviarCorreo } from "./correo";
import { agregarInvitado, buscarInvitadoPorEmail, eventoDeTier } from "./luma";
import { anotar, apuntarAInvitado, porToken, primerNombre, soltarCorreo, ticketDe, type EstadoEnvio, type Registro } from "./registros";
import { enviarSms } from "./sms";
import { enviarPlantilla, type Salida } from "./whatsapp";

/**
 * El alta en Luma de quien ya pagó, y la confirmación que le llega después.
 *
 * En el flujo nuevo la persona paga primero, desde la landing, y queda en el
 * panel como pagada pero sin invitado en Luma. Cada día el operador la da de
 * alta desde el panel: se crea en Luma **ya aprobada** —Luma manda la entrada
 * con el QR en el acto— y desde acá salen la confirmación por correo, SMS y
 * WhatsApp. El webhook `guest.updated` que dispara esa alta encuentra el
 * registro por el correo reservado y no abre otro.
 */

function sitio(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
}

/**
 * Crea al pagador en Luma, aprobado, y deja el registro apuntando al invitado.
 * Nunca lanza: devuelve qué pasó para que el panel lo muestre.
 */
export async function darDeAltaEnLuma(registro: Registro, decididoPor: string): Promise<{ ok: boolean; nota: string; registro?: Registro }> {
  if (registro.luma.guestId) return { ok: false, nota: `${registro.luma.nombreCorto} ya está en Luma` };
  const eventId = eventoDeTier(registro.tier);
  if (!eventId) return { ok: false, nota: `falta el evento de Luma para ${registro.tier} (LUMA_EVENT_*)` };
  const correo = registro.luma.email;
  try {
    await agregarInvitado(eventId, {
      email: correo,
      nombre: registro.luma.nombre,
      aprobado: true,
      ...(registro.luma.cedula ? { respuestas: [{ id: "cedula", tipo: "text", valor: registro.luma.cedula }] } : {}),
    });
    const invitado = await buscarInvitadoPorEmail(eventId, correo);
    const guestId = invitado?.id ?? "";
    if (guestId) await apuntarAInvitado(registro.token, guestId);
    const actualizado = await anotar(
      registro.token,
      "dado de alta en Luma, aprobado",
      (r) => ({
        etapa: "aprobado" as const,
        luma: { ...r.luma, guestId: guestId || r.luma.guestId, eventId, estadoAprobacion: "approved" },
        aprobacion: { ...r.aprobacion, decididoEn: r.aprobacion.decididoEn ?? new Date().toISOString(), decididoPor },
      }),
      decididoPor
    );
    // La reserva del correo ya cumplió: el webhook de Luma encontró el registro.
    await soltarCorreo(correo).catch(() => null);
    return { ok: true, nota: `${registro.luma.nombreCorto} quedó en Luma con su entrada ${registro.tier === "vip" ? "VIP" : "General"}`, registro: actualizado ?? registro };
  } catch (error) {
    const detalle = (error as Error).message;
    await anotar(registro.token, "falló el alta en Luma", () => ({}), detalle).catch(() => null);
    return { ok: false, nota: `no se pudo dar de alta a ${registro.luma.nombreCorto}: ${detalle}` };
  }
}

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function correoDeConfirmacion(r: Registro): { asunto: string; html: string; texto: string } {
  const nombre = r.luma.nombreCorto || primerNombre(r.luma.nombre) || "";
  const tier = r.tier === "vip" ? "VIP" : "General";
  const ticket = ticketDe(r.tier);
  const experiencia = `${sitio()}/experiencia?utm_source=confirmacion&utm_medium=email&utm_campaign=habinext-2026`;
  const asunto = `${nombre ? `${nombre}, ` : ""}tu entrada ${tier} a Habi Next está confirmada`;
  const incluye = ticket.includes.map((x) => `<li style="margin:0 0 6px">${escapar(x)}</li>`).join("");
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapar(asunto)}</title></head>
<body style="margin:0;padding:0;background:#ece2fa;font-family:Urbanist,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0410">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece2fa;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden">
  <tr><td style="background:#050208;padding:34px 40px">
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:#ba9dfa;font-weight:700">Habi Next Colombia</p>
    <h1 style="margin:0;font-size:30px;line-height:1.1;letter-spacing:-.02em;font-weight:800;color:#ffffff">${nombre ? `${escapar(nombre)}, ` : ""}ya estás dentro.<br><span style="color:#ba9dfa">Entrada ${tier} confirmada.</span></h1>
  </td></tr>
  <tr><td style="padding:32px 40px 8px">
    <p style="margin:0 0 16px;font-size:17px;line-height:1.55;color:#3a2f4a">Recibimos tu pago y quedaste registrado. <strong>Luma te acaba de enviar tu entrada con el código QR</strong> a este mismo correo: búscala como «Habi Next» y, si no aparece, revisa la carpeta de spam o promociones. Ese QR es lo que te van a pedir en la puerta.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1ff;border-radius:16px"><tr><td style="padding:22px 24px">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#802ef6;font-weight:700">Cuándo y dónde</p>
      <p style="margin:0 0 4px;font-size:17px;font-weight:700">${escapar(EVENT.dateLong)}</p>
      <p style="margin:0;font-size:15px;color:#3a2f4a">${escapar(EVENT.venue)} · ${escapar(EVENT.city)} · ${escapar(EVENT.durationLabel)}</p>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:24px 40px 0">
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#802ef6;font-weight:700">${r.tier === "vip" ? "Tu entrada VIP incluye todo lo de General, más" : "Tu entrada General incluye"}</p>
    <ul style="margin:0;padding:0 0 0 20px;font-size:15px;line-height:1.5;color:#3a2f4a">${incluye}</ul>
  </td></tr>
  <tr><td style="padding:28px 40px 36px">
    <p style="margin:0 0 14px;font-size:17px;line-height:1.5;font-weight:700">Mientras llega el día, arma tu carnet.</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#3a2f4a">Tu foto, tu nombre y el sello de Habi Next, listo para publicar. Y desde ya puedes sumar puntos para el ranking del evento.</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#802ef6">
      <a href="${experiencia}" style="display:inline-block;padding:15px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">Armar mi carnet</a>
    </td></tr></table>
  </td></tr>
</table>
<p style="max-width:600px;margin:18px auto 0;font-size:12px;line-height:1.6;color:#7a6f8c;text-align:center">¿Algo no cuadra? Responde este correo y te ayudamos.<br>Un evento de Habi · habinext.com</p>
</td></tr></table>
</body></html>`;
  const texto = [
    `${nombre ? `${nombre}, ` : ""}tu entrada ${tier} a ${EVENT.fullName} está confirmada.`,
    "",
    "Recibimos tu pago y quedaste registrado. Luma te envió la entrada con el código QR a este correo (búscala como «Habi Next»; si no aparece, revisa spam).",
    "",
    `${EVENT.dateLong} · ${EVENT.venue}, ${EVENT.city}.`,
    "",
    `Arma tu carnet y suma puntos: ${experiencia}`,
  ].join("\n");
  return { asunto, html, texto };
}

export function smsDeConfirmacion(r: Registro): string {
  const nombre = (r.luma.nombreCorto || primerNombre(r.luma.nombre) || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const tier = r.tier === "vip" ? "VIP" : "General";
  return `Habi Next: ${nombre ? `${nombre}, ` : ""}tu entrada ${tier} esta confirmada. Te llego al correo con el QR (revisa spam). 20 oct, Centro de Convenciones Av 68. Arma tu carnet: ${sitio()}/experiencia`;
}

const aEstado = (s: Salida, ahora: string): EstadoEnvio => ({
  ...(s.ok ? { enviadoEn: ahora } : {}),
  ...(s.messageId ? { messageId: s.messageId } : {}),
  ...(s.ok ? {} : { error: s.error || `HTTP ${s.status}` }),
});

/**
 * La confirmación por los tres canales, una sola vez. Se anota cada canal
 * aparte para que el panel diga por dónde le llegó.
 */
export async function confirmarEntrada(token: string): Promise<{ ok: boolean; nota: string }> {
  const r = await porToken(token);
  if (!r) return { ok: false, nota: "registro no encontrado" };
  if (r.confirmacion?.enviadaEn) return { ok: true, nota: "la confirmación ya había salido" };
  const ahora = new Date().toISOString();
  const nombre = r.luma.nombreCorto || "hola";
  const tier = r.tier === "vip" ? "VIP" : "General";
  const fallo = (e: Error): Salida => ({ ok: false, status: 0, messageId: null, estado: null, error: e.message });

  const plantilla = process.env.INFOBIP_TPL_CONFIRMACION;
  const [wa, sms, correo] = await Promise.all([
    r.telefono && plantilla
      ? enviarPlantilla({ a: r.telefono, plantilla, placeholders: [nombre, tier], callbackData: { token, canal: "whatsapp", confirmacion: true } }).catch(fallo)
      : Promise.resolve<Salida | null>(null),
    r.telefono ? enviarSms({ a: r.telefono, texto: smsDeConfirmacion(r), callbackData: { token, canal: "sms", confirmacion: true } }).catch(fallo) : Promise.resolve<Salida | null>(null),
    (() => {
      const c = correoDeConfirmacion(r);
      return enviarCorreo({ a: r.luma.email, asunto: c.asunto, html: c.html, texto: c.texto, callbackData: { token, canal: "correo", confirmacion: true } }).catch(fallo);
    })(),
  ]);

  await anotar(
    token,
    "confirmación de entrada enviada",
    (reg) => ({
      confirmacion: {
        ...reg.confirmacion,
        ...(wa ? { whatsapp: aEstado(wa, ahora) } : {}),
        ...(sms ? { sms: aEstado(sms, ahora) } : {}),
        correo: aEstado(correo, ahora),
        enviadaEn: ahora,
      },
    }),
    [wa ? `WhatsApp: ${wa.ok ? "enviado" : wa.error}` : "WhatsApp: sin plantilla o sin celular", sms ? `SMS: ${sms.ok ? "enviado" : sms.error}` : "SMS: sin celular", `Correo: ${correo.ok ? "enviado" : correo.error}`].join(" · ")
  );
  const ok = correo.ok || Boolean(wa?.ok) || Boolean(sms?.ok);
  return { ok, nota: ok ? `confirmación enviada a ${nombre}` : `no salió ninguna confirmación para ${nombre}` };
}
