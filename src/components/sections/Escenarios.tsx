import Asterisk from "@/components/Asterisk";
import Reveal from "@/components/Reveal";

const escenarios = [
  {
    name: "Escenario Inspira",
    body: "Conferencias de gran formato con speakers de alto impacto: casos de éxito reales, cómo los vivieron y qué herramientas usaron para escalar con IA.",
    accent: "#802ef6",
  },
  {
    name: "Escenario Taller",
    body: "Aprender haciendo. Múltiples sesiones con expertos que abordan temáticas clave para que sepas cómo aplicarlas en tu rol.",
    accent: "#ba9dfa",
  },
  {
    name: "Espacio VIP",
    body: "Un espacio para conectar con los agentes inmobiliarios de más alto desempeño, aquellos que están logrando resultados increíbles.",
    accent: "#802ef6",
  },
  {
    name: "Zona Partners",
    body: "Los aliados que necesita cualquier agente inmobiliario o financiero para escalar dentro de la industria, en un solo lugar.",
    accent: "#ba9dfa",
  },
];

export default function Escenarios() {
  return (
    <section id="escenarios" className="w-full bg-black px-5 py-24 sm:px-8 md:px-14 md:py-32 lg:px-20">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <h2 className="max-w-4xl text-4xl font-light leading-[0.95] tracking-tighter text-white sm:text-5xl md:text-6xl">
            Cuatro espacios para decidir tu{" "}
            <span className="font-bold text-[#802ef6]">mejor ruta de crecimiento</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-white/12 md:mt-20 md:grid-cols-2">
          {escenarios.map((e, i) => (
            <Reveal key={e.name} delay={i * 0.06}>
              <article className="group h-full bg-black p-8 transition-colors duration-500 hover:bg-[#0d0616] md:p-12">
                <Asterisk color={e.accent} className="h-9 w-9 md:h-12 md:w-12" />
                <h3 className="mt-7 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  {e.name}
                </h3>
                <p className="mt-4 text-base font-light leading-relaxed text-white/60 md:text-lg">
                  {e.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
