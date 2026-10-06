import Image from "next/image";
import Link from "next/link";
import Dot from "@/components/Dot";
import Footer from "@/components/sections/Footer";
import { EVENT } from "@/config/event";
import type { Vista } from "@/lib/experiencia";
import Barra from "./Barra";
import BotonEntrar from "./BotonEntrar";

/**
 * El marco de las páginas de la experiencia: la barra fija con lo que viene
 * y los puntos, la cabecera con la marca, el regreso a las tres tarjetas y el
 * estado de la sesión, y el pie de la landing. Todo lo que está adentro es
 * lo que cambia entre experiencias.
 */
export default function Marco({
  yo,
  eyebrow,
  titulo,
  bajada,
  atras = true,
  children,
}: {
  yo: Vista | null;
  eyebrow: string;
  titulo: React.ReactNode;
  bajada?: React.ReactNode;
  atras?: boolean;
  children: React.ReactNode;
}) {
  // `overflow-clip` y no `hidden`: recorta igual el asterisco decorativo pero
  // no convierte el <main> en contenedor de scroll, que es lo que dejaba sin
  // efecto al selector de salón «sticky» de la agenda.
  return (
    <main className="s-night relative min-h-dvh overflow-clip">
      <Barra yo={yo} />
      <header className="relative z-20 mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-5 pt-5 sm:px-8 md:px-14 lg:px-20">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center py-1.5" aria-label={EVENT.fullName}>
            <Image src="/img/habi-next-logo.svg" alt={EVENT.fullName} width={780} height={260} priority className="h-8 w-auto md:h-11" />
          </Link>
          {atras ? (
            <Link href="/experiencia" className="hidden items-center gap-2 text-sm font-medium text-white/60 transition-colors hover:text-white sm:inline-flex">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Las tres experiencias
            </Link>
          ) : null}
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {yo ? (
            <>
              <span className="hidden rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/80 sm:inline-flex sm:items-center sm:gap-2">
                <span className="font-medium">{yo.nombre || yo.linkedin?.nombre || "Hola"}</span>
                <Dot className="h-1 w-1 text-white/40" />
                <span className="tabular-nums text-violet-soft">{yo.puntos} pts</span>
              </span>
              <form method="post" action="/api/experiencia/salir">
                <button type="submit" className="rounded-full px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:text-white">
                  Salir
                </button>
              </form>
            </>
          ) : (
            <BotonEntrar className="rounded-full bg-violet px-5 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-violet-press sm:text-sm md:px-7 md:text-base">
              Entrar
            </BotonEntrar>
          )}
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-[1400px] px-5 pb-10 pt-12 sm:px-8 md:px-14 md:pb-14 md:pt-16 lg:px-20">
        <p className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
          <Dot className="h-1.5 w-1.5" />
          {eyebrow}
        </p>
        <h1 className="max-w-4xl text-4xl font-light leading-[1.02] tracking-tighter sm:text-5xl md:text-6xl">{titulo}</h1>
        {bajada ? <p className="mt-6 max-w-2xl text-lg font-light leading-relaxed text-white/70 md:text-xl">{bajada}</p> : null}
      </section>

      <div className="relative z-10 mx-auto max-w-[1400px] px-5 pb-16 sm:px-8 md:px-14 md:pb-20 lg:px-20">{children}</div>

      <Footer />
    </main>
  );
}
