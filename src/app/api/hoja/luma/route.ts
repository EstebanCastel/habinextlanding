import { NextResponse } from "next/server";
import { CABECERA_LUMA, tablaLuma } from "@/lib/hoja-luma";
import { tokenValido } from "@/lib/seguridad";

/**
 * Los registros de Luma (General y VIP, aprobados y pendientes) para la hoja
 * de Google del equipo. Mismo token y misma forma que `/api/hoja/embajadores`:
 * `{ cabecera, filas, resumen }`, refrescado por el Apps Script.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Pagina Luma y lee todos los registros y participantes del almacén. */
export const maxDuration = 120;

function tokenRecibido(request: Request): string | null {
  const m = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export async function GET(request: Request) {
  if (!tokenValido(tokenRecibido(request), process.env.HOJA_TOKEN)) {
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }
  try {
    const t = await tablaLuma();
    return NextResponse.json({ ok: true, actualizadoEn: new Date().toISOString(), cabecera: CABECERA_LUMA, filas: t.filas, resumen: t.resumen }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[hoja/luma]", (error as Error).message);
    return NextResponse.json({ ok: false, error: "No pudimos leer Luma en este momento." }, { status: 502 });
  }
}
