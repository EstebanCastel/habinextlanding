import type { Metadata } from "next";
import Marco from "@/components/experiencia/Marco";
import Podio from "@/components/experiencia/Podio";
import { EVENT } from "@/config/event";
import { ranking, vistaDe } from "@/lib/experiencia";
import { participanteActual } from "@/lib/experiencia-http";

/**
 * El podio, en su propia página.
 *
 * Vivía al final de la portada, debajo de todo, donde casi nadie bajaba. Un
 * marcador que no se ve no compite con nadie.
 */

export const metadata: Metadata = {
  title: `El podio · ${EVENT.fullName}`,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PaginaPodio() {
  const [p, r] = await Promise.all([participanteActual(), ranking().catch(() => null)]);
  const yo = p ? vistaDe(p) : null;

  return (
    <Marco
      yo={yo}
      eyebrow="Quién va ganando"
      titulo={
        <>
          El <span className="font-bold">podio.</span>
        </>
      }
      bajada="Se cierra hoy al final del día. Los puntos se canjean en la tienda, en el stand de Habi."
    >
      <div className="mx-auto w-full max-w-3xl pb-20">
        <section className="rounded-3xl border border-white/12 bg-white/[0.03] p-5 sm:p-7">
          {r?.podio?.length ? (
            <Podio podio={r.podio} />
          ) : (
            <p className="text-base font-light text-white/50">
              Todavía nadie ha sumado puntos. Haz tu carnet y publícalo: ahí empieza.
            </p>
          )}
        </section>
        {r?.total ? (
          <p className="mt-4 text-center text-sm font-light text-white/40">
            {r.total} personas jugando
          </p>
        ) : null}
      </div>
    </Marco>
  );
}
