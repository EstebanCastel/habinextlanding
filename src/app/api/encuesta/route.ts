import { NextResponse } from "next/server";
import { completa, type Respuesta } from "@/config/encuesta";
import { guardada, guardar } from "@/lib/encuesta";
import { participanteActual } from "@/lib/experiencia-http";
import { dentroDelLimite, error, ipDe, mismoOrigen } from "@/lib/experiencia-http";

/**
 * Recibe la encuesta de cierre.
 *
 * Acepta con sesión y sin ella: quien entró a la experiencia queda cruzado con
 * todo lo que hizo en el día, y quien llegó por el enlace del SMS contesta
 * igual sin tener que acordarse de la cédula. Una respuesta anónima vale menos
 * para analizar, pero vale mucho más que un silencio.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const p = await participanteActual();
  if (!p) return NextResponse.json({ ok: true, contestada: false }, { headers: { "Cache-Control": "no-store" } });
  const ya = await guardada(p.id).catch(() => null);
  return NextResponse.json({ ok: true, contestada: Boolean(ya) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!mismoOrigen(request)) return error("origen no permitido", 403);
  if (!dentroDelLimite(`encuesta:${ipDe(request)}`, 30, 10 * 60_000)) return error("Demasiados envíos. Espera un momento.", 429);

  const cuerpo = (await request.json().catch(() => ({}))) as { respuesta?: Partial<Respuesta>; campana?: string };
  const r = cuerpo.respuesta;
  if (!completa(r)) return error("Faltan respuestas por contestar.", 400);

  const p = await participanteActual();
  const limpia: Respuesta = {
    nps: Math.round(r.nps),
    porque: r.porque.trim().slice(0, 1200),
    partes: r.partes,
    charlas: r.charlas.slice(0, 40).map((c) => String(c).slice(0, 80)),
    aplicar: r.aplicar.trim().slice(0, 1200),
    cambiar: r.cambiar.trim().slice(0, 1200),
    vuelve: r.vuelve,
    pagaria: r.pagaria,
    duracion: r.duracion,
  };

  try {
    await guardar({
      id: p?.id,
      participante: p?.id,
      nombre: p ? `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() : undefined,
      email: p?.email,
      tier: p?.registro?.tier,
      via: p ? (request.headers.get("referer")?.includes("/encuesta") ? "enlace" : "app") : "anonimo",
      respuesta: limpia,
      campana: typeof cuerpo.campana === "string" ? cuerpo.campana.slice(0, 40) : undefined,
    });
  } catch {
    return error("No pudimos guardar la respuesta. Intenta otra vez.", 500);
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
