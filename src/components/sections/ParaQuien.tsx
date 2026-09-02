import Asterisk from "@/components/Asterisk";
import Reveal from "@/components/Reveal";
import Thread from "@/components/Thread";

const perfiles = [
  {
    title: "Agentes inmobiliarios",
    body: "Los que ya venden y quieren vender más sin multiplicar las horas de trabajo.",
  },
  {
    title: "Agentes financieros",
    body: "Los que acompañan la compra con crédito y quieren cerrar más rápido.",
  },
  {
    title: "Brokers y líderes",
    body: "Los que dirigen equipos y necesitan un sistema que el equipo entero pueda usar.",
  },
];

/**
 * Aquí el hilo se abre en tres: es literalmente el momento en el que el evento
 * se reparte entre los tres perfiles a los que está dirigido.
 */
export default function ParaQuien() {
  return (
    <section className="s-lavender relative w-full overflow-hidden">
      {/* Última aparición del hilo en la página: entra en uno y se reparte
          en los tres perfiles. `endAt` lo cierra debajo de las tarjetas para
          que el recorrido termine dentro de la sección y no en el borde. */}
      <Thread from={50} to={[18, 50, 82]} endAt={0.86} opacity={0.22} />

      <div className="relative z-20 px-5 py-24 sm:px-8 md:px-14 md:py-32 lg:px-20">
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <p className="mb-8 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-violet md:text-xs">
              ¿Para quién es Habi Next?
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <h2 className="mx-auto max-w-6xl text-center text-3xl font-bold leading-[1.02] tracking-tighter sm:text-4xl md:text-5xl lg:text-[3.75rem]">
              Para quienes quieren <span className="text-violet">multiplicar
              <br />
              sus capacidades</span> y obtener mejores ventas
              <br />
              y utilidades.
            </h2>
          </Reveal>

          <ul className="mt-20 grid gap-8 md:mt-28 md:grid-cols-3 md:gap-6">
            {perfiles.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 0.09}>
                <div className="flex h-full flex-col items-center gap-4 rounded-[24px] border-2 border-black/10 bg-white/60 px-7 py-9 text-center backdrop-blur-sm">
                  <Asterisk
                    color={i === 1 ? "var(--violet-deep)" : "var(--violet)"}
                    className="h-8 w-8 md:h-10 md:w-10"
                  />
                  <p className="text-xl font-semibold tracking-tight md:text-2xl">{p.title}</p>
                  <p className="text-base font-light leading-relaxed text-black/55">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
