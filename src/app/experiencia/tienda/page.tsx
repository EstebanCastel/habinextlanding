import type { Metadata } from "next";
import Marco from "@/components/experiencia/Marco";
import Podio from "@/components/experiencia/Podio";
import Tienda from "@/components/experiencia/Tienda";
import { EVENT } from "@/config/event";
import { ranking, vistaDe } from "@/lib/experiencia";
import { participanteActual } from "@/lib/experiencia-http";

/**
 * Los puntos, en una sola pantalla: quién va ganando y qué se compra con ellos.
 *
 * Estaban partidos en dos páginas y eran la misma pregunta. El podio sin la
 * tienda es un marcador que no paga nada; la tienda sin el podio es una lista
 * de precios sin competencia. Juntos, el podio es el titular —mira hasta
 * dónde se puede llegar— y la tienda es la respuesta.
 */

export const metadata: Metadata = {
  title: `Puntos y tienda · ${EVENT.fullName}`,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PaginaTienda() {
  const [p, r] = await Promise.all([participanteActual(), ranking().catch(() => null)]);
  const yo = p ? vistaDe(p) : null;

  return (
    <Marco
      yo={yo}
      eyebrow="Tus puntos"
      titulo={
        <>
          El podio y la <span className="font-bold">tienda.</span>
        </>
      }
      bajada="Lo que juntaste hoy se cambia por algo que te llevas. El canje es en el stand de Habi."
    >
      <div className="mx-auto w-full max-w-5xl pb-20">
        {/* El podio primero: ver a quién hay que alcanzar es lo que hace que
            los puntos importen. La tienda, inmediatamente debajo, dice para
            qué sirven. */}
        <section id="podio" className="rounded-3xl border border-white/12 bg-white/[0.03] p-5 sm:p-7">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-soft">Los tres primeros</p>
            {r?.total ? <p className="text-xs font-light text-white/40">{r.total} jugando</p> : null}
          </div>
          <div className="mt-4">
            {r?.podio?.length ? (
              <Podio podio={r.podio} />
            ) : (
              <p className="text-base font-light text-white/50">
                Todavía nadie ha sumado puntos. Haz tu carnet y publícalo: ahí empieza.
              </p>
            )}
          </div>
        </section>

        <div className="mt-6">
          <Tienda yo={yo} />
        </div>
      </div>
    </Marco>
  );
}
