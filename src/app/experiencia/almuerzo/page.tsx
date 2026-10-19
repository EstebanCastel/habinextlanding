import type { Metadata } from "next";
import Marco from "@/components/experiencia/Marco";
import MiAlmuerzo from "@/components/experiencia/MiAlmuerzo";
import { EVENT } from "@/config/event";
import { vistaDe } from "@/lib/experiencia";
import { participanteActual } from "@/lib/experiencia-http";

/**
 * El almuerzo, en su propia página.
 *
 * Antes vivía dentro de la agenda, encima de las cuarenta sesiones del día.
 * Quien entraba a escoger turno tenía que pasar por todo lo demás, y quien
 * entraba a mirar la agenda se encontraba con un formulario que no había
 * pedido. Son dos cosas distintas y ahora son dos páginas.
 */

export const metadata: Metadata = {
  title: `Mi almuerzo · ${EVENT.fullName}`,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Almuerzo() {
  const p = await participanteActual();
  const yo = p ? vistaDe(p) : null;

  return (
    <Marco
      yo={yo}
      eyebrow="Tu entrada VIP"
      titulo={
        <>
          Mi <span className="font-bold">almuerzo.</span>
        </>
      }
      bajada="Tres turnos de media hora entre 12:30 y 2:00. Escoge el tuyo y quédate con el pase."
    >
      <div className="mx-auto w-full max-w-2xl pb-20">
        <MiAlmuerzo yo={yo} />
      </div>
    </Marco>
  );
}
