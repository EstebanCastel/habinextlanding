import type { Metadata } from "next";
import Legal, { VERSION } from "@/components/experiencia/Legal";
import Marco from "@/components/experiencia/Marco";
import { EVENT } from "@/config/event";
import { participanteActual } from "@/lib/experiencia-http";
import { vistaDe } from "@/lib/experiencia";

export const metadata: Metadata = {
  title: `Términos de la experiencia · ${EVENT.fullName}`,
  description: "Qué datos trata la experiencia de Habi Next Colombia, qué pasa con tu foto y tus publicaciones, cómo funciona el ranking y cuáles son tus derechos.",
};
export const dynamic = "force-dynamic";

/** Se lee sin haber entrado: es lo que se acepta al entrar. */
export default async function PaginaTerminos() {
  const p = await participanteActual().catch(() => null);
  return (
    <Marco
      yo={p ? vistaDe(p) : null}
      eyebrow={`Versión del ${VERSION}`}
      titulo={
        <>
          Términos, privacidad y <span className="font-bold">uso de tu imagen.</span>
        </>
      }
      bajada="Lo que aceptas al entrar a la experiencia de Habi Next Colombia: qué datos tratamos, qué pasa con tu foto y tus publicaciones, cómo funciona el ranking y cómo ejercer tus derechos."
    >
      <Legal />
    </Marco>
  );
}
