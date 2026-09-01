import Asterisk from "@/components/Asterisk";
import Reveal from "@/components/Reveal";

const notes = [
  {
    title: "No necesitas ser experto en tecnología.",
    body: "Necesitas llegar con ganas de aprender, tu computador y tu celular.",
  },
  {
    title: "Conocer herramientas no es suficiente.",
    body: "En Habi Next aprenderás, paso a paso, cómo incorporarlas a tu negocio inmobiliario.",
  },
  {
    title: "La meta no es solo que aprendas sobre IA.",
    body: "La meta es que empieces a usarla, desde el mismo día del evento.",
  },
];

export default function Industria() {
  return (
    <section className="w-full bg-white px-5 py-24 text-black sm:px-8 md:px-14 md:py-32 lg:px-20">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <p className="mb-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#802ef6] md:text-xs">
            <Asterisk className="h-4 w-4" />
            La industria está cambiando
          </p>
        </Reveal>

        <div className="grid gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-24">
          <Reveal>
            <h2 className="text-4xl font-bold leading-[0.95] tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              La Inteligencia Artificial ya está transformando cómo{" "}
              <span className="text-[#802ef6]">buscamos clientes</span>, creamos contenido, hacemos
              seguimiento y{" "}
              <span className="underline decoration-[#802ef6] decoration-4 underline-offset-8">
                cerramos negocios
              </span>
              .
            </h2>
          </Reveal>

          <ul className="flex flex-col gap-10 lg:pt-4">
            {notes.map((note, i) => (
              <Reveal as="li" key={note.title} delay={i * 0.08}>
                <div className="flex gap-5 border-t border-black/10 pt-6">
                  <Asterisk
                    color={i % 2 === 0 ? "#802ef6" : "#ba9dfa"}
                    className="h-7 w-7 shrink-0 md:h-9 md:w-9"
                  />
                  <div>
                    <p className="text-xl font-semibold leading-tight tracking-tight md:text-2xl">
                      {note.title}
                    </p>
                    <p className="mt-2 text-base font-light leading-relaxed text-zinc-600 md:text-lg">
                      {note.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
