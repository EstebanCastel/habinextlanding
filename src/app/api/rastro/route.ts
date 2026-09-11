import { NextResponse } from "next/server";
import { guardarLote, type Evento, type Lote } from "@/lib/rastro";

/**
 * Recibe los lotes de eventos que manda la página.
 *
 * Es público y anónimo —lo llama el navegador de cualquier visitante—, así que
 * todo lo que entra se trata como texto hostil: se recorta, se limita la
 * cantidad de eventos por lote y se descarta lo que no encaje. Lo peor que
 * puede conseguir alguien que lo golpee es ensuciar sus propias estadísticas.
 *
 * La IP no se guarda. El país y la región llegan ya resueltos en las cabeceras
 * de Vercel, que es el dato que sirve para decidir dónde pautar sin quedarse
 * con un identificador personal.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const texto = (v: unknown, max = 200): string | undefined => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : undefined;
};

const TIPOS = new Set(["visita", "scroll", "clic", "salida"]);

export async function POST(request: Request) {
  const crudo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!crudo) return NextResponse.json({ ok: false }, { status: 400 });

  const visitante = texto(crudo.visitante, 40);
  const sesion = texto(crudo.sesion, 40);
  if (!visitante || !sesion) return NextResponse.json({ ok: false }, { status: 400 });

  const entrantes = Array.isArray(crudo.eventos) ? crudo.eventos : [];
  const eventos: Evento[] = entrantes
    .slice(0, 60)
    .map((e) => e as Record<string, unknown>)
    .filter((e) => TIPOS.has(String(e.tipo)))
    .map((e) => ({
      tipo: String(e.tipo),
      en: texto(e.en, 30) ?? new Date().toISOString(),
      ...(e.valor !== undefined && e.valor !== null
        ? { valor: typeof e.valor === "number" ? e.valor : texto(e.valor, 80)! }
        : {}),
    }));

  if (!eventos.length) return NextResponse.json({ ok: true, guardados: 0 });

  const utm = (crudo.utm ?? {}) as Record<string, unknown>;
  const disp = (crudo.dispositivo ?? {}) as Record<string, unknown>;
  const tipoDisp = String(disp.tipo);

  const lote: Lote = {
    visitante,
    sesion,
    utm: {
      ...(texto(utm.source, 60) ? { source: texto(utm.source, 60) } : {}),
      ...(texto(utm.medium, 60) ? { medium: texto(utm.medium, 60) } : {}),
      ...(texto(utm.campaign, 80) ? { campaign: texto(utm.campaign, 80) } : {}),
      ...(texto(utm.content, 80) ? { content: texto(utm.content, 80) } : {}),
      ...(texto(utm.term, 80) ? { term: texto(utm.term, 80) } : {}),
    },
    ...(texto(crudo.referente, 300) ? { referente: texto(crudo.referente, 300) } : {}),
    entrada: texto(crudo.entrada, 200) ?? "/",
    dispositivo: {
      tipo: tipoDisp === "movil" || tipoDisp === "tableta" ? tipoDisp : "escritorio",
      ...(texto(disp.sistema, 40) ? { sistema: texto(disp.sistema, 40) } : {}),
      ...(texto(disp.navegador, 40) ? { navegador: texto(disp.navegador, 40) } : {}),
      ...(Number.isFinite(Number(disp.ancho)) ? { ancho: Math.trunc(Number(disp.ancho)) } : {}),
      ...(texto(disp.idioma, 20) ? { idioma: texto(disp.idioma, 20) } : {}),
      ...(texto(disp.zona, 60) ? { zona: texto(disp.zona, 60) } : {}),
    },
    geo: {
      ...(request.headers.get("x-vercel-ip-country")
        ? { pais: request.headers.get("x-vercel-ip-country")! }
        : {}),
      ...(request.headers.get("x-vercel-ip-country-region")
        ? { region: request.headers.get("x-vercel-ip-country-region")! }
        : {}),
      ...(request.headers.get("x-vercel-ip-city")
        ? { ciudad: decodeURIComponent(request.headers.get("x-vercel-ip-city")!) }
        : {}),
    },
    eventos,
    recibidoEn: new Date().toISOString(),
  };

  try {
    await guardarLote(lote);
  } catch (error) {
    // Que falle el cuaderno no es asunto del visitante: se responde 200 igual,
    // porque un 500 aquí solo haría que el navegador reintente por nada.
    console.error("[rastro] no se pudo guardar:", (error as Error).message);
  }

  return NextResponse.json({ ok: true, guardados: eventos.length });
}
