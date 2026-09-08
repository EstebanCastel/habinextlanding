import { after, NextResponse } from "next/server";
import { reflejar } from "@/lib/hoja";
import { aprobarInvitado } from "@/lib/luma";
import { anotar, normalizarTelefono, porReferencia, porTelefono, todos, type Registro } from "@/lib/registros";
import { firmaWompiValida } from "@/lib/seguridad";
import { enviarTexto } from "@/lib/whatsapp";

/**
 * Webhook de Wompi — el único punto del sistema donde un pago se da por bueno
 * sin que una persona lo mire.
 *
 * Eso solo es defendible porque el evento viene firmado: Wompi concatena las
 * propiedades que él mismo lista, el timestamp y el secreto de eventos, y
 * manda el SHA-256. Sin esa verificación, cualquiera que conozca la URL podría
 * regalarse una entrada mandando un JSON que diga "APPROVED".
 *
 * Cuando el pago está aprobado se aprueba el registro en Luma, y ahí Luma le
 * manda la entrada con el QR a la persona. Ese es el final del embudo.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Transaccion = {
  id?: string;
  status?: string;
  reference?: string;
  amount_in_cents?: number;
  customer_email?: string;
  payment_method_type?: string;
  customer_data?: { phone_number?: string; full_name?: string } | null;
};

/**
 * Encuentra a quién corresponde el pago. Se intenta en orden de confianza:
 * la referencia que nosotros mismos pusimos en el link, después el correo con
 * el que se registró en Luma, y por último el celular. Los dos últimos son un
 * respaldo para el caso en que la persona llegue al checkout por fuera de su
 * link personal.
 */
async function conciliar(t: Transaccion): Promise<Registro | null> {
  if (t.reference) {
    const porRef = await porReferencia(t.reference).catch(() => null);
    if (porRef) return porRef;
  }

  const telefono = normalizarTelefono(t.customer_data?.phone_number);
  if (telefono) {
    const porTel = await porTelefono(telefono).catch(() => null);
    if (porTel) return porTel;
  }

  const correo = String(t.customer_email || "").trim().toLowerCase();
  if (correo) {
    const lista = await todos(2000).catch(() => [] as Registro[]);
    const encontrado = lista.find((r) => r.luma.email.toLowerCase() === correo);
    if (encontrado) return encontrado;
  }

  return null;
}

const CONFIRMACION =
  "¡Listo! 🎉 Confirmamos tu pago y tu registro a Habi Next quedó aprobado.\n\n" +
  "Tu entrada con el código QR va en camino al correo con el que te registraste. " +
  "Guárdala: es la que te van a pedir en la puerta.\n\n" +
  "Nos vemos el martes 20 de octubre en el Centro de Convenciones Avenida 68. 💜";

export async function POST(request: Request) {
  const evento = (await request.json().catch(() => null)) as
    | { event?: string; data?: { transaction?: Transaccion }; environment?: string }
    | null;
  if (!evento) return NextResponse.json({ error: "cuerpo ilegible" }, { status: 400 });

  const firmaOk = await firmaWompiValida(evento, process.env.WOMPI_EVENTS_SECRET ?? "");
  if (!firmaOk) {
    console.warn("[wompi] evento con firma inválida");
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  const t = evento.data?.transaction;
  if (!t || evento.event !== "transaction.updated") {
    return NextResponse.json({ ok: true, nota: "evento ignorado" });
  }

  const estado = String(t.status || "").toUpperCase();
  const registro = await conciliar(t).catch(() => null);

  if (!registro) {
    // Un pago sin dueño no se pierde: queda en el log y el equipo lo cruza a
    // mano desde el panel. Es preferible a adivinar y aprobar a la persona
    // equivocada.
    console.warn("[wompi] pago sin registro asociado, referencia:", t.reference);
    return NextResponse.json({ ok: true, nota: "sin conciliar" });
  }

  if (estado !== "APPROVED") {
    const actualizado = await anotar(
      registro.token,
      `pago ${estado.toLowerCase() || "sin estado"}`,
      () => ({}),
      t.payment_method_type
    );
    if (actualizado) after(() => reflejar(actualizado));
    return NextResponse.json({ ok: true, estado });
  }

  // Aprobado. Se anota el pago antes de tocar Luma: si la llamada a Luma falla,
  // el pago igual queda registrado y el panel muestra que falta aprobar.
  const conPago = await anotar(
    registro.token,
    "pago confirmado por Wompi",
    (r) => ({
      etapa: "pago_confirmado" as const,
      pago: {
        ...r.pago,
        confirmadoEn: r.pago.confirmadoEn ?? new Date().toISOString(),
        transaccionId: t.id,
        montoCentavos: t.amount_in_cents,
        referencia: t.reference ?? r.pago.referencia,
      },
    }),
    t.payment_method_type
  );

  // Idempotencia: si Wompi reenvía el evento y ya se aprobó, no se vuelve a
  // llamar a Luma ni se manda otro WhatsApp de confirmación.
  if (registro.etapa === "aprobado" || conPago?.etapa === "aprobado") {
    return NextResponse.json({ ok: true, nota: "ya estaba aprobado" });
  }

  after(async () => {
    try {
      const res = await aprobarInvitado(
        registro.luma.eventId,
        registro.luma.guestId,
        "¡Confirmamos tu pago! Nos vemos en Habi Next el 20 de octubre."
      );
      const final = await anotar(
        registro.token,
        res.ok ? "aprobado en Luma" : "falló la aprobación en Luma",
        (r) => ({
          ...(res.ok ? { etapa: "aprobado" as const } : {}),
          aprobacion: {
            ...r.aprobacion,
            ...(res.ok
              ? { decididoEn: new Date().toISOString(), decididoPor: "Wompi (automático)" }
              : { motivo: `HTTP ${res.status}: ${res.cuerpo}` }),
          },
        }),
        res.ok ? undefined : res.cuerpo
      );
      if (final) await reflejar(final);

      if (res.ok && registro.telefono) {
        await enviarTexto({ a: registro.telefono, texto: CONFIRMACION }).catch(() => {});
      }
    } catch (error) {
      console.error("[wompi] no se pudo aprobar en Luma:", (error as Error).message);
    }
  });

  return NextResponse.json({ ok: true });
}
