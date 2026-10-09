import Enlaces from "@/components/admin/Enlaces";
import Marcador from "@/components/admin/Marcador";
import { Aviso, sitio } from "@/components/admin/comunes";
import { tablero } from "@/lib/embajadores";
import { todos as todosLosEnlaces, type Enlace } from "@/lib/enlaces";
import { haySesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";
/** Lee decenas de miles de lotes del rastro: el tiempo por defecto no alcanza. */
export const maxDuration = 120;

export default async function PaginaEnlaces({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  if (!(await haySesion())) return null;

  const [enlaces, marcador] = await Promise.all([
    todosLosEnlaces().catch(() => [] as Enlace[]),
    tablero().catch(() => null),
  ]);

  return (
    <>
      <Aviso aviso={aviso} />
      {marcador ? <Marcador t={marcador} sitio={sitio()} /> : null}
      <Enlaces enlaces={enlaces} sitio={sitio()} />
    </>
  );
}
