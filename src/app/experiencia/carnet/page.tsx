import type { Metadata } from "next";
import Marco from "@/components/experiencia/Marco";
import Sala from "@/components/experiencia/Sala";
import { EVENT } from "@/config/event";
import { puntosDeExperiencia } from "@/config/experiencia";
import { fase } from "@/lib/experiencia";
import { exigirSesion } from "@/lib/experiencia-sesion";
import { participanteActual } from "@/lib/experiencia-http";
import { vistaDe } from "@/lib/experiencia";
import { disponibilidad } from "@/lib/wallet";

export const metadata: Metadata = { title: `Tu carnet · ${EVENT.fullName}`, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";

export default async function PaginaCarnet({
  searchParams,
}: {
  searchParams: Promise<{ li?: string; abrir?: string; vista?: string; auto?: string }>;
}) {
  const q = await searchParams;
  // `vista=1` deja revisar el carnet y la credencial sin sesión, en desarrollo.
  const soloVista = q.vista === "1" && process.env.NODE_ENV !== "production";
  const yo = soloVista
    ? await participanteActual()
        .then((p) => (p ? vistaDe(p) : null))
        .catch(() => null)
    : await exigirSesion("/experiencia/carnet");
  return (
    <Marco
      yo={yo}
      eyebrow={`Experiencia 1 · ${puntosDeExperiencia("carnet")} puntos`}
      titulo={
        <>
          Tu <span className="font-bold">carnet.</span>
        </>
      }
    >
      <Sala
        modo="carnet"
        inicial={yo}
        fase={fase()}
        sitio={SITIO}
        li={q.li}
        abrir={q.abrir}
        auto={q.auto}
        billetera={disponibilidad()}
      />
    </Marco>
  );
}
