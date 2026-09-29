import { NextResponse } from "next/server";
import { entradaDe } from "@/lib/entrada";
import { participanteActual } from "@/lib/experiencia-http";
import { paseApple, paseGoogle } from "@/lib/wallet";

/**
 * La entrada para la billetera del teléfono.
 *
 * El token llega por la URL, pero no basta con tenerlo: se comprueba que sea
 * el del participante en sesión. Un token que circule en un WhatsApp no debe
 * servirle a otra persona para bajarse una entrada ajena.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";

export async function GET(request: Request, contexto: { params: Promise<{ destino: string }> }) {
  const { destino } = await contexto.params;
  if (destino !== "apple" && destino !== "google") {
    return NextResponse.json({ error: "destino desconocido" }, { status: 404 });
  }

  const p = await participanteActual();
  if (!p?.registro) {
    return NextResponse.json({ error: "Entra con tu correo para bajar tu entrada." }, { status: 401 });
  }
  const pedido = new URL(request.url).searchParams.get("t");
  if (pedido && pedido !== p.registro.token) {
    return NextResponse.json({ error: "Esa entrada no es tuya." }, { status: 403 });
  }

  const entrada = await entradaDe(p.registro.token).catch(() => null);
  if (!entrada) return NextResponse.json({ error: "No encontramos tu entrada." }, { status: 404 });
  if (!entrada.qr) {
    return NextResponse.json({ error: entrada.motivo ?? "Tu entrada todavía no tiene QR." }, { status: 409 });
  }

  if (destino === "google") {
    const r = paseGoogle(entrada, SITIO);
    return r.ok
      ? NextResponse.json({ url: r.url }, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json({ error: r.falta }, { status: 503 });
  }

  const r = await paseApple(entrada, SITIO);
  if (!r.ok) return NextResponse.json({ error: r.falta }, { status: 503 });
  return new NextResponse(new Uint8Array(r.archivo), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": 'attachment; filename="habinext.pkpass"',
      "Cache-Control": "no-store",
    },
  });
}
