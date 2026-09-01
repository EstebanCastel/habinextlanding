import Asterisk from "@/components/Asterisk";
import Reveal from "@/components/Reveal";

const perfiles = ["Agentes inmobiliarios", "Agentes financieros", "Brokers y líderes de equipo"];

export default function ParaQuien() {
  return (
    <section className="w-full bg-white px-5 py-24 text-black sm:px-8 md:px-14 md:py-28 lg:px-20">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center text-center">
        <Reveal>
          <p className="mb-8 text-[11px] font-bold uppercase tracking-[0.3em] text-[#802ef6] md:text-xs">
            ¿Para quién es Habi Next?
          </p>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 className="max-w-5xl text-3xl font-bold leading-[1.02] tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
            Para agentes inmobiliarios y financieros que quieren{" "}
            <span className="text-[#802ef6]">multiplicar sus capacidades</span> para obtener mejores
            ventas y utilidades.
          </h2>
        </Reveal>

        <Reveal delay={0.12}>
          <ul className="mt-12 flex flex-wrap items-center justify-center gap-3 md:gap-4">
            {perfiles.map((p) => (
              <li
                key={p}
                className="flex items-center gap-3 rounded-full border-2 border-black/12 px-5 py-3 text-sm font-semibold tracking-tight md:px-7 md:py-4 md:text-base"
              >
                <Asterisk className="h-4 w-4 shrink-0 md:h-5 md:w-5" />
                {p}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
