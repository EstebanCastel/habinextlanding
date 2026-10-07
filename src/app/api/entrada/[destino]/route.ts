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
 *
 * Se atiende de dos maneras, según la cabecera `Accept`:
 *
 * - Con `application/json` (el panel, una petición desde la página) responde
 *   JSON: `{ url }` para Google, el `.pkpass` para Apple, `{ error, codigo }`
 *   si algo falta.
 * - Sin ella es una navegación desde el distintivo de la credencial. En
 *   iPhone, Safari solo abre la hoja «Agregar a Wallet» cuando navega a la
 *   URL del `.pkpass`, así que se devuelve el archivo tal cual; para Google se
 *   redirige al enlace de guardar. Y como en una navegación un JSON de error
 *   sería una pantalla en blanco, cualquier tropiezo vuelve a la credencial
 *   con `?billetera=<código>`, que la pantalla traduce a una frase
 *   (`MENSAJES` en `components/experiencia/Wallet.tsx`).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Google puede llevar hasta cinco llamadas seguidas (token, clase, objeto, con sus
// reintentos por PUT) bajo un tope de 20 s, más la consulta a Luma de hasta 15 s.
export const maxDuration = 60;

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";

/** Los códigos con los que se vuelve a la credencial. Sus textos viven en `Wallet.tsx`. */
type Codigo = "sin-sesion" | "ajena" | "sin-entrada" | "sin-qr" | "apple-falta" | "google-falta" | "fallo";

export async function GET(request: Request, contexto: { params: Promise<{ destino: string }> }) {
  const { destino } = await contexto.params;
  if (destino !== "apple" && destino !== "google") {
    return NextResponse.json({ error: "destino desconocido" }, { status: 404 });
  }

  const quiereJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const fallar = (codigo: Codigo, mensaje: string, status: number) =>
    quiereJson
      ? NextResponse.json({ error: mensaje, codigo }, { status, headers: { "Cache-Control": "no-store" } })
      : NextResponse.redirect(new URL(`/experiencia/carnet?billetera=${codigo}`, request.url), 303);

  try {
    const p = await participanteActual();
    if (!p?.registro) return fallar("sin-sesion", "Entra con tu correo para bajar tu entrada.", 401);
    const pedido = new URL(request.url).searchParams.get("t");
    if (pedido && pedido !== p.registro.token) return fallar("ajena", "Esa entrada no es tuya.", 403);

    const entrada = await entradaDe(p.registro.token).catch(() => null);
    if (!entrada) return fallar("sin-entrada", "No encontramos tu entrada.", 404);
    if (!entrada.qr) return fallar("sin-qr", entrada.motivo ?? "Tu entrada todavía no tiene QR.", 409);

    if (destino === "google") {
      const r = await paseGoogle(entrada, SITIO);
      if (!r.ok) {
        console.error("[entrada/google]", r.falta);
        // Un tropiezo pasajero con Google se dice como tal; lo demás es que falta configurar.
        return fallar(r.transitorio ? "fallo" : "google-falta", r.falta, 503);
      }
      return quiereJson
        ? NextResponse.json({ url: r.url }, { headers: { "Cache-Control": "no-store" } })
        : NextResponse.redirect(r.url, { status: 302, headers: { "Cache-Control": "no-store" } });
    }

    const r = await paseApple(entrada, SITIO);
    if (!r.ok) return fallar("apple-falta", r.falta, 503);
    return new NextResponse(new Uint8Array(r.archivo), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="habinext-${entrada.tier === "vip" ? "vip" : "general"}.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[entrada/billetera]", error);
    return fallar("fallo", "No pudimos armar tu pase. Inténtalo de nuevo en un momento.", 500);
  }
}
