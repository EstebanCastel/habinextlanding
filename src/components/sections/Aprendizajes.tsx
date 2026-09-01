import Asterisk from "@/components/Asterisk";
import Reveal from "@/components/Reveal";

const pillars = [
  {
    n: "01",
    kicker: "Crea",
    title: "Crea contenido con Inteligencia Artificial",
    body: "Aprende a utilizar IA para construir tu marca personal y producir contenido que atraiga clientes. Crearás ideas, textos, guiones, imágenes y piezas para redes sociales en una fracción del tiempo que te toma hoy.",
    from: "De pensar qué publicar",
    to: "a tener una máquina de contenido",
  },
  {
    n: "02",
    kicker: "Atrae",
    title: "Aprende a atraer clientes que sí convierten",
    body: "Deja de depender únicamente de referidos. Aprende a crear campañas digitales para encontrar personas interesadas en comprar o vender vivienda, y cómo utilizar IA para mejorar tus anuncios.",
    from: "De esperar clientes",
    to: "a generar tus propias oportunidades",
  },
  {
    n: "03",
    kicker: "Organiza",
    title: "Construye tu ecosistema digital de ventas",
    body: "Un buen agente no puede depender de su memoria, un Excel y cientos de conversaciones perdidas en WhatsApp. Aprende a construir un sistema para organizar tus clientes, oportunidades, propiedades y seguimientos.",
    from: "De tener contactos",
    to: "a tener un sistema comercial",
  },
  {
    n: "04",
    kicker: "Automatiza",
    title: "Crea un asistente de IA que trabaje por ti 24/7",
    body: "Imagina un asistente que responda preguntas, organice información y prepare seguimientos mientras tú estás mostrando propiedades o cerrando negocios. En Habi Next aprenderás cómo empezar a construirlo.",
    from: "De hacerlo todo tú",
    to: "a trabajar acompañado por IA",
  },
];

export default function Aprendizajes() {
  return (
    <section id="aprendizajes" className="w-full bg-black px-5 py-24 sm:px-8 md:px-14 md:py-32 lg:px-20">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <p className="mb-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#ba9dfa] md:text-xs">
            <Asterisk className="h-4 w-4" />
            En un solo día
          </p>
        </Reveal>

        <Reveal>
          <h2 className="max-w-5xl text-4xl font-bold leading-[0.95] tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Construye tu propio{" "}
            <span className="text-[#802ef6]">sistema de ventas con IA</span>
          </h2>
        </Reveal>

        <div className="mt-16 flex flex-col md:mt-24">
          {pillars.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.05}>
              <article className="grid gap-6 border-t border-white/15 py-10 md:grid-cols-[auto_1fr] md:gap-14 md:py-14 lg:gap-24">
                <div className="flex items-baseline gap-4 md:w-[260px] md:flex-col md:items-start md:gap-2">
                  <span className="text-5xl font-bold leading-none tracking-tighter text-[#802ef6] md:text-7xl lg:text-8xl">
                    {p.n}
                  </span>
                  <span className="text-xl font-semibold uppercase tracking-[0.22em] text-white md:text-2xl">
                    {p.kicker}
                  </span>
                </div>

                <div className="max-w-3xl">
                  <h3 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
                    {p.title}
                  </h3>
                  <p className="mt-4 text-base font-light leading-relaxed text-white/60 md:text-lg">
                    {p.body}
                  </p>

                  <p className="mt-7 inline-flex flex-wrap items-center gap-3 rounded-full border-2 border-[#802ef6]/60 px-5 py-3 text-sm font-medium text-white/70 md:text-base">
                    <span>{p.from}</span>
                    <svg
                      className="h-4 w-4 shrink-0 text-[#802ef6] md:h-5 md:w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span className="font-semibold text-white">{p.to}</span>
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
          <div className="border-t border-white/15" />
        </div>
      </div>
    </section>
  );
}
