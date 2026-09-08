import { after, NextResponse } from "next/server";
import { reflejar } from "@/lib/hoja";
import { anotar, guardarReferencia, porToken } from "@/lib/registros";

/**
 * El link personal de pago que cada persona recibe por WhatsApp.
 *
 * Existe por dos razones que un enlace directo a Wompi no puede cumplir:
 *
 * - **Saber quién abrió el pago.** Es el único punto entre "le mandamos el
 *   mensaje" y "pagó" donde hay señal. Sin esto, alguien que abandona el
 *   checkout es indistinguible de alguien que nunca abrió el mensaje, y son
 *   dos conversaciones de seguimiento muy distintas.
 * - **Darle a cada persona su propia UTM y su propia referencia**, que es lo
 *   que después permite reconciliar un pago con un registro de Luma.
 *
 * El token es un secreto de 160 bits: quien lo tiene puede ver a dónde lleva
 * el pago, y nada más. No expone datos de la persona ni permite modificar su
 * registro.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Referencia corta y estable por registro, la que se concilia con Wompi. */
function referenciaDe(token: string): string {
  return `HN-${token.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase()}`;
}

function paginaSimple(titulo: string, cuerpo: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="es"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <title>${titulo} · Habi Next</title>
     <style>
       :root { color-scheme: dark }
       body { margin:0; min-height:100dvh; display:grid; place-items:center; background:#0a0a0b;
              color:#f5f2ff; font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif; padding:24px }
       main { max-width:34rem; text-align:center }
       h1 { font-size:1.5rem; margin:0 0 .75rem; color:#ba9dfa }
       p { margin:0 0 1rem; color:#cfc7e4 }
       a { color:#ba9dfa }
     </style></head>
     <body><main><h1>${titulo}</h1><p>${cuerpo}</p>
     <p><a href="https://www.habinext.com">Volver a Habi Next</a></p></main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

export async function GET(_request: Request, contexto: { params: Promise<{ token: string }> }) {
  const { token } = await contexto.params;

  const registro = await porToken(token).catch(() => null);
  if (!registro) {
    return paginaSimple(
      "Este link ya no está disponible",
      "Puede que el enlace esté incompleto o que el registro se haya cancelado. Escríbenos por WhatsApp y lo revisamos contigo.",
      404
    );
  }

  if (registro.etapa === "aprobado") {
    return paginaSimple(
      "Tu entrada ya está confirmada",
      "Este registro ya quedó aprobado y la entrada salió a tu correo con el código QR. Nos vemos el 20 de octubre.",
      200
    );
  }

  const destinoBase =
    registro.tier === "vip" ? process.env.WOMPI_LINK_VIP : process.env.WOMPI_LINK_GENERAL;
  if (!destinoBase) {
    return paginaSimple(
      "El pago no está disponible ahora mismo",
      "Estamos ajustando la pasarela. Escríbenos por WhatsApp y te ayudamos a completar tu entrada.",
      503
    );
  }

  const referencia = referenciaDe(registro.token);
  const destino = new URL(destinoBase);
  // UTM propia por persona: `utm_content` lleva el token, así que una visita al
  // checkout se puede rastrear hasta el registro exacto que la originó.
  destino.searchParams.set("utm_source", "whatsapp");
  destino.searchParams.set("utm_medium", "infobip");
  destino.searchParams.set("utm_campaign", `habinext-2026-${registro.tier}`);
  destino.searchParams.set("utm_content", registro.token);
  destino.searchParams.set("utm_term", registro.pago.etiquetaEtapa.toLowerCase().replace(/\s+/g, "-"));
  destino.searchParams.set("reference", referencia);

  // La anotación va después de armar el destino: si el almacén falla, la
  // persona igual llega a pagar. Perder una marca de seguimiento es mucho
  // menos grave que perder una venta.
  after(async () => {
    try {
      await guardarReferencia(referencia, registro.token);
      const actualizado = await anotar(
        registro.token,
        "abrió el link de pago",
        (r) => ({
          etapa: "pago_abierto" as const,
          pago: {
            ...r.pago,
            abiertoEn: r.pago.abiertoEn ?? new Date().toISOString(),
            url: destino.toString(),
            referencia,
          },
        }),
        registro.tier
      );
      if (actualizado) await reflejar(actualizado);
    } catch (error) {
      console.error("[pago] no se pudo anotar la apertura:", (error as Error).message);
    }
  });

  return NextResponse.redirect(destino.toString(), {
    status: 302,
    headers: {
      // Sin caché: el estado del registro cambia y el navegador no debe
      // quedarse con un redirect viejo.
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}
