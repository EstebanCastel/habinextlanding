import { after, NextResponse } from "next/server";
import { claseDeAgente } from "@/lib/agentes";
import { contarClic, crear, destinoDe, normalizar, traer } from "@/lib/enlaces";
import { modificar } from "@/lib/almacen";

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

/** Cuántos enlaces pueden crearse solos en total: un tope para que un escáner no llene el panel. */
const TOPE_AUTO = 150;
const NOMBRE_RARO = /^(wp|admin|env|php|git|xml|json|well-known|cgi|login|api|static|assets|img|js|css)(-|$)/;

async function cupoParaCrear(): Promise<boolean> {
  const c = await modificar<{ n: number }>("candados/enlaces-auto.json", (previo) => ({ n: (previo?.n ?? 0) + 1 })).catch(() => null);
  return Boolean(c && c.n <= TOPE_AUTO);
}

export async function GET(request: Request, contexto: { params: Promise<{ slug: string }> }) {
  const { slug } = await contexto.params;
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const ua = request.headers.get("user-agent") ?? "";
  const clase = claseDeAgente(ua);

  let enlace = await traer(slug).catch(() => null);
  // Un enlace que nadie creó en el panel (una pieza salió con un nombre nuevo)
  // se crea solo al primer clic de una persona, con nota, y desde ahí se mide
  // como los demás: ningún clic se pierde. Los robots (vistas previas,
  // escáneres) no crean nada, el nombre tiene que parecer un nombre y hay un
  // tope total, para que nadie llene el panel a punta de direcciones inventadas.
  if (!enlace) {
    const limpio = normalizar(slug);
    const parece = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(limpio) && limpio.length >= 2 && limpio.length <= 40 && !NOMBRE_RARO.test(limpio);
    if (clase !== "robot" && parece && (await cupoParaCrear())) {
      await crear({
        slug: limpio,
        destino: "/",
        // La fuente es el nombre completo: con el prefijo quitado, `ig-pipe`
        // se sumaría a lo que trae el enlace `pipe` del equipo.
        source: limpio,
        medium: medioPorPrefijo(limpio),
        campaign: "habinext-2026",
        nota: "Creado solo al primer clic: nadie lo había creado en el panel",
      }).catch(() => null);
      // Se relee siempre: si dos clics llegan a la vez, el que pierde la
      // creación encuentra el enlace que el otro acaba de escribir.
      enlace = await traer(limpio).catch(() => null);
    }
    if (!enlace) return NextResponse.redirect(base, { status: 302, headers: { "Cache-Control": "no-store" } });
  }

  // `?c=a` distingue variantes de una misma pieza (dos copys de WhatsApp, dos
  // historias) sin abrir un enlace por cada una: el clic se cuenta por variante
  // y la variante viaja como utm_content hasta el registro de la compra.
  const variante = varianteDe(new URL(request.url).searchParams.get("c"));
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
