import { after, NextResponse } from "next/server";
import { firmaLumaValida } from "@/lib/seguridad";
import { tierDeEvento } from "@/lib/luma";
import { reflejar } from "@/lib/hoja";
import {
  anotar,
  crearORecuperar,
  porToken,
  tokenDeGuest,
  type Registro,
} from "@/lib/registros";
import { enviarPlantilla } from "@/lib/whatsapp";

/**
 * Webhook de Luma — `POST https://www.habinext.com/webhook`.
 *
 * Es la puerta de entrada del embudo: alguien se registra en Luma, su cupo
 * queda pendiente de aprobación, y desde acá le escribimos por WhatsApp con su
 * link de pago personal.
 *
 * Tres cosas que no son negociables en este archivo:
 *
 * 1. **La firma se verifica sobre el cuerpo crudo.** Sin eso cualquiera podría
 *    inventar registros y disparar WhatsApps a números arbitrarios desde una
 *    línea de Habi, que es la forma más rápida de quemar la reputación de la
 *    línea ante Meta.
 * 2. **Todo es idempotente.** Luma reintenta hasta tres veces (1, 2 y 4
 *    minutos) ante cualquier respuesta que no sea 2xx. Un reintento no puede
 *    volverse un segundo mensaje con un segundo link de pago.
 * 3. **Se responde 200 aunque algo falle abajo.** Si Infobip está caído,
 *    devolver 500 hace que Luma reintente y termine mandando el mensaje tres
 *    veces cuando el servicio vuelva. El fallo queda anotado en el registro y
 *    se reintenta desde el panel, que es donde alguien lo está mirando.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CuerpoLuma = {
  type?: string;
  data?: {
    id?: string;
    user_email?: string;
    user_name?: string | null;
    user_first_name?: string | null;
    phone_number?: string | null;
    approval_status?: string;
    registered_at?: string | null;
    registration_answers?: { question_id?: string; question_type?: string; value?: unknown }[] | null;
    event?: { api_id?: string; id?: string } | null;
  };
};

/**
 * El teléfono puede venir por dos vías: el campo del perfil de Luma, o la
 * pregunta de registro que agregamos al evento. Se prefiere la respuesta del
 * formulario porque es la que la persona escribió pensando en este evento.
 */
function telefonoDe(data: NonNullable<CuerpoLuma["data"]>): string | null {
  const respuestas = Array.isArray(data.registration_answers) ? data.registration_answers : [];
  const delFormulario = respuestas.find(
    (r) => r?.question_type === "phone-number" && typeof r.value === "string" && r.value.trim()
  );
  if (delFormulario) return String(delFormulario.value);
  return data.phone_number ?? null;
}

function empresaDe(data: NonNullable<CuerpoLuma["data"]>): string | undefined {
  const respuestas = Array.isArray(data.registration_answers) ? data.registration_answers : [];
  const r = respuestas.find((x) => x?.question_id === "inmobiliaria" && typeof x.value === "string");
  const v = r?.value as string | undefined;
  return v?.trim() || undefined;
}

/** Manda la plantilla del link de pago y deja anotado lo que pasó. */
async function escribirPorWhatsApp(registro: Registro): Promise<void> {
  if (!registro.telefono) {
    await anotar(
      registro.token,
      "sin WhatsApp",
      () => ({ whatsapp: { ...registro.whatsapp, error: "el registro no trae un celular usable" } }),
      registro.luma.telefonoCrudo || "(vacío)"
    );
    return;
  }
  if (registro.whatsapp.enviadoEn) return; // ya se le escribió

  const plantilla =
    registro.tier === "vip" ? process.env.INFOBIP_TPL_VIP : process.env.INFOBIP_TPL_GENERAL;
  if (!plantilla) {
    await anotar(registro.token, "sin plantilla configurada", () => ({}));
    return;
  }

  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
  const salida = await enviarPlantilla({
    a: registro.telefono,
    plantilla,
    nombre: registro.luma.nombreCorto || "hola",
    token: registro.token,
    notifyUrl: `${sitio}/api/infobip?dlr=1`,
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
    salida.ok ? "WhatsApp enviado" : "falló el envío de WhatsApp",
    (r) => ({
      etapa: salida.ok ? ("mensaje_enviado" as const) : r.etapa,
      whatsapp: {
        ...r.whatsapp,
        plantilla,
        ...(salida.messageId ? { messageId: salida.messageId } : {}),
        ...(salida.ok ? { enviadoEn: new Date().toISOString(), error: undefined } : {}),
        ...(salida.ok ? {} : { error: salida.error || `HTTP ${salida.status}` }),
      },
    }),
    salida.ok ? (salida.estado ?? undefined) : salida.error
  );
}

export async function POST(request: Request) {
  // El cuerpo crudo, tal cual llegó: volver a serializar el JSON cambiaría el
  // digest y ninguna firma legítima cuadraría.
  const crudo = await request.text();

  const firma = firmaLumaValida(
    request.headers.get("webhook-signature"),
    crudo,
    process.env.LUMA_WEBHOOK_SECRET ?? ""
  );
  if (!firma.ok) {
    // 401 sin detalle: describirle a quien sondea por qué falló su firma es
    // regalarle el camino para acertar.
    console.warn("[luma] firma rechazada:", firma.motivo);
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  let cuerpo: CuerpoLuma;
  try {
    cuerpo = JSON.parse(crudo) as CuerpoLuma;
  } catch {
    return NextResponse.json({ error: "cuerpo ilegible" }, { status: 400 });
  }

  const tipo = cuerpo.type ?? "";
  const data = cuerpo.data;
  if (!data?.id) return NextResponse.json({ ok: true, nota: "sin invitado" });

  const eventId = data.event?.api_id || data.event?.id || "";
  const tier = tierDeEvento(eventId);
  if (!tier) {
    // Otro evento del mismo calendario: no es asunto de esta landing.
    return NextResponse.json({ ok: true, nota: "evento ajeno" });
  }

  try {
    if (tipo === "guest.registered" || tipo === "ticket.registered") {
      const { registro, nuevo } = await crearORecuperar({
        guestId: data.id,
        eventId,
        tier,
        email: data.user_email ?? "",
        nombre: data.user_name || data.user_first_name || "",
        telefonoCrudo: telefonoDe(data),
        registradoEn: data.registered_at || new Date().toISOString(),
        estadoAprobacion: data.approval_status || "pending_approval",
        empresa: empresaDe(data),
      });

      // Solo la primera vez se escribe. El reintento de Luma cae acá y sale
      // sin hacer nada, que es exactamente lo que tiene que pasar.
      if (nuevo) await escribirPorWhatsApp(registro);

      after(async () => {
        const fresco = await porToken(registro.token);
        if (fresco) await reflejar(fresco);
      });

      return NextResponse.json({ ok: true, nuevo });
    }

    if (tipo === "guest.updated" || tipo === "guest.refunded") {
      const token = await tokenDeGuest(data.id);
      if (!token) return NextResponse.json({ ok: true, nota: "sin registro previo" });

      const estado = data.approval_status || "";
      const actualizado = await anotar(
        token,
        tipo === "guest.refunded" ? "reembolso en Luma" : `estado en Luma: ${estado}`,
        (r) => ({
          luma: { ...r.luma, estadoAprobacion: estado || r.luma.estadoAprobacion },
          // Aprobado en Luma —por este sistema o a mano desde el panel de
          // Luma— es el final del embudo: la entrada ya salió.
          ...(estado === "approved" ? { etapa: "aprobado" as const } : {}),
          ...(estado === "declined" ? { etapa: "rechazado" as const } : {}),
        })
      );

      if (actualizado) after(() => reflejar(actualizado));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, nota: `tipo ignorado: ${tipo}` });
  } catch (error) {
    // Se responde 200 a propósito: ver el comentario de arriba sobre reintentos.
    console.error("[luma] fallo procesando el webhook:", (error as Error).message);
    return NextResponse.json({ ok: true, nota: "anotado con error" });
  }
}

/** Sonda de salud. No revela nada del estado ni de la configuración. */
export async function GET() {
  return NextResponse.json({ servicio: "webhook de Luma", listo: true });
}
