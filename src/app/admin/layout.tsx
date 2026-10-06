import type { Metadata } from "next";
import Dot from "@/components/Dot";
import Entrar from "@/components/admin/Entrar";
import Nav from "@/components/admin/Nav";
import { haySesion } from "@/lib/sesion";

/**
 * Panel de operación de la boletería. Antes era una sola página con todo;
 * ahora cada asunto tiene la suya y este marco pone lo común: la puerta, la
 * cabecera y las pestañas.
 *
 * Lo que no está acá es aprobar: eso se hace en Luma, que es donde está la
 * lista de invitados. El panel muestra a quién le toca y lleva directo.
 *
 * Está fuera de los buscadores y detrás de una clave. No se cachea nunca: una
 * versión vieja de esta página haría que alguien decida mirando datos de hace
 * cinco minutos.
 */

export const metadata: Metadata = {
  title: "Operación · Habi Next",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MarcoAdmin({ children }: { children: React.ReactNode }) {
  // Sin sesión se muestra la puerta y nada más. Cada página vuelve a
  // comprobarlo por su cuenta antes de leer datos.
  if (!(await haySesion())) return <Entrar />;

  return (
    <main className="s-night mx-auto min-h-dvh max-w-[92rem] px-5 py-10 md:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
            <Dot className="h-1.5 w-1.5" />
            Operación
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Boletería Habi Next</h1>
          <p className="mt-2 text-base font-light text-white/50">Martes 20 de octubre · Centro de Convenciones Av. 68</p>
        </div>
        <form method="post" action="/api/admin">
          <input type="hidden" name="accion" value="salir" />
          <button
            type="submit"
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-light text-white/60 transition-colors hover:border-white/30 hover:text-white"
          >
            Salir
          </button>
        </form>
      </header>
      <Nav />
      {children}
    </main>
  );
}
