import type { Metadata } from "next";
import Entrar from "@/components/admin/Entrar";
import Puerta from "@/components/validacion/Puerta";
import { ALMUERZOS } from "@/config/agenda";
import { haySesion } from "@/lib/sesion";

/**
 * La puerta del evento.
 *
 * Vive fuera de `/admin` a propósito: quien la usa está de pie en la entrada
 * con un teléfono, no sentado frente al panel. Una dirección corta se dicta
 * por radio y se escribe con una mano.
 *
 * Comparte la clave del panel, que es la misma gente. Sin sesión se muestra
 * la puerta de entrada y nada más.
 */

export const metadata: Metadata = {
  title: "Puerta · Habi Next",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Validacion() {
  if (!(await haySesion())) return <Entrar />;

  const turnos = ALMUERZOS.map((t) => ({ id: t.id, rotulo: t.rotulo, desde: t.desde, hasta: t.hasta }));
  return (
    <main className="s-night min-h-dvh bg-night">
      <Puerta turnos={turnos} />
    </main>
  );
}
