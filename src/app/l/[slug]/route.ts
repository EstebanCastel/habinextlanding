import { after, NextResponse } from "next/server";
import { claseDeAgente } from "@/lib/agentes";
import { contarClic, crear, destinoDe, normalizar, traer } from "@/lib/enlaces";

/**
 * Enlace corto: `/l/li` → la landing con las UTM de LinkedIn.
 *
 * El conteo va en `after`, después de responder: si el almacén se demora o
 * falla, la persona llega igual a la página. Perder la cuenta de un clic es
 * mucho menos grave que perder la visita.
 */

export const runtime = "nodejs";

function varianteDe(valor: string | null): string | undefined {
  const v = String(valor ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,30}$/.test(v) ? v : undefined;
}
export const dynamic = "force-dynamic";

/** El canal se lee del prefijo con el que el equipo nombra los enlaces: `ig-`, `mail-`, `li-`, `wa-`… */
function medioPorPrefijo(slug: string): string {
  const p = slug.split("-")[0];
  return { ig: "instagram", mail: "email", li: "linkedin", linkedin: "linkedin", wa: "whatsapp", fb: "facebook", tiktok: "tiktok", tt: "tiktok" }[p] ?? "enlace";
}

export async function GET(request: Request, contexto: { params: Promise<{ slug: string }> }) {
  const { slug } = await contexto.params;
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  let enlace = await traer(slug).catch(() => null);
  // Un enlace que nadie creó en el panel (una pieza salió con un nombre nuevo)
  // se crea solo al primer clic, con nota, y desde ahí se mide como los demás:
  // ningún clic se pierde. Si el nombre no sirve ni para eso, a la portada.
  if (!enlace) {
    const limpio = normalizar(slug);
    if (/^[a-z0-9][a-z0-9-]{1,39}$/.test(limpio)) {
      const r = await crear({
        slug: limpio,
        destino: "/",
        source: limpio.replace(/^(ig|mail|li|linkedin|wa|fb|tiktok|tt)-/, ""),
        medium: medioPorPrefijo(limpio),
        campaign: "habinext-2026",
        nota: "Creado solo al primer clic: nadie lo había creado en el panel",
      }).catch(() => null);
      enlace = r?.ok ? await traer(limpio).catch(() => null) : null;
    }
    if (!enlace) return NextResponse.redirect(base, { status: 302, headers: { "Cache-Control": "no-store" } });
  }

  // `?c=a` distingue variantes de una misma pieza (dos copys de WhatsApp, dos
  // historias) sin abrir un enlace por cada una: el clic se cuenta por variante
  // y la variante viaja como utm_content hasta el registro de la compra.
  const variante = varianteDe(new URL(request.url).searchParams.get("c"));
  const ua = request.headers.get("user-agent") ?? "";
  const clase = claseDeAgente(ua);
  // Queda en los logs de Vercel: es la única forma de ver quién toca el link
  // (los robots de revisión de Meta y los escáneres de los celulares también cuentan).
  console.log(JSON.stringify({ enlace: slug, variante: variante ?? null, clase, ua: ua.slice(0, 140) }));
  after(() => contarClic(slug, variante, clase).catch(() => null));

  const conVariante = variante ? { ...enlace, utm: { ...enlace.utm, content: variante } } : enlace;
  return NextResponse.redirect(destinoDe(conVariante, base), {
    status: 302,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
