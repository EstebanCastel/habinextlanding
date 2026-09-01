import Asterisk from "@/components/Asterisk";
import CTAButton from "@/components/CTAButton";
import Reveal from "@/components/Reveal";
import { EVENT, LINKS } from "@/config/event";

export default function Cierre() {
  return (
    <section className="relative w-full overflow-hidden bg-black px-5 py-24 sm:px-8 md:px-14 md:py-36 lg:px-20">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-40 blur-[140px]"
        style={{ background: "#802ef6" }}
      />

      <div className="relative z-10 mx-auto flex max-w-[1400px] flex-col items-center text-center">
        <Reveal>
          <h2 className="max-w-5xl text-4xl font-bold leading-[0.95] tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Tu próximo gran negocio puede{" "}
            <span className="text-[#802ef6]">empezar aquí.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.08}>
          <p className="mt-8 max-w-2xl text-lg font-light leading-relaxed text-white/65 md:text-xl">
            Un día puede cambiar la forma en la que trabajas los próximos años. Conviértete en un
            Agente Inmobiliario con IA.
          </p>
        </Reveal>

        <Reveal delay={0.14}>
          <div className="mt-14 flex items-center justify-center gap-4">
            <Asterisk className="h-8 w-8 md:h-11 md:w-11" />
            <span className="text-3xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl">
              Habi Next
            </span>
            <Asterisk color="#ffffff" className="h-8 w-8 md:h-11 md:w-11" />
          </div>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#ba9dfa] md:text-base">
            {EVENT.city} · {EVENT.dateShort} de 2026
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
            <CTAButton href={LINKS.general}>Quiero mi entrada</CTAButton>
            <CTAButton href={LINKS.sponsors} variant="outline">
              Quiero ser patrocinador
            </CTAButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
