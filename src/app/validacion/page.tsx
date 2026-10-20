import type { Metadata } from "next";
import Puerta from "@/components/validacion/Puerta";
import Respaldo from "@/components/validacion/Respaldo";
import { ALMUERZOS, SESIONES } from "@/config/agenda";

/**
 * Los tres controles del día del evento.
 *
 * Vive fuera de `/admin` y sin clave a propósito. El 20 hay gente del equipo
 * en la puerta, en el restaurante y en el Salón Taller, cada uno con su
 * teléfono, y repartir una contraseña por radio a las siete de la mañana es
 * como se pierde media hora. Lo que protege no es la clave sino el QR: sin
 * uno válido no se marca nada.
 *
 * Fuera de los buscadores igual: no es una página para que llegue nadie de
 * fuera, solo no está detrás de un muro.
 */

export const metadata: Metadata = {
  title: "Control · Habi Next",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Validacion({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  // La llave en el enlace enciende el botón de crear entradas. Quien abre
  // /validacion a secas ve los tres lectores y nada más.
  const { k } = await searchParams;
  const esperado = process.env.ADMIN_TOKEN ?? "";
  const llave = esperado && k === esperado ? esperado : undefined;
  const turnos = ALMUERZOS.map((t) => ({ id: t.id, rotulo: t.rotulo, desde: t.desde, hasta: t.hasta }));
  const talleres = SESIONES.filter((s) => s.salon === "taller" && !s.tipo).map((s) => ({
    id: s.id,
    titulo: s.titulo,
    desde: s.desde ?? "",
  }));
  return (
    <main className="s-night min-h-dvh bg-night">
      <Respaldo />
      <Puerta turnos={turnos} talleres={talleres} llave={llave} />
    </main>
  );
}
