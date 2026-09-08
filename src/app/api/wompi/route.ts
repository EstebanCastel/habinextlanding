import { after, NextResponse } from "next/server";
import { anotar, normalizarTelefono, porReferencia, porTelefono, todos, type Registro } from "@/lib/registros";
import { firmaWompiValida } from "@/lib/seguridad";
import { enviarTexto } from "@/lib/whatsapp";

/**
 * Webhook de Wompi: el aviso de que el banco aprobó (o rechazó) un pago.
 *
 * El evento viene firmado —Wompi concatena las propiedades que él mismo lista,
 * el timestamp y el secreto de eventos, y manda el SHA-256— y sin verificar esa
 * firma cualquiera que conozca la URL podría marcar su pago como aprobado
 * mandando un JSON que diga "APPROVED".
 *
 * **Confirmar el pago no aprueba a nadie.** La aprobación se hace desde Luma,
 * que es donde el equipo revisa y donde el botón de aprobar existe de verdad;
 * este servicio se entera después por el webhook `guest.updated`. Lo que hace
 * este endpoint es dejar el registro listo para esa decisión: marca el pago,
 * guarda la transacción y le avisa a la persona que ya vimos su plata, para
 * que no se quede en el aire entre que paga y le llega la entrada.
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
    await anotar(
      registro.token,
      `pago ${estado.toLowerCase() || "sin estado"}`,
      () => ({}),
      t.payment_method_type
    );
    return NextResponse.json({ ok: true, estado });
  }

  // Aprobado por el banco. Se marca el pago y ahí queda, esperando que alguien
  // lo apruebe en Luma.
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

  // El aviso sale una sola vez. Wompi reenvía `transaction.updated` ante
  // cualquier cambio de la transacción, y sin esta guarda la persona recibiría
  // el mismo mensaje varias veces.
  const yaAvisado = Boolean(registro.pago.confirmadoEn);
  if (!yaAvisado && conPago?.telefono) {
    after(() =>
      enviarTexto({
        a: conPago.telefono!,
        texto:
          `¡Recibimos tu pago, ${conPago.luma.nombreCorto}! 🎉\n\n` +
          "Estamos activando tu entrada de Habi Next. En cuanto quede lista te llega al " +
          "correo con el que te registraste, con tu código QR.\n\n" +
          "Nos vemos el martes 20 de octubre en el Centro de Convenciones Avenida 68. 💜",
      }).catch(() => null)
    );
  }

  return NextResponse.json({ ok: true });
}
