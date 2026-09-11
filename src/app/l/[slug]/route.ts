import { after, NextResponse } from "next/server";
import { contarClic, destinoDe, traer } from "@/lib/enlaces";

/**
 * Enlace corto: `/l/li` → la landing con las UTM de LinkedIn.
 *
 * El conteo va en `after`, después de responder: si el almacén se demora o
 * falla, la persona llega igual a la página. Perder la cuenta de un clic es
 * mucho menos grave que perder la visita.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, contexto: { params: Promise<{ slug: string }> }) {
  const { slug } = await contexto.params;
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const enlace = await traer(slug).catch(() => null);
  // Un enlace que no existe manda a la portada en vez de a un 404: puede ser
  // un link viejo de una pieza que sigue circulando, y es preferible que esa
  // persona vea el evento a que vea un error.
  if (!enlace) {
    return NextResponse.redirect(base, { status: 302, headers: { "Cache-Control": "no-store" } });
  }

  after(() => contarClic(slug).catch(() => null));

  return NextResponse.redirect(destinoDe(enlace, base), {
    status: 302,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
