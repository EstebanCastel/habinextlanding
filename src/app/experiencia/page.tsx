import type { Metadata } from "next";
import Asterisk from "@/components/Asterisk";
import Marco from "@/components/experiencia/Marco";
import Portada from "@/components/experiencia/Portada";
import { EVENT } from "@/config/event";
import { puestoDe, ranking, vistaDe } from "@/lib/experiencia";
import { participanteActual } from "@/lib/experiencia-http";

/**
 * `/experiencia`: la portada de las tres experiencias del asistente.
 *
 * Todo el mundo ve lo mismo: el puntaje, el podio y las tres tarjetas. Lo que
 * cambia con la sesión es que las tarjetas abren su experiencia en vez de la
 * ventana de entrada.
 */

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";

export const metadata: Metadata = {
  title: `Tu experiencia · ${EVENT.fullName}`,
  description: "Tu carnet, el mapa del tesoro del recinto y tus redes: tres experiencias que suman puntos en Habi Next Colombia.",
  alternates: { canonical: `${SITIO}/experiencia` },
  openGraph: {
    title: `Tu experiencia · ${EVENT.fullName}`,
    description: "Tres experiencias, un puntaje. Arma tu carnet, recorre el mapa del tesoro y cuéntalo en tus redes.",
    url: `${SITIO}/experiencia`,
    type: "website",
    locale: "es_CO",
  },
};

export const dynamic = "force-dynamic";

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ entrar?: string; error?: string; li?: string }>;
}) {
  const q = await searchParams;
  const [p, r] = await Promise.all([participanteActual().catch(() => null), ranking().catch(() => ({ podio: [], total: 0, filas: {} }))]);
  const yo = p ? vistaDe(p) : null;
  const puesto = p ? puestoDe(p.id, r.filas) : null;
  const entrar = q.entrar && /^\/experiencia(\/[a-z]+)?$/.test(q.entrar) ? q.entrar : undefined;

  return (
    <Marco
      yo={yo}
      atras={false}
      eyebrow={`${EVENT.fullName} · ${EVENT.dateShort}`}
      titulo={
        yo?.nombre ? (
          <>
            {yo.nombre}, esta es <span className="font-bold">tu experiencia.</span>
          </>
        ) : (
          <>
            Tu experiencia <span className="font-bold">Habi Next.</span>
          </>
        )
      }
      bajada={
        <>
          Tu carnet, el mapa del tesoro del recinto y lo que cuentes en tus redes. Todo suma puntos, y los que más sumen se
          llevan una sorpresa el 20 de octubre.
        </>
      }
    >
      <Asterisk color="var(--violet)" className="pointer-events-none absolute -right-28 -top-[30rem] h-[26rem] w-[26rem] opacity-[0.08] md:-right-20 md:h-[36rem] md:w-[36rem]" />
      <Portada yo={yo} podio={r.podio} puesto={puesto} entrar={entrar} error={q.error} />
    </Marco>
  );
}
