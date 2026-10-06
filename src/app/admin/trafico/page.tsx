import Experimento from "@/components/admin/Experimento";
import Trafico from "@/components/admin/Trafico";
import { lotes, resumir } from "@/lib/rastro";
import { haySesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function PaginaTrafico() {
  if (!(await haySesion())) return null;
  const trafico = resumir(await lotes().catch(() => []));
  return (
    <>
      <Trafico r={trafico} />
      <Experimento r={trafico} />
    </>
  );
}
