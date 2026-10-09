import { NextResponse } from "next/server";
import { aCsv, lotes } from "@/lib/rastro";
import { haySesion } from "@/lib/sesion";

/** Descarga del rastro como CSV, una fila por sesión. Solo con sesión abierta. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Son decenas de miles de lotes pequeños: el tiempo por defecto no alcanza. */
export const maxDuration = 120;

export async function GET() {
  if (!(await haySesion())) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const csv = aCsv(await lotes(120, 30_000));
  const hoy = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="habinext-visitas-${hoy}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
