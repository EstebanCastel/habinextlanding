import { NextResponse } from "next/server";
import { leerArchivo } from "@/lib/almacen";
import { rutaDeCarnet } from "@/lib/experiencia";
import { participanteActual } from "@/lib/experiencia-http";

/**
 * Sirve una foto o un carnet **de la persona con sesión**. Es la única puerta
 * a los archivos del store privado: se comprueba que el archivo pedido sea de
 * quien lo pide, y la respuesta va marcada como privada para que ningún
 * intermediario la guarde.
 *
 *   ?f=<id de foto>      una de sus fotos
 *   ?f=carnet:feed       su carnet (o carnet:story)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const p = await participanteActual();
  if (!p) return new NextResponse("Sin sesión", { status: 401 });

  const f = new URL(request.url).searchParams.get("f") ?? "";
  let ruta: string | null = null;
  let nombre = "habi-next.jpg";

  if (f === "carnet:feed" || f === "carnet:story") {
    const formato = f.endsWith("story") ? "story" : "feed";
    if (p.carnet?.formatos.includes(formato)) {
      ruta = rutaDeCarnet(p.id, formato);
      nombre = `habi-next-carnet-${formato}.jpg`;
    }
  } else {
    const foto = p.fotos.find((x) => x.id === f);
    if (foto) {
      ruta = foto.ruta;
      nombre = ruta.split("/").pop() ?? nombre;
    }
  }
  if (!ruta) return new NextResponse("No existe", { status: 404 });

  const archivo = await leerArchivo(ruta);
  if (!archivo) return new NextResponse("No existe", { status: 404 });

  return new NextResponse(archivo.stream, {
    headers: {
      "Content-Type": archivo.contentType,
      "Content-Length": String(archivo.tamano),
      "Content-Disposition": `inline; filename="${nombre}"`,
      "Cache-Control": "private, max-age=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
