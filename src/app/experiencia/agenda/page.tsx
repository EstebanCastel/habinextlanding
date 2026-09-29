import type { Metadata } from "next";
import Agenda from "@/components/experiencia/Agenda";
import Marco from "@/components/experiencia/Marco";
import { EVENT } from "@/config/event";
import { participanteActual } from "@/lib/experiencia-http";
import { vistaDe } from "@/lib/experiencia";

export const metadata: Metadata = {
  title: `La agenda · ${EVENT.fullName}`,
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * La agenda es la única pantalla de la experiencia que se ve sin haber
 * entrado: es información del evento, no progreso de nadie, y sirve de
 * argumento de venta para quien todavía no tiene entrada.
 */
export default async function PaginaAgenda() {
  const p = await participanteActual();
  return (
    <Marco
      yo={p ? vistaDe(p) : null}
      eyebrow="Programación"
      titulo={
        <>
          La <span className="font-bold">agenda.</span>
        </>
      }
      bajada="Dos salones en paralelo de 9 de la mañana a 6 de la tarde. Toca una sesión para ver el salón por dentro y lo que te llevas de ella."
    >
      <Agenda />
    </Marco>
  );
}
