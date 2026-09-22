import { redirect } from "next/navigation";
import { vistaDe, type Vista } from "./experiencia";
import { participanteActual } from "./experiencia-http";

/** La persona con sesión, o el envío a la portada con la entrada abierta hacia `destino`. */
export async function exigirSesion(destino: string): Promise<Vista> {
  const p = await participanteActual().catch(() => null);
  if (!p) redirect(`/experiencia?entrar=${encodeURIComponent(destino)}`);
  return vistaDe(p);
}
