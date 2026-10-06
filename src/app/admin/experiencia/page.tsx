import ExperienciaPanel from "@/components/admin/ExperienciaPanel";
import { Aviso, paginaDe, sitio } from "@/components/admin/comunes";
import { todos as todosLosParticipantes, type Participante } from "@/lib/experiencia";
import { haySesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function PaginaExperiencia({ searchParams }: { searchParams: Promise<{ aviso?: string; pagina?: string }> }) {
  const q = await searchParams;
  if (!(await haySesion())) return null;
  const participantes = await todosLosParticipantes().catch(() => [] as Participante[]);
  return (
    <>
      <Aviso aviso={q.aviso} />
      <ExperienciaPanel lista={participantes} sitio={sitio()} pagina={paginaDe(q.pagina, participantes.length, 50)} />
    </>
  );
}
