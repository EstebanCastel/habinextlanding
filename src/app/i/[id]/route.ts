import { after, NextResponse } from "next/server";
import { cambiar, contarInvitacion, esId, marcar, porId, redDelRobot } from "@/lib/experiencia";

/**
 * El link personal de invitación: `/i/<id>` → la landing, con la fuente
 * marcada como `experiencia` y el `utm_content` con el id de quien invitó.
 * Así el rastro y los registros de Luma saben de quién vino cada persona.
 *
 * Cuando WhatsApp viene a buscar la vista previa del enlace, eso vale como
 * prueba de que la invitación se mandó: la misión se marca sola y esa visita
 * no se cuenta como un clic.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const sinCache = { "Cache-Control": "no-store, max-age=0" };

  if (!esId(id)) return NextResponse.redirect(base, { status: 302, headers: sinCache });
  const p = await porId(id);
  if (!p) return NextResponse.redirect(base, { status: 302, headers: sinCache });

  const robot = redDelRobot(request.headers.get("user-agent"));
  after(async () => {
    if (robot === "whatsapp") {
      await cambiar(id, (q) => marcar(q, "invitar", "WhatsApp pidió la vista previa")).catch(() => null);
    } else if (!robot) {
      await contarInvitacion(id).catch(() => null);
    }
  });

  const destino = new URL(base);
  destino.searchParams.set("utm_source", "experiencia");
  destino.searchParams.set("utm_medium", "whatsapp");
  destino.searchParams.set("utm_campaign", "habinext-invita");
  destino.searchParams.set("utm_content", id);
  return NextResponse.redirect(destino.toString(), { status: 302, headers: sinCache });
}
