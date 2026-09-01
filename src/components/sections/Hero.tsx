import Asterisk from "@/components/Asterisk";
import CTAButton from "@/components/CTAButton";
import { EVENT, LINKS } from "@/config/event";

/**
 * Hero con el lockup de la marca: "Habi" sobre una pastilla con "Next" y los
 * dos asteriscos, atravesada por la regla morada que sale del borde de la
 * pantalla. Es la diagramación del sistema Habi Next, con "Bogotá" como tercer
 * renglón y la regla saliendo ahora por la derecha.
 *
 * Los tamaños se limitan por vh además de por vw: en un portátil de 900px el
 * titular a 11vw empujaba el botón de compra por debajo del pliegue.
 */
const LOCKUP = "clamp(2.75rem, min(9.5vw, 12vh), 8.5rem)";
const CITY = "clamp(1.9rem, min(6.5vw, 8vh), 5.5rem)";

export default function Hero() {
  return (
    <section id="top" className="relative min-h-[100svh] w-full overflow-hidden bg-black">
      <div
        className="absolute inset-0 bg-cover bg-bottom bg-no-repeat opacity-90"
        style={{ backgroundImage: "url('/img/fondo.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/85" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />

      <div className="relative z-10 flex min-h-[100svh] flex-col justify-center px-5 pt-24 pb-14 sm:px-8 md:px-14 lg:px-20 xl:px-28">
        <div className="mx-auto w-full max-w-[1400px]">
          <p className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ba9dfa] sm:text-xs md:text-sm">
            <span>{EVENT.dateShort} · 2026</span>
            <span className="h-1 w-1 rounded-full bg-[#802ef6]" />
            <span>{EVENT.city}</span>
            <span className="hidden h-1 w-1 rounded-full bg-[#802ef6] sm:block" />
            <span className="hidden sm:block">{EVENT.durationLabel}</span>
          </p>

          <h1 className="font-bold leading-[0.82] tracking-tighter text-white">
            <span className="block" style={{ fontSize: LOCKUP }}>
              Habi
            </span>

            {/* Pastilla con la regla que sale por la izquierda */}
            <span className="relative mt-2 flex items-center md:-ml-14">
              <span className="absolute right-full left-[-100vw] h-[3px] bg-[#802ef6]" />
              <span className="z-10 flex shrink-0 items-center gap-4 rounded-full border-[3px] border-[#802ef6] px-6 py-2.5 sm:gap-7 sm:px-9 md:px-12 md:py-4">
                <span
                  className="font-semibold leading-none tracking-tighter"
                  style={{ fontSize: LOCKUP }}
                >
                  Next
                </span>
                <span className="flex shrink-0 items-center gap-2 sm:gap-4">
                  <Asterisk className="h-7 w-7 sm:h-11 sm:w-11 md:h-14 md:w-14" />
                  <Asterisk className="h-7 w-7 sm:h-11 sm:w-11 md:h-14 md:w-14" color="white" />
                </span>
              </span>
            </span>

            {/* La ciudad, con la regla saliendo por la derecha */}
            <span className="relative mt-2 flex items-center gap-6">
              <span
                className="font-light uppercase leading-[0.95] tracking-tight text-[#ba9dfa]"
                style={{ fontSize: CITY }}
              >
                Bogotá
              </span>
              <span className="relative hidden h-[3px] flex-1 bg-[#802ef6] sm:block">
                <span className="absolute left-full right-[-100vw] h-[3px] bg-[#802ef6]" />
              </span>
            </span>
          </h1>

          <div className="mt-8 flex max-w-3xl items-start gap-3 md:gap-5">
            <svg
              className="mt-1 h-5 w-5 shrink-0 text-[#802ef6] md:h-8 md:w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <p className="text-lg font-light leading-snug tracking-tight text-white sm:text-xl md:text-2xl">
              El agente inmobiliario del futuro{" "}
              <span className="font-semibold">no trabajará solo.</span> Aprende a usar Inteligencia
              Artificial para multiplicar tu capacidad de vender y ganar más.
            </p>
          </div>

          <p className="mt-5 max-w-2xl text-sm font-light leading-relaxed text-white/60 md:text-base">
            Un evento de un día para agentes inmobiliarios que quieren atraer más clientes, crear
            contenido, hacer publicidad, organizar sus oportunidades y construir un asistente de IA
            que trabaje para ellos las 24 horas.
          </p>

          <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <CTAButton href={LINKS.general}>Quiero mi entrada</CTAButton>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45 md:text-sm">
              Un día. Un nuevo sistema de trabajo.
              <br className="hidden sm:block" /> Un agente inmobiliario con IA.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
