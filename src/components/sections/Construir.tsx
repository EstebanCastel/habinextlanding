import Asterisk from "@/components/Asterisk";
import Reveal from "@/components/Reveal";
import Seam from "@/components/Seam";
import Thread from "@/components/Thread";

const contrasts = [
  {
    no: "No es una charla de horas sobre Inteligencia Artificial.",
    si: "Es una experiencia práctica, con tu computador abierto.",
  },
  {
    no: "No recorres una agenda de temas sueltos.",
    si: "Recorres las etapas del negocio de un agente inmobiliario.",
  },
  {
    no: "No sales con una lista de herramientas por probar.",
    si: "Sales con tu propio sistema empezado.",
  },
];

export default function Construir() {
  return (
    <section id="experiencia" className="s-violet relative w-full overflow-hidden">
      <Seam variant="steps" color="var(--ink)" />
      <Thread from={22} to={50} opacity={0.55} />

      <div className="relative z-20 px-5 pt-28 pb-24 sm:px-8 md:px-14 md:pt-40 md:pb-32 lg:px-20">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-24">
            <Reveal>
              <h2 className="text-4xl font-light leading-[0.9] tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                No vienes solo
                <br />
                a escuchar.
                <br />
                <span className="font-bold">Vienes a construir.</span>
              </h2>
              <div className="mt-9 flex items-center gap-3">
                <Asterisk color="#ffffff" className="h-9 w-9 md:h-12 md:w-12" />
                <Asterisk color="#3d1080" className="h-9 w-9 md:h-12 md:w-12" />
                <Asterisk color="#ffffff" className="h-9 w-9 md:h-12 md:w-12" />
              </div>
              <p className="mt-9 max-w-md text-lg font-light leading-relaxed text-white/80 md:text-xl">
                Queremos que llegues como agente inmobiliario y salgas entendiendo cómo convertirte
                en un Agente Inmobiliario con IA.
              </p>
            </Reveal>

            {/* Cada fila tacha lo que el evento no es y deja debajo lo que sí. */}
            <ul className="flex flex-col gap-9 lg:pt-6">
              {contrasts.map((c, i) => (
                <Reveal as="li" key={c.si} delay={i * 0.08}>
                  <div className="border-t border-white/30 pt-6">
                    <p className="text-base font-light leading-snug text-white/55 line-through decoration-white/40 md:text-lg">
                      {c.no}
                    </p>
                    <p className="mt-3 text-xl font-semibold leading-snug tracking-tight md:text-2xl">
                      {c.si}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
