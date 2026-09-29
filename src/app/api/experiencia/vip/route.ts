import { after } from "next/server";
import { pasarAVip } from "@/lib/bot";
import { entradaDe } from "@/lib/entrada";
import { dentroDelLimite, error, ipDe, mismoOrigen, participanteActual, responder } from "@/lib/experiencia-http";
import { porToken } from "@/lib/registros";
import { vincularRegistro } from "@/lib/experiencia";

/**
 * Pasar de General a VIP desde la experiencia, sin tener que escribirle a
 * nadie.
 *
 * Solo para quien todavía no ha pagado. A quien ya pagó General hay que
 * cobrarle la diferencia y volver a emitirle la entrada, y eso hoy lo resuelve
 * una persona: reusar este camino le cobraría el VIP completo, que sería
 * cobrarle dos veces lo mismo.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);
  const p = await participanteActual();
  if (!p) return error("Entra para mejorar tu entrada.", 401);
  if (!dentroDelLimite(`vip:${ipDe(request)}`, 6, 10 * 60_000)) return error("Demasiados intentos.", 429);

  if (!p.registro && p.email) await vincularRegistro(p.id, p.email);
  const actual = p.registro ?? (await participanteActual())?.registro;
  if (!actual) return error("No encontramos una entrada a tu nombre. Compra la tuya y vuelve acá.", 404);

  const registro = await porToken(actual.token);
  if (!registro) return error("No encontramos tu entrada.", 404);
  if (registro.tier === "vip") return responder({ ok: true, yaEra: true, pagar: `/p/${registro.token}` });

  if (registro.etapa === "aprobado" || registro.etapa === "pago_confirmado") {
    return error(
      "Tu entrada General ya está pagada. Escríbenos por WhatsApp y te cobramos solo la diferencia.",
      409
    );
  }

  const r = await pasarAVip(registro);
  if (!r.ok) return error(`No pudimos hacer el cambio: ${r.nota}`, 502);

  // La vista de la credencial queda desactualizada hasta que se relea la
  // entrada; se fuerza acá para que la tarjeta cambie a VIP de inmediato.
  after(() => entradaDe(registro.token).catch(() => null));

  return responder({ ok: true, pagar: `/p/${registro.token}` });
}
