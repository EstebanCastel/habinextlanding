import { entradaDe, type Entrada } from "@/lib/entrada";
import { dentroDelLimite, error, participanteActual, responder, vincularRegistroSiFalta } from "@/lib/experiencia-http";

/**
 * La entrada de quien está en sesión: el QR de Luma para el reverso de la
 * credencial, más el estado de la compra.
 *
 * Es GET y no POST porque no cambia nada y la pantalla la pide al abrirse.
 * El QR nunca se guarda en el documento del participante: se pide a Luma en
 * el momento, que es la única fuente que la puerta reconoce.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const p = await participanteActual();
  if (!p) return error("Entra para ver tu entrada.", 401);

  // Quien compró después de armar su carnet todavía no tiene la entrada
  // enlazada: se intenta enlazar acá, que es justo cuando hace falta.
  // Buscar la entrada recorre todos los registros: se intenta unas pocas
  // veces por persona cada diez minutos, no en cada recarga de la página.
  const buscar = !p.registro && dentroDelLimite(`entrada:${p.id}`, 4, 10 * 60_000);
  const conRegistro = p.registro || !buscar ? p : await vincularRegistroSiFalta(p);
  if (!conRegistro.registro) {
    return responder({
      ok: true,
      entrada: null,
      motivo: "Todavía no encontramos una entrada a tu nombre. Si ya compraste, entra con el mismo correo.",
    });
  }

  const entrada: Entrada | null = await entradaDe(conRegistro.registro.token).catch(() => null);
  if (!entrada) {
    return responder({ ok: true, entrada: null, motivo: "No pudimos leer tu entrada en este momento." });
  }
  return responder({ ok: true, entrada });
}
