import Codigos, { POR_PAGINA } from "@/components/admin/Codigos";
import { Aviso, paginaDe } from "@/components/admin/comunes";
import { filtrarCodigos as filtrar, todos, type CodigoConEstado } from "@/lib/codigos";
import { haySesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";

const ESTADOS = new Set(["todos", "redimidos", "asignados", "sin-asignar", "desactivados"]);

export default async function PaginaCodigos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  if (!(await haySesion())) return null;

  const codigos = await todos().catch(() => [] as CodigoConEstado[]);
  const estado = q.estado && ESTADOS.has(q.estado) ? q.estado : "todos";
  const entrada = q.entrada === "vip" || q.entrada === "general" ? q.entrada : "todas";
  const texto = (q.q ?? "").slice(0, 80);
  const total = filtrar(codigos, { estado, entrada, q: texto, pagina: 1 }).length;
  const pagina = paginaDe(q.pagina, total, POR_PAGINA);

  return (
    <>
      <Aviso aviso={q.aviso} />
      <Codigos codigos={codigos} filtros={{ estado, entrada, q: texto, pagina }} />
    </>
  );
}
