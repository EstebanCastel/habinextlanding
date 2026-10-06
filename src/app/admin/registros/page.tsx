import Registros, { filtrarRegistros, POR_PAGINA } from "@/components/admin/Registros";
import { Aviso, paginaDe } from "@/components/admin/comunes";
import { todos, type Registro } from "@/lib/registros";
import { haySesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";

const ESTADOS = new Set(["todos", "por-atender", "pendientes", "aprobados", "cortesias", "rechazados"]);

export default async function PaginaRegistros({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  if (!(await haySesion())) return null;

  const registros = await todos().catch(() => [] as Registro[]);
  const estado = q.estado && ESTADOS.has(q.estado) ? q.estado : "todos";
  const tier = q.tier === "vip" || q.tier === "general" ? q.tier : "todas";
  const texto = (q.q ?? "").slice(0, 80);
  const total = filtrarRegistros(registros, { estado, tier, q: texto, pagina: 1 }).length;
  const pagina = paginaDe(q.pagina, total, POR_PAGINA);

  return (
    <>
      <Aviso aviso={q.aviso} />
      <Registros registros={registros} filtros={{ estado, tier, q: texto, pagina }} />
    </>
  );
}
