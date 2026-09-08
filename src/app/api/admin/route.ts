import { NextResponse } from "next/server";
import { reflejar, reflejarTodo } from "@/lib/hoja";
import { aprobarInvitado, rechazarInvitado } from "@/lib/luma";
import { anotar, porToken, todos } from "@/lib/registros";
import { igualSeguro } from "@/lib/seguridad";
import { cabecerasDeCookie, claveAdmin, haySesion } from "@/lib/sesion";
import { enviarPlantilla, enviarTexto } from "@/lib/whatsapp";

/**
 * Acciones del panel de operación. Todo entra por formularios del propio panel
 * (`SameSite=Strict` y sesión obligatoria) y vuelve al panel con un redirect,
 * para que recargar la página no repita la acción.
 *
 * Las tres cosas que se pueden hacer desde acá —aprobar, rechazar y reenviar
 * el mensaje— tocan a una persona real: aprobar le manda su entrada, rechazar
 * le manda un correo de rechazo y reenviar le llega al celular. Por eso todas
 * quedan firmadas en la bitácora con quién las hizo.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRMACION_MANUAL =
  "¡Listo! 🎉 Verificamos tu pago y tu registro a Habi Next quedó aprobado.\n\n" +
  "Tu entrada con el código QR va en camino al correo con el que te registraste. " +
  "Nos vemos el martes 20 de octubre en el Centro de Convenciones Avenida 68. 💜";

function volver(mensaje: string) {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
  return NextResponse.redirect(`${sitio}/admin?aviso=${encodeURIComponent(mensaje)}`, {
    status: 303,
  });
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "petición inválida" }, { status: 400 });

  const accion = String(form.get("accion") ?? "");

  // ---------- entrar / salir ----------
  if (accion === "entrar") {
    const clave = claveAdmin();
    const dada = String(form.get("clave") ?? "");
    const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
    if (!clave || !igualSeguro(dada, clave)) {
      // Espera fija ante el fallo: no acelera un ataque por fuerza bruta, pero
      // sí lo vuelve caro contra una función serverless.
      await new Promise((r) => setTimeout(r, 700));
      return NextResponse.redirect(`${sitio}/admin?error=1`, { status: 303 });
    }
    return NextResponse.redirect(`${sitio}/admin`, {
      status: 303,
      headers: cabecerasDeCookie(clave, 60 * 60 * 12),
    });
  }

  if (accion === "salir") {
    const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
    return NextResponse.redirect(`${sitio}/admin`, {
      status: 303,
      headers: cabecerasDeCookie("", 0),
    });
  }

  // ---------- de aquí en adelante hace falta sesión ----------
  if (!(await haySesion())) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  if (accion === "resincronizar") {
    const res = await reflejarTodo(await todos());
    return volver(res.ok ? "Hoja reconstruida" : `La hoja no respondió: ${res.nota}`);
  }

  const token = String(form.get("token") ?? "");
  const registro = token ? await porToken(token) : null;
  if (!registro) return volver("No encontramos ese registro");

  // ---------- aprobar ----------
  if (accion === "aprobar") {
    if (registro.etapa === "aprobado") return volver("Ese registro ya estaba aprobado");

    const res = await aprobarInvitado(
      registro.luma.eventId,
      registro.luma.guestId,
      "¡Confirmamos tu pago! Nos vemos en Habi Next el 20 de octubre."
    );
    const actualizado = await anotar(
      registro.token,
      res.ok ? "aprobado desde el panel" : "falló la aprobación en Luma",
      (r) => ({
        ...(res.ok ? { etapa: "aprobado" as const } : {}),
        pago: { ...r.pago, confirmadoEn: r.pago.confirmadoEn ?? new Date().toISOString() },
        aprobacion: {
          ...r.aprobacion,
          ...(res.ok
            ? { decididoEn: new Date().toISOString(), decididoPor: "panel" }
            : { motivo: `HTTP ${res.status}: ${res.cuerpo}` }),
        },
      }),
      res.ok ? undefined : res.cuerpo
    );
    if (actualizado) await reflejar(actualizado);

    if (res.ok && registro.telefono) {
      await enviarTexto({ a: registro.telefono, texto: CONFIRMACION_MANUAL }).catch(() => {});
    }
    return volver(
      res.ok
        ? `Aprobado: ${registro.luma.nombre}. Luma ya le mandó la entrada.`
        : `Luma rechazó la aprobación (${res.status})`
    );
  }

  // ---------- rechazar ----------
  if (accion === "rechazar") {
    const motivo = String(form.get("motivo") ?? "").slice(0, 200);
    const res = await rechazarInvitado(registro.luma.eventId, registro.luma.guestId, motivo);
    const actualizado = await anotar(
      registro.token,
      "rechazado desde el panel",
      (r) => ({
        etapa: "rechazado" as const,
        aprobacion: {
          ...r.aprobacion,
          decididoEn: new Date().toISOString(),
          decididoPor: "panel",
          ...(motivo ? { motivo } : {}),
        },
      }),
      motivo || undefined
    );
    if (actualizado) await reflejar(actualizado);
    return volver(res.ok ? `Rechazado: ${registro.luma.nombre}` : `Luma respondió ${res.status}`);
  }

  // ---------- reenviar el mensaje ----------
  if (accion === "reenviar") {
    if (!registro.telefono) return volver("Ese registro no tiene un celular usable");
    const plantilla =
      registro.tier === "vip" ? process.env.INFOBIP_TPL_VIP : process.env.INFOBIP_TPL_GENERAL;
    if (!plantilla) return volver("Falta configurar la plantilla de WhatsApp");

    const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
    const salida = await enviarPlantilla({
      a: registro.telefono,
      plantilla,
      nombre: registro.luma.nombreCorto || "hola",
      token: registro.token,
      notifyUrl: `${sitio}/api/infobip?dlr=1&k=${process.env.INFOBIP_WEBHOOK_TOKEN ?? ""}`,
      callbackData: { token: registro.token },
    }).catch((e: Error) => ({ ok: false as const, status: 0, messageId: null, estado: null, error: e.message }));

    const actualizado = await anotar(
      registro.token,
      salida.ok ? "mensaje reenviado desde el panel" : "falló el reenvío",
      (r) => ({
        etapa: salida.ok ? ("mensaje_enviado" as const) : r.etapa,
        whatsapp: {
          ...r.whatsapp,
          plantilla,
          ...(salida.messageId ? { messageId: salida.messageId } : {}),
          ...(salida.ok ? { enviadoEn: new Date().toISOString(), error: undefined } : { error: salida.error }),
        },
      })
    );
    if (actualizado) await reflejar(actualizado);
    return volver(salida.ok ? "Mensaje reenviado" : `No se pudo reenviar: ${salida.error}`);
  }

  return volver("Acción desconocida");
}
