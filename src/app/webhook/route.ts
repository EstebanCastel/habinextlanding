import { after, NextResponse } from "next/server";
import { darLaBienvenida, textoDeAprobacion } from "@/lib/bot";
import { firmaLumaValida } from "@/lib/seguridad";
import { tierDeEvento } from "@/lib/luma";
import { anotar, crearORecuperar, porToken, tokenDeGuest } from "@/lib/registros";
import { enviarTexto } from "@/lib/whatsapp";

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
    // Solo `guest.registered` crea. `ticket.registered` describe el mismo
    // hecho desde la otra punta y llega a la vez: tratar los dos como alta
    // dejaba a la persona con dos registros y dos links de pago distintos.
    if (tipo === "guest.registered") {
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
      if (nuevo) await darLaBienvenida(registro);

      return NextResponse.json({ ok: true, nuevo });
    }

    if (tipo === "guest.updated" || tipo === "guest.refunded") {
      const token = await tokenDeGuest(data.id);
      if (!token) return NextResponse.json({ ok: true, nota: "sin registro previo" });

      const estado = data.approval_status || "";
      const previo = await porToken(token);
      const yaEstabaAprobado = previo?.etapa === "aprobado";

      const actualizado = await anotar(
        token,
        tipo === "guest.refunded" ? "reembolso en Luma" : `estado en Luma: ${estado}`,
        (r) => ({
          luma: { ...r.luma, estadoAprobacion: estado || r.luma.estadoAprobacion },
          // Aprobar se hace desde Luma, y este webhook es cómo nos enteramos.
          // Es el final del embudo: la entrada con el QR ya salió por correo.
          ...(estado === "approved"
            ? {
                etapa: "aprobado" as const,
                aprobacion: {
                  ...r.aprobacion,
                  decididoEn: r.aprobacion.decididoEn ?? new Date().toISOString(),
                  decididoPor: r.aprobacion.decididoPor ?? "Luma",
                },
              }
            : {}),
          ...(estado === "declined" ? { etapa: "rechazado" as const } : {}),
        })
      );

      // El aviso sale una sola vez: Luma manda `guest.updated` por cualquier
      // cambio, y sin esta guarda alguien recibiría el mismo "¡Listo!" cada
      // vez que se le tocara algo del registro.
      if (estado === "approved" && !yaEstabaAprobado && actualizado?.telefono) {
        after(() =>
          enviarTexto({
            a: actualizado.telefono!,
            texto: textoDeAprobacion(actualizado.luma.nombreCorto),
          }).catch(() => null)
        );
      }

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
