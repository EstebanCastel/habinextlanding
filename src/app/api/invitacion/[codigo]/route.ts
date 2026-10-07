import { NextResponse } from "next/server";
import { leerArchivo } from "@/lib/almacen";
import { codigoValido, firmaValida, rutaInvitacion } from "@/lib/invitaciones";

/**
 * La pieza de invitación de un código, para que Meta la baje como cabecera
 * del mensaje de WhatsApp. Solo con la firma correcta (`?k=`): sin ella, o
 * con un código que no existe, 404 a secas, sin distinguir un caso del otro.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, contexto: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await contexto.params;
  const k = new URL(request.url).searchParams.get("k") ?? "";
  const limpio = decodeURIComponent(codigo).toUpperCase();
  if (!codigoValido(limpio) || !firmaValida(limpio, k)) return new NextResponse(null, { status: 404 });

  const archivo = await leerArchivo(rutaInvitacion(limpio));
  if (!archivo) return new NextResponse(null, { status: 404 });
  return new NextResponse(archivo.stream, {
    headers: {
      "Content-Type": archivo.contentType,
      "Content-Length": String(archivo.tamano),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
