import Image from "next/image";
import Asterisk from "@/components/Asterisk";
import Reveal from "@/components/Reveal";

export default function Negocios() {
  return (
    <section className="relative w-full overflow-hidden bg-black">
      <div className="absolute inset-0">
        <Image
          src="/img/Fondo_4.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-70"
          style={{ objectPosition: "15% center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black" />
      </div>

      <div className="relative z-10 px-5 py-24 sm:px-8 md:px-14 md:py-36 lg:px-20">
        <div className="mx-auto flex max-w-[1400px] justify-end">
          <div className="w-full lg:w-[58%]">
            <Reveal>
              <p className="mb-7 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#ba9dfa] md:text-xs">
                <Asterisk className="h-4 w-4" />
                Networking
              </p>
            </Reveal>

            <Reveal delay={0.05}>
              <h2 className="text-4xl font-light leading-[0.92] tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
                También vienes a
                <br />
                <span className="font-bold">hacer negocios.</span>
              </h2>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-8 max-w-2xl text-lg font-light leading-relaxed text-white/70 md:text-xl">
                Habi Next reúne a cientos de agentes, brokers y líderes de la industria
                inmobiliaria. Será un espacio para aprender, pero también para conocer personas,
                encontrar proveedores, detectar oportunidades y construir nuevas relaciones.
              </p>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mt-10 max-w-xl border-l-[3px] border-[#802ef6] pl-6 text-xl font-semibold leading-snug tracking-tight text-white md:text-2xl">
                La tecnología puede acelerar los negocios. Pero los negocios siguen ocurriendo
                entre personas.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
