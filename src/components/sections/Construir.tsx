import Asterisk from "@/components/Asterisk";
import Reveal from "@/components/Reveal";

export default function Construir() {
  return (
    <section id="experiencia" className="relative w-full overflow-hidden bg-[#802ef6]">
      <div className="habi-tape h-4 w-full md:h-6" />

      <div className="px-5 py-24 sm:px-8 md:px-14 md:py-32 lg:px-20">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-24">
            <Reveal>
              <h2 className="text-4xl font-light leading-[0.9] tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
                No vienes solo
                <br />
                a escuchar.
                <br />
                <span className="font-bold">Vienes a construir.</span>
              </h2>
              <div className="mt-8 flex items-center gap-3">
                <Asterisk color="#ffffff" className="h-8 w-8 md:h-11 md:w-11" />
                <Asterisk color="#4b1a8b" className="h-8 w-8 md:h-11 md:w-11" />
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="flex flex-col gap-7 lg:pt-4">
                <p className="text-lg font-light leading-relaxed text-white/85 md:text-xl">
                  Habi Next no está pensado como un evento para sentarte durante horas a escuchar
                  personas hablando de Inteligencia Artificial. Es una experiencia práctica.
                </p>
                <p className="text-lg font-light leading-relaxed text-white/85 md:text-xl">
                  Durante el día recorrerás las diferentes etapas del negocio de un agente
                  inmobiliario y aprenderás cómo aplicar tecnología e IA en cada una.
                </p>
                <p className="border-t border-white/25 pt-7 text-xl font-semibold leading-snug tracking-tight text-white md:text-2xl">
                  Queremos que llegues como agente inmobiliario y salgas entendiendo cómo
                  convertirte en un Agente Inmobiliario con IA.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      <div className="habi-tape h-4 w-full md:h-6" />
    </section>
  );
}
