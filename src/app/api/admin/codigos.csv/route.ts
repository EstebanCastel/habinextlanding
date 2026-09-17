import { NextResponse } from "next/server";
import { aCsv, todos } from "@/lib/codigos";
import { haySesion } from "@/lib/sesion";

/** Los códigos con su estado, para repartir y para revisar quién ya entró. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await haySesion())) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
  const filtro = new URL(request.url).searchParams.get("estado");

  let lista = await todos();
  if (filtro === "redimidos") lista = lista.filter((c) => c.usos > 0);
  if (filtro === "disponibles") lista = lista.filter((c) => c.usos === 0);

  const hoy = new Date().toISOString().slice(0, 10);
  return new NextResponse(aCsv(lista, sitio), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="habinext-codigos-${hoy}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
