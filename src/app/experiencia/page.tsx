import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Asterisk from "@/components/Asterisk";
import Dot from "@/components/Dot";
import Experiencia from "@/components/experiencia/Experiencia";
import Footer from "@/components/sections/Footer";
import { EVENT, LINKS } from "@/config/event";
import { MISIONES } from "@/config/experiencia";
import { fase as faseActual, vistaDe } from "@/lib/experiencia";
import { participanteActual } from "@/lib/experiencia-http";
import { haySesion } from "@/lib/sesion";

/**
 * `/experiencia`: el carnet del asistente y las misiones para contar Habi
 * Next en sus redes.
 *
 * Es la pieza del evento que vive en el celular de cada persona: primero le
 * da algo suyo —su carnet— y después le pone fácil compartirlo. Lo que sale
 * de acá es lo que Habi quiere que pase en redes: gente real, con su cara y
 * su nombre, diciendo que va y contando cómo fue.
 */

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";

export const metadata: Metadata = {
  title: `Tu carnet · ${EVENT.fullName}`,
  description:
    "Arma tu carnet oficial de Habi Next Colombia con tu foto y tu nombre, y completa las misiones para contarlo en tus redes.",
  alternates: { canonical: `${SITIO}/experiencia` },
  openGraph: {
    title: `Tu carnet · ${EVENT.fullName}`,
    description: "Tu foto, tu nombre y el sello de Habi Next. Ármalo en un minuto.",
    url: `${SITIO}/experiencia`,
    type: "website",
    locale: "es_CO",
  },
};

export const dynamic = "force-dynamic";

function Encabezado() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-5 pt-6 sm:px-8 md:px-14 lg:px-20">
      <Link href="/" className="flex items-center py-1.5" aria-label={EVENT.fullName}>
        <Image src="/img/habi-next-logo.svg" alt={EVENT.fullName} width={780} height={260} priority className="h-8 w-auto md:h-11" />
      </Link>
      <div className="flex items-center gap-2 md:gap-3">
        <Link href="/" className="hidden rounded-full px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:text-white sm:inline-block">
          Volver al evento
        </Link>
        <a
          href={LINKS.general}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-violet px-5 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-violet-press sm:text-sm md:px-7 md:text-base"
        >
          Quiero mi entrada
        </a>
      </div>
    </header>
  );
}

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ li?: string; fase?: string }>;
}) {
  const q = await searchParams;
  const p = await participanteActual().catch(() => null);
  const yo = p ? vistaDe(p) : null;

  // La fase se puede forzar desde el panel para revisar las misiones del
  // día del evento antes de que llegue.
  let fase = faseActual();
  if ((q.fase === "evento" || q.fase === "antes") && (await haySesion())) fase = q.fase;

  const antes = MISIONES.filter((m) => m.fase === "antes").length;
  const evento = MISIONES.length - antes;

  return (
    <main className="s-night relative min-h-dvh overflow-hidden">
      <Asterisk
        color="var(--violet)"
        className="pointer-events-none absolute -right-28 -top-28 h-[26rem] w-[26rem] opacity-[0.08] md:-right-20 md:h-[36rem] md:w-[36rem]"
      />
      <Encabezado />

      <section className="relative z-10 mx-auto max-w-[1400px] px-5 pb-14 pt-16 sm:px-8 md:px-14 md:pb-20 md:pt-24 lg:px-20">
        <p className="mb-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
          <Dot className="h-1.5 w-1.5" />
          {EVENT.fullName} · {EVENT.dateShort}
        </p>
        <h1 className="max-w-4xl text-4xl font-light leading-[1.02] tracking-tighter sm:text-5xl md:text-6xl lg:text-[4.5rem]">
          {yo?.nombre ? (
            <>
              {yo.nombre}, este es <span className="font-bold">tu carnet.</span>
            </>
          ) : (
            <>
              Tu carnet de <span className="font-bold">Habi Next.</span>
            </>
          )}
        </h1>
        <p className="mt-7 max-w-2xl text-lg font-light leading-relaxed text-white/70 md:text-xl">
          Sube tu foto, escribe tu nombre y llévatelo en un minuto. Después, {antes} misiones para contar que
          vas y {evento} más el día del evento. Cada una suma puntos.
        </p>
        {yo?.registro ? (
          <p className="mt-6 inline-flex items-center gap-3 rounded-full border border-violet/40 bg-violet/10 px-5 py-2.5 text-sm font-medium">
            <Dot color="var(--violet-soft)" className="h-1.5 w-1.5" />
            Tu entrada {yo.registro.tier === "vip" ? "VIP" : "General"}{" "}
            {yo.registro.etapa === "aprobado" ? "ya está confirmada." : "está en proceso: revisa tu WhatsApp."}
          </p>
        ) : null}
      </section>

      <Experiencia inicial={yo} fase={fase} sitio={SITIO} li={q.li} />

      <Footer />
    </main>
  );
}
