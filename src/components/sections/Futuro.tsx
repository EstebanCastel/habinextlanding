import Asterisk from "@/components/Asterisk";
import Reveal from "@/components/Reveal";
import Seam from "@/components/Seam";
import Thread from "@/components/Thread";

/**
 * El punto donde el hilo se parte en dos: competir contra la IA o trabajar con
 * ella. Las dos columnas son las dos ramas, y de ahí salen las dos boletas.
 */
export default function Futuro() {
  return (
    <section className="s-paper relative w-full overflow-hidden">
      <Seam variant="diagonal" color="var(--ink)" />
      <Thread from={50} to={[30, 70]} />

      <div className="relative z-20 px-5 pt-28 pb-24 sm:px-8 md:px-14 md:pt-40 md:pb-32 lg:px-20">
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <p className="mb-9 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#802ef6] md:text-xs">
              <Asterisk className="h-4 w-4" />
              El futuro del agente inmobiliario ya empezó
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <p className="max-w-4xl text-2xl font-light leading-snug tracking-tight text-black/55 md:text-3xl">
              La pregunta no es si la Inteligencia Artificial va a transformar la industria
              inmobiliaria. <span className="font-semibold text-black">Ya lo está haciendo.</span>
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="mt-12 max-w-4xl text-4xl font-bold leading-[0.95] tracking-tighter sm:text-5xl md:text-6xl lg:text-[4.5rem]">
              La pregunta es qué vas a hacer tú.
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-6 md:mt-24 md:grid-cols-2 md:gap-10">
            <Reveal>
              {/* La rama que se apaga. */}
              <div className="flex h-full flex-col justify-between rounded-[28px] border-2 border-black/10 p-8 opacity-45 md:p-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-black/40">
                  Camino A
                </p>
                <p className="mt-6 text-3xl font-light leading-tight tracking-tight md:text-4xl">
                  Competir contra ella.
                </p>
                <p className="mt-5 text-base font-light leading-relaxed text-black/50 md:text-lg">
                  Seguir trabajando igual, con más horas y los mismos resultados, mientras el resto
                  de la industria acelera.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              {/* La rama que sigue. */}
              <div className="flex h-full flex-col justify-between rounded-[28px] bg-[#0a0410] p-8 text-white md:p-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#ba9dfa]">
                  Camino B
                </p>
                <p className="mt-6 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                  Aprender a trabajar <span className="text-[#802ef6]">con ella.</span>
                </p>
                <p className="mt-5 text-base font-light leading-relaxed text-white/65 md:text-lg">
                  Un día para transformar la manera en la que consigues clientes, trabajas y haces
                  negocios. Es el camino que se recorre en Habi Next.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
