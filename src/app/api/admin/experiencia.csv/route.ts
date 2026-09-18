import { NextResponse } from "next/server";
import { aCsv, todos } from "@/lib/experiencia";
import { haySesion } from "@/lib/sesion";

/** Quién armó su carnet, qué misiones completó y qué publicó. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await haySesion())) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
  const hoy = new Date().toISOString().slice(0, 10);
  return new NextResponse(aCsv(await todos(), sitio), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="habinext-experiencia-${hoy}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
