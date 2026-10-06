import { redirect } from "next/navigation";
import { bloqueada, type ExperienciaId } from "@/config/experiencia";
import { vistaDe, type Vista } from "./experiencia";
import { participanteActual } from "./experiencia-http";
import { haySesion } from "./sesion";

/**
 * Una experiencia de `BLOQUEADAS` no se abre ni escribiendo la URL: se
 * devuelve a la portada con `?cerrada=<id>`, que es donde está el candado.
 * Va antes de `exigirSesion` para no abrir la ventana de entrada de algo que
 * todavía no existe. La sesión del panel pasa, para revisarla antes de abrirla.
 */
export async function exigirAbierta(id: ExperienciaId): Promise<void> {
  if (!bloqueada(id) || (await haySesion())) return;
  redirect(`/experiencia?cerrada=${id}`);
}

/** La persona con sesión, o el envío a la portada con la entrada abierta hacia `destino`. */
export async function exigirSesion(destino: string): Promise<Vista> {
  const p = await participanteActual().catch(() => null);
  if (!p) redirect(`/experiencia?entrar=${encodeURIComponent(destino)}`);
  return vistaDe(p);
}
