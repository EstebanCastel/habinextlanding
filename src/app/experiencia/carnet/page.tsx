import type { Metadata } from "next";
import Marco from "@/components/experiencia/Marco";
import Sala from "@/components/experiencia/Sala";
import { EVENT } from "@/config/event";
import { puntosDeExperiencia } from "@/config/experiencia";
import { fase } from "@/lib/experiencia";
import { exigirSesion } from "@/lib/experiencia-sesion";

export const metadata: Metadata = { title: `Tu carnet · ${EVENT.fullName}`, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";

export default async function PaginaCarnet({ searchParams }: { searchParams: Promise<{ li?: string; abrir?: string }> }) {
  const q = await searchParams;
  const yo = await exigirSesion("/experiencia/carnet");
  return (
    <Marco
      yo={yo}
      eyebrow={`Experiencia 1 · ${puntosDeExperiencia("carnet")} puntos`}
      titulo={
        <>
          Tu <span className="font-bold">carnet.</span>
        </>
      }
      bajada="Sube tu foto, escribe tu nombre y llévatelo. Después, publícalo en LinkedIn en un clic: eso cierra la experiencia."
    >
      <Sala modo="carnet" inicial={yo} fase={fase()} sitio={SITIO} li={q.li} abrir={q.abrir} />
    </Marco>
  );
}
