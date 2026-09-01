import Image from "next/image";
import Asterisk from "@/components/Asterisk";
import Reveal from "@/components/Reveal";
import Seam from "@/components/Seam";
import Thread from "@/components/Thread";

const notes = [
  {
    title: "No necesitas ser experto en tecnología.",
    body: "Necesitas llegar con ganas de aprender, tu computador y tu celular.",
  },
  {
    title: "Conocer herramientas no es suficiente.",
    body: "Aquí aprendes, paso a paso, cómo incorporarlas a tu negocio inmobiliario.",
  },
  {
    title: "La meta no es solo que aprendas sobre IA.",
    body: "Es que empieces a usarla, desde el mismo día del evento.",
  },
];

export default function Industria() {
  return (
    <section className="s-paper relative w-full overflow-hidden">
      <Seam variant="arch" color="var(--night)" />
      <Thread from={50} to={78} bias={0.78} opacity={0.4} />

      <div className="relative z-20 px-5 pt-28 pb-24 sm:px-8 md:px-14 md:pt-40 md:pb-32 lg:px-20">
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <p className="mb-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#802ef6] md:text-xs">
              <Asterisk className="h-4 w-4" />
              La industria está cambiando
            </p>
          </Reveal>

          <div className="grid items-start gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:gap-20">
            <Reveal>
              <h2 className="text-4xl font-bold leading-[0.94] tracking-tighter sm:text-5xl md:text-6xl lg:text-[4.5rem]">
                La Inteligencia Artificial ya está transformando cómo{" "}
                <span className="text-[#802ef6]">buscamos clientes</span>, creamos contenido,
                hacemos seguimiento y{" "}
                <span className="underline decoration-[#802ef6] decoration-[6px] underline-offset-[10px]">
                  cerramos negocios
                </span>
                .
              </h2>
            </Reveal>

            {/* La foto se sale del contenedor por la derecha: el hilo llega
                hasta ella y la sección deja de ser una caja centrada. */}
            <Reveal delay={0.12} className="relative">
              <div className="relative ml-auto aspect-[3/4] w-full max-w-[420px] overflow-hidden rounded-[28px] lg:mr-[-6vw] lg:max-w-none">
                <Image
                  src="/img/edificio-picado.webp"
                  alt="Edificio residencial con un aviso de Se Vende"
                  fill
                  sizes="(max-width: 1024px) 90vw, 34vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#802ef6]/45 via-transparent to-transparent" />
              </div>
              <p className="mt-5 max-w-xs text-sm font-light leading-relaxed text-black/55">
                El inventario no cambió. Cambió quién llega primero al cliente y con qué
                herramientas.
              </p>
            </Reveal>
          </div>

          <ul className="mt-20 grid gap-10 md:mt-24 md:grid-cols-3 md:gap-8">
            {notes.map((note, i) => (
              <Reveal as="li" key={note.title} delay={i * 0.08}>
                <div className="flex h-full flex-col gap-4 border-t-2 border-[var(--hair)] pt-6">
                  <Asterisk
                    color={i === 1 ? "#ba9dfa" : "#802ef6"}
                    className="h-7 w-7 md:h-9 md:w-9"
                  />
                  <p className="text-xl font-semibold leading-tight tracking-tight md:text-2xl">
                    {note.title}
                  </p>
                  <p className="text-base font-light leading-relaxed text-black/55 md:text-lg">
                    {note.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
