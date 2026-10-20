import type { Metadata } from "next";
import Marco from "@/components/experiencia/Marco";
import Tienda from "@/components/experiencia/Tienda";
import { EVENT } from "@/config/event";
import { vistaDe } from "@/lib/experiencia";
import { participanteActual } from "@/lib/experiencia-http";

/**
 * La tienda de canje, en su propia página.
 *
 * Los puntos del día no servían para nada visible: se sumaban, salían en una
 * barra y ahí morían. Esto es lo que compran.
 */

export const metadata: Metadata = {
  title: `La tienda · ${EVENT.fullName}`,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PaginaTienda() {
  const p = await participanteActual();
  const yo = p ? vistaDe(p) : null;

  return (
    <Marco
      yo={yo}
      eyebrow="Canjea tus puntos"
      titulo={
        <>
          La <span className="font-bold">tienda.</span>
        </>
      }
      bajada="Lo que juntaste hoy se cambia por algo que te llevas. El canje es en el stand de Habi."
    >
      <div className="mx-auto w-full max-w-5xl pb-20">
        <Tienda yo={yo} />
      </div>
    </Marco>
  );
}
