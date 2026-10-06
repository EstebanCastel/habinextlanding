import type { Metadata } from "next";
import Agenda from "@/components/experiencia/Agenda";
import Marco from "@/components/experiencia/Marco";
import { EVENT } from "@/config/event";
import { participanteActual } from "@/lib/experiencia-http";
import { interesPorSesion, vistaDe } from "@/lib/experiencia";

export const metadata: Metadata = {
  title: `La agenda · ${EVENT.fullName}`,
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * La agenda es la única pantalla de la experiencia que se ve sin haber
 * entrado: es información del evento, no progreso de nadie, y sirve de
 * argumento de venta para quien todavía no tiene entrada. Va sin horas
 * mientras el equipo las cierra: el orden del programa sí es el real.
 */
export default async function PaginaAgenda() {
  const [p, conteos] = await Promise.all([participanteActual(), interesPorSesion().catch(() => ({}))]);
  const yo = p ? vistaDe(p) : null;
  return (
    <Marco
      yo={yo}
      eyebrow="Programación"
      titulo={
        <>
          La <span className="font-bold">agenda.</span>
        </>
      }
      bajada="Dos salones en paralelo durante todo el día, en el orden en que pasan. Marca las que te interesan y toca una para ver qué te llevas."
    >
      <Agenda yo={yo} conteos={conteos} />
    </Marco>
  );
}
