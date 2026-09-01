import Asterisk from "@/components/Asterisk";
import CTAButton from "@/components/CTAButton";
import Reveal from "@/components/Reveal";
import { TICKETS, activeStageIndex, type Ticket } from "@/config/event";

const datosLuma = [
  "Nombre y apellidos",
  "Correo electrónico",
  "Teléfono",
  "Tipo de broker: inmobiliario, financiero o ambos",
  "Aceptación de términos y tratamiento de datos Habi",
];

function TicketCard({ ticket, now }: { ticket: Ticket; now: Date }) {
  const activeIdx = activeStageIndex(ticket.stages, now);
  const active = ticket.stages[activeIdx];
  const featured = ticket.featured;

  return (
    <article
      className={`flex h-full flex-col rounded-[28px] p-8 md:p-10 ${
        featured
          ? "border-[3px] border-[#802ef6] bg-gradient-to-b from-[#150a26] to-black"
          : "border border-white/15 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
          {ticket.name}
        </h3>
        {featured ? (
          <span className="rounded-full bg-[#802ef6] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            250 cupos
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-base font-light text-white/60 md:text-lg">{ticket.claim}</p>

      <div className="mt-8 border-t border-white/15 pt-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#ba9dfa]">
          {active.label} · {active.note}
        </p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-5xl font-bold tracking-tighter text-white md:text-6xl">
            {active.price}
          </span>
          <span className="text-base font-medium text-white/50">COP</span>
        </p>

        <ul className="mt-6 flex flex-col gap-2">
          {ticket.stages.map((stage, i) => (
            <li
              key={stage.id}
              className={`flex items-center justify-between gap-4 text-sm md:text-base ${
                i === activeIdx ? "text-white" : "text-white/35"
              }`}
            >
              <span className={i < activeIdx ? "line-through" : ""}>
                {stage.label} · {stage.note}
              </span>
              <span className={`font-semibold ${i < activeIdx ? "line-through" : ""}`}>
                {stage.price}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex-1 border-t border-white/15 pt-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/45">
          {ticket.includesTitle}
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {ticket.includes.map((item) => (
            <li key={item} className="flex items-start gap-3 text-base text-white/80 md:text-lg">
              <Asterisk
                color={featured ? "#802ef6" : "#ba9dfa"}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span className="font-light">{item}</span>
            </li>
          ))}
        </ul>
        {ticket.footnote ? (
          <p className="mt-6 text-sm font-light italic leading-relaxed text-white/45">
            {ticket.footnote}
          </p>
        ) : null}
      </div>

      <CTAButton
        href={ticket.href}
        variant={featured ? "solid" : "outline"}
        className="mt-9 w-full"
      >
        {ticket.cta}
      </CTAButton>
    </article>
  );
}

export default function Boleteria() {
  const now = new Date();

  return (
    <section id="boleteria" className="w-full bg-black px-5 py-24 sm:px-8 md:px-14 md:py-32 lg:px-20">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <p className="mb-7 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#ba9dfa] md:text-xs">
            <Asterisk className="h-4 w-4" />
            Boletería
          </p>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 className="max-w-4xl text-4xl font-light leading-[0.95] tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Elige cómo vivir <span className="font-bold">Habi Next</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:mt-20 lg:grid-cols-2 lg:gap-8">
          {TICKETS.map((ticket, i) => (
            <Reveal key={ticket.id} delay={i * 0.08} className="h-full">
              <TicketCard ticket={ticket} now={now} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-12 grid gap-8 rounded-[28px] border border-white/12 p-8 md:mt-16 md:grid-cols-[1.2fr_1fr] md:gap-14 md:p-12">
            <div>
              <p className="text-2xl font-semibold leading-snug tracking-tight text-white md:text-3xl">
                Compra anticipadamente y asegura el mejor precio.
              </p>
              <p className="mt-4 text-base font-light leading-relaxed text-white/55 md:text-lg">
                Los precios aumentan a medida que se agotan las etapas de boletería. La compra se
                realiza a través de Luma y la confirmación llega a tu correo.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/45">
                Ten a la mano
              </p>
              <ul className="mt-5 flex flex-col gap-2.5">
                {datosLuma.map((dato) => (
                  <li key={dato} className="flex items-start gap-3 text-sm text-white/70 md:text-base">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#802ef6]" />
                    <span className="font-light">{dato}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
