import type { Metadata } from "next";
import Marco from "@/components/experiencia/Marco";
import Sala from "@/components/experiencia/Sala";
import { EVENT } from "@/config/event";
import { puntosDeExperiencia } from "@/config/experiencia";
import { fase as faseActual } from "@/lib/experiencia";
import { exigirSesion } from "@/lib/experiencia-sesion";
import { haySesion } from "@/lib/sesion";

export const metadata: Metadata = { title: `Cuéntalo en tus redes · ${EVENT.fullName}`, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";

export default async function PaginaRedes({ searchParams }: { searchParams: Promise<{ li?: string; abrir?: string; fase?: string }> }) {
  const q = await searchParams;
  const yo = await exigirSesion("/experiencia/redes");
  let fase = faseActual();
  if ((q.fase === "evento" || q.fase === "antes") && (await haySesion())) fase = q.fase;
  return (
    <Marco
      yo={yo}
      eyebrow={`Experiencia 3 · ${puntosDeExperiencia("redes")} puntos`}
      titulo={
        <>
          Cuéntalo en <span className="font-bold">tus redes.</span>
        </>
      }
      bajada="Instagram, WhatsApp y, el día del evento, tus fotos en LinkedIn e Instagram. Publica desde aquí o sube la captura como prueba."
    >
      <Sala modo="redes" inicial={yo} fase={fase} sitio={SITIO} li={q.li} abrir={q.abrir} />
    </Marco>
  );
}
