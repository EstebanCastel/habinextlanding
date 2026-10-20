import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Formulario from "@/components/encuesta/Formulario";
import { EVENT } from "@/config/event";
import { guardada } from "@/lib/encuesta";
import { vistaDe } from "@/lib/experiencia";
import { participanteActual } from "@/lib/experiencia-http";

/**
 * La encuesta por fuera de la app.
 *
 * Es la misma de adentro, para quien nunca entró a la experiencia o ya cerró
 * el celular. Contesta sin identificarse, a propósito: pedirle el correo y la
 * cédula a alguien que va en el carro de vuelta es perder la respuesta. Quien
 * quiera que quede a su nombre tiene el enlace para entrar, y entonces se
 * cruza con todo lo que hizo en el día.
 */

export const metadata: Metadata = {
  title: `Encuesta · ${EVENT.fullName}`,
  description: "Noventa segundos para decirnos cómo te fue en Habi Next Colombia.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function Encuesta({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const q = await searchParams;
  const campana = typeof q.c === "string" ? q.c.slice(0, 40) : undefined;
  const p = await participanteActual();
  const yo = p ? vistaDe(p) : null;
  const ya = p ? await guardada(p.id).catch(() => null) : null;

  return (
    <main className="s-night relative min-h-dvh overflow-clip">
      <header className="relative z-20 mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-5 pt-6">
        <Link href="/" className="flex items-center py-1.5" aria-label={EVENT.fullName}>
          <Image src="/img/habi-next-logo.svg" alt={EVENT.fullName} width={780} height={260} priority className="h-8 w-auto" />
        </Link>
        {yo ? (
          <span className="text-sm font-medium text-white/60">{yo.nombre || "Hola"}</span>
        ) : null}
      </header>

      <section className="relative z-10 mx-auto w-full max-w-xl px-5 pb-20 pt-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">Habi Next Colombia</p>
        <h1 className="mt-4 text-3xl font-light leading-[1.05] tracking-tighter sm:text-4xl">
          ¿Cómo te fue hoy?
        </h1>
        <p className="mt-4 text-base font-light leading-relaxed text-white/60">
          Noventa segundos. Siete preguntas. Con esto se decide qué se repite y qué se cambia el año entrante.
        </p>

        <div className="mt-8 rounded-3xl border border-white/12 bg-white/[0.03] p-6 sm:p-8">
          {ya ? (
            <div className="py-4 text-center">
              <p className="text-5xl" aria-hidden="true">✦</p>
              <h2 className="mt-5 text-2xl font-light tracking-tight text-white">Ya la contestaste.</h2>
              <p className="mx-auto mt-3 max-w-sm text-base font-light leading-relaxed text-white/55">
                Gracias. Si quieres cambiar algo de lo que escribiste, escríbele a Esteban por el WhatsApp del SAC.
              </p>
            </div>
          ) : (
            <Formulario campana={campana} />
          )}
        </div>

        {!yo && !ya ? (
          <p className="mt-5 text-center text-sm font-light leading-relaxed text-white/40">
            Puedes contestar así, sin dar tus datos.{" "}
            <Link href="/experiencia?entrar=%2Fencuesta" className="font-medium text-violet-soft underline underline-offset-4">
              O entra con tu correo y tu cédula
            </Link>{" "}
            para que quede a tu nombre.
          </p>
        ) : null}
      </section>
    </main>
  );
}
