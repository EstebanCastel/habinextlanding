import Asterisk from "@/components/Asterisk";
import Reveal from "@/components/Reveal";

export default function Futuro() {
  return (
    <section className="w-full bg-white px-5 py-24 text-black sm:px-8 md:px-14 md:py-36 lg:px-20">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <p className="mb-10 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#802ef6] md:text-xs">
            <Asterisk className="h-4 w-4" />
            El futuro del agente inmobiliario ya empezó
          </p>
        </Reveal>

        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-24">
          <Reveal>
            <p className="text-2xl font-light leading-snug tracking-tight text-zinc-600 md:text-3xl">
              La pregunta no es si la Inteligencia Artificial va a transformar la industria
              inmobiliaria.{" "}
              <span className="font-semibold text-black">Ya lo está haciendo.</span>
            </p>
            <p className="mt-8 text-sm font-bold uppercase tracking-[0.3em] text-zinc-400">
              La pregunta es
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="text-4xl font-bold leading-[0.95] tracking-tighter sm:text-5xl md:text-6xl lg:text-[4.5rem]">
              ¿Vas a competir contra ella o vas a{" "}
              <span className="text-[#802ef6]">aprender a trabajar con ella?</span>
            </h2>
            <p className="mt-8 text-lg font-light leading-relaxed text-zinc-600 md:text-xl">
              Habi Next es un día para transformar la manera en la que consigues clientes,
              trabajas y haces negocios.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
