import Recuperacion from "@/components/admin/Recuperacion";
import { Aviso } from "@/components/admin/comunes";
import { ultimaCampana } from "@/lib/recuperacion";
import { todos, type Registro } from "@/lib/registros";
import { haySesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function PaginaRecuperacion({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  if (!(await haySesion())) return null;
  const [registros, campana] = await Promise.all([todos().catch(() => [] as Registro[]), ultimaCampana().catch(() => null)]);
  return (
    <>
      <Aviso aviso={aviso} />
      <Recuperacion registros={registros} campana={campana} />
    </>
  );
}
