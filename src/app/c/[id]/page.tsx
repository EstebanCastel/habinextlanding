import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import Asterisk from "@/components/Asterisk";
import Dot from "@/components/Dot";
import { EVENT, LINKS } from "@/config/event";
import { esId, nombreCompleto, porId, redDelRobot, registrarVistaPrevia } from "@/lib/experiencia";

/**
 * El carnet de una persona, en público: `/c/<id>`.
 *
 * Es la dirección que se comparte cuando alguien prefiere pegar un enlace en
 * vez de conectar LinkedIn. La vista previa que arman LinkedIn y WhatsApp es
 * el carnet mismo, y ese robot que viene a buscarla es la prueba de que se
 * compartió. Quien llega por acá ve el carnet y una puerta para armar el suyo
 * o comprar su entrada.
 */

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = esId(id) ? await porId(id) : null;
  if (!p?.carnet) return { title: EVENT.fullName, robots: { index: false, follow: false } };

  const quien = nombreCompleto(p) || "Alguien";
  const title = `${quien} va a ${EVENT.fullName}`;
  const description = `${EVENT.dateLong} · ${EVENT.city}. Un día completo de Inteligencia Artificial para el negocio inmobiliario. Arma tu carnet en habinext.com/experiencia.`;
  const imagen = `${SITIO}/api/experiencia/publico/${p.id}.jpg`;
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, type: "website", locale: "es_CO", url: `${SITIO}/c/${p.id}`, images: [{ url: imagen, width: 1080, height: 1350, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [imagen] },
  };
}

export default async function CarnetPublico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = esId(id) ? await porId(id) : null;
  if (!p?.carnet) notFound();

  const robot = redDelRobot((await headers()).get("user-agent"));
  if (robot) after(() => registrarVistaPrevia(p.id, robot).catch(() => null));

  const quien = nombreCompleto(p) || "Alguien";
  const crear = `/experiencia?utm_source=carnet&utm_medium=social&utm_campaign=habinext-carnet&utm_content=${p.id}`;

  return (
    <main className="s-night relative min-h-dvh overflow-hidden">
      <Asterisk color="var(--violet)" className="pointer-events-none absolute -left-24 top-1/3 h-[22rem] w-[22rem] opacity-[0.07] md:h-[30rem] md:w-[30rem]" />
      <div className="relative z-10 mx-auto grid max-w-5xl gap-12 px-5 py-14 sm:px-8 md:grid-cols-[minmax(0,26rem)_1fr] md:items-center md:py-24">
        <div className="mx-auto w-full max-w-[26rem] overflow-hidden rounded-[22px] border border-white/10 shadow-[0_40px_90px_-40px_rgba(128,46,246,0.6)]">
          <Image
            src={`/api/experiencia/publico/${p.id}.jpg`}
            alt={`Carnet de ${quien} para ${EVENT.fullName}`}
            width={1080}
            height={1350}
            unoptimized
            priority
            className="h-auto w-full"
          />
        </div>
        <div>
          <p className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
            <Dot className="h-1.5 w-1.5" />
            {EVENT.fullName}
          </p>
          <h1 className="text-[2.2rem] font-light leading-[1.05] tracking-tighter sm:text-5xl md:text-[3.5rem]">
            {quien} <span className="font-bold">va a Habi Next.</span>
          </h1>
          <p className="mt-6 text-lg font-light leading-relaxed text-white/65">
            {EVENT.dateLong}, {EVENT.city}. Un día completo para aprender a usar Inteligencia Artificial en el
            negocio inmobiliario. El agente inmobiliario del futuro no trabajará solo.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={crear}
              className="inline-flex items-center justify-center rounded-full bg-violet px-8 py-4 text-base font-semibold tracking-tight text-white shadow-[0_18px_44px_-14px_rgba(128,46,246,0.9)] transition-colors hover:bg-violet-press"
            >
              Arma tu carnet
            </Link>
            <a
              href={LINKS.general}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-base font-medium tracking-tight text-white transition-colors hover:border-white/45 hover:bg-white/5"
            >
              Quiero mi entrada
            </a>
          </div>
          <p className="mt-8 text-sm font-light text-white/40">
            <Link href="/" className="underline underline-offset-4 transition-colors hover:text-white">
              Conoce el evento
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
