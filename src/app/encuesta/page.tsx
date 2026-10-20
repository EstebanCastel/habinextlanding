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
    <main className="relative min-h-[100svh] overflow-x-clip bg-night">
      <div className="enc-fondo" aria-hidden="true">
        <div className="enc-orbe" />
        <div className="enc-grano" />
      </div>

      <header className="relative z-[3] mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link href="/" className="flex items-center py-1.5" aria-label={EVENT.fullName}>
          <Image src="/img/habi-next-logo.svg" alt={EVENT.fullName} width={780} height={260} priority className="h-8 w-auto" />
        </Link>
        {yo ? <span className="text-sm font-bold text-white/60">{yo.nombre || "Hola"}</span> : null}
      </header>

      <section className="relative z-[3] mx-auto w-full max-w-xl px-5 pb-[max(3rem,env(safe-area-inset-bottom))] pt-9">
        <h1 className="text-[44px] font-light leading-[.96] tracking-[-0.04em] text-white sm:text-[60px]">
          ¿Cómo te <b className="font-extrabold">fue hoy?</b>
        </h1>
        <p className="mt-4 text-[17px] font-light leading-snug text-white/70">
          Noventa segundos. Siete preguntas. Con esto se decide qué se repite y qué se cambia el año entrante.
        </p>

        <div className="mt-9">
          {ya ? (
            <div className="py-6 text-center">
              <p className="text-6xl leading-none" aria-hidden="true">🙌</p>
              <h2 className="mt-5 text-[30px] font-extrabold tracking-[-0.03em] text-white">Ya la contestaste.</h2>
              <p className="mx-auto mt-3 max-w-[32ch] text-base font-light leading-relaxed text-white/60">
                Gracias. Si quieres cambiar algo de lo que escribiste, escríbele a Esteban por el WhatsApp del SAC.
              </p>
            </div>
          ) : (
            <Formulario campana={campana} />
          )}
        </div>

        {!yo && !ya ? (
          <p className="mt-7 text-center text-[14px] font-light leading-relaxed text-white/40">
            Puedes contestar así, sin dar tus datos.{" "}
            <Link href="/experiencia?entrar=%2Fencuesta" className="font-bold text-violet-soft underline underline-offset-4">
              O entra con tu correo y tu cédula
            </Link>{" "}
            para que quede a tu nombre.
          </p>
        ) : null}
      </section>
    </main>
  );
}
