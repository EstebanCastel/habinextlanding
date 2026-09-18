import { NextResponse } from "next/server";
import { leerArchivo } from "@/lib/almacen";
import { esId, porId, rutaDeCarnet } from "@/lib/experiencia";

/**
 * El carnet en público: es lo que LinkedIn y WhatsApp muestran como vista
 * previa cuando alguien comparte el enlace de su carnet (`/c/<id>`). Solo
 * existe para quien ya armó su carnet, y el carnet es la única cosa de la
 * persona que se puede ver sin sesión, porque se hizo para eso.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const limpio = id.replace(/\.(jpg|jpeg|png)$/i, "");
  if (!esId(limpio)) return new NextResponse("No existe", { status: 404 });

  const p = await porId(limpio);
  if (!p?.carnet?.formatos.includes("feed")) return new NextResponse("No existe", { status: 404 });

  const archivo = await leerArchivo(rutaDeCarnet(p.id, "feed"));
  if (!archivo) return new NextResponse("No existe", { status: 404 });

  return new NextResponse(archivo.stream, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(archivo.tamano),
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
