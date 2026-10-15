import { AVISO_EQUIPO } from "@/config/equipo";
import { entradaDe, type Entrada } from "@/lib/entrada";
import { anotar, cambiar } from "@/lib/experiencia";
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
  // Al equipo de Habi no se le busca entrada: no la tiene ni la necesita.
  if (p.equipo && !p.registro) return responder({ ok: true, entrada: null, motivo: AVISO_EQUIPO });

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

  // La copia de la entrada que lleva el participante se queda vieja cuando a
  // alguien lo suben de General a VIP: el QR sale bien, porque se lee del
  // registro, pero el resto de la experiencia le sigue diciendo «General».
  // Acá se refresca con lo que acaba de devolver el registro.
  const guardada = conRegistro.registro;
  if (guardada.tier !== entrada.tier || guardada.etapa !== entrada.etapa) {
    await cambiar(conRegistro.id, (q) =>
      anotar(
        { ...q, registro: { ...guardada, tier: entrada.tier, etapa: entrada.etapa, vinculadoEn: new Date().toISOString() } },
        "su entrada cambió",
        `${guardada.tier}/${guardada.etapa} → ${entrada.tier}/${entrada.etapa}`
      )
    ).catch(() => null);
  }

  return responder({ ok: true, entrada });
}
