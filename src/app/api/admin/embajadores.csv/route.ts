import { NextResponse } from "next/server";
import { aCsv, tablero } from "@/lib/embajadores";
import { haySesion } from "@/lib/sesion";

/** La planilla para repartir: nombre, correo, enlace y meta de cada persona. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await haySesion())) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
  const csv = aCsv(await tablero(), sitio);
  const hoy = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="habinext-enlaces-${hoy}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
