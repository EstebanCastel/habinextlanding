import type { Metadata } from "next";
import Marco from "@/components/experiencia/Marco";
import Sala from "@/components/experiencia/Sala";
import { EVENT } from "@/config/event";
import { PUNTOS_MAPA, RECINTO } from "@/config/experiencia";
import { fase as faseActual, vistaDe } from "@/lib/experiencia";
import { participanteActual } from "@/lib/experiencia-http";
import { exigirSesion } from "@/lib/experiencia-sesion";
import { haySesion } from "@/lib/sesion";

export const metadata: Metadata = { title: `El mapa del tesoro · ${EVENT.fullName}`, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";

export default async function PaginaMapa({ searchParams }: { searchParams: Promise<{ fase?: string; vista?: string }> }) {
  const q = await searchParams;
  // `vista=1` deja ver el plano sin sesión, en desarrollo, para revisarlo.
  const soloVista = q.vista === "1" && process.env.NODE_ENV !== "production";
  const yo = soloVista ? await participanteActual().then((p) => (p ? vistaDe(p) : null)).catch(() => null) : await exigirSesion("/experiencia/mapa");
  let fase = faseActual();
  if ((q.fase === "evento" || q.fase === "antes") && (await haySesion())) fase = q.fase;
  return (
    <Marco
      yo={yo}
      eyebrow={`Experiencia 2 · ${PUNTOS_MAPA} puntos · 20 de octubre`}
      titulo={
        <>
          El mapa <span className="font-bold">del tesoro.</span>
        </>
      }
      bajada={`Dos rutas por ${RECINTO.nombre}: los stands de los aliados y los dos escenarios. En cada parada, una foto; en cada ruta completa, un bono.`}
    >
      <Sala modo="mapa" inicial={yo} fase={fase} sitio={SITIO} />
    </Marco>
  );
}
