import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Alta from "@/components/validacion/Alta";

/**
 * Crear una entrada en la puerta, sin deploy y sin esperar a nadie.
 *
 * Es la única pantalla de `/validacion` con llave, y es por lo que hace: leer
 * un QR no crea nada, pero esto emite una entrada de verdad y ocupa una silla.
 * La llave va en el enlace para que siga siendo un marcador que se abre y ya,
 * sin una contraseña que repartir por radio.
 *
 * El enlace es `/validacion/alta?k=<ADMIN_TOKEN>`.
 */

export const metadata: Metadata = {
  title: "Crear entrada · Habi Next",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CrearEntrada({
  searchParams,
}: {
  searchParams: Promise<{ k?: string; por?: string }>;
}) {
  const { k, por } = await searchParams;
  const esperado = process.env.ADMIN_TOKEN ?? "";
  // Sin llave no existe: un 404 no le dice a nadie que acá hay algo.
  if (!esperado || k !== esperado) notFound();

  return (
    <main className="s-night min-h-dvh bg-night px-5 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-soft">Puerta</p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-white">Crear una entrada</h1>
          </div>
          <Link href="/validacion" className="shrink-0 text-sm font-medium text-white/50 transition-colors hover:text-white">
            Volver
          </Link>
        </div>

        <p className="mt-3 text-base font-light leading-relaxed text-white/55">
          Queda aprobada en Luma al instante y entra al padrón de la puerta de una vez. Si esa
          persona ya tenía entrada, no se le crea otra: te devuelve la suya.
        </p>

        <div className="mt-6">
          <Alta llave={esperado} por={(por ?? "").slice(0, 40) || "puerta"} />
        </div>
      </div>
    </main>
  );
}
