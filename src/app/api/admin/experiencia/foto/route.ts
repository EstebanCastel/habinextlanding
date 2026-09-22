import { NextResponse } from "next/server";
import { leerArchivo } from "@/lib/almacen";
import { esId, porId } from "@/lib/experiencia";
import { haySesion } from "@/lib/sesion";

/** Una foto de un participante (parada del mapa o prueba), para el operador. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await haySesion())) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const q = new URL(request.url).searchParams;
  const id = q.get("id") ?? "";
  const f = q.get("f") ?? "";
  if (!esId(id)) return new NextResponse("No existe", { status: 404 });
  const p = await porId(id);
  const foto = p?.fotos.find((x) => x.id === f);
  if (!foto) return new NextResponse("No existe", { status: 404 });
  const archivo = await leerArchivo(foto.ruta);
  if (!archivo) return new NextResponse("No existe", { status: 404 });
  return new NextResponse(archivo.stream, {
    headers: {
      "Content-Type": archivo.contentType,
      "Content-Length": String(archivo.tamano),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
