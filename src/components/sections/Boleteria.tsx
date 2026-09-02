import Dot from "@/components/Dot";
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
          ? "border-[3px] border-violet bg-gradient-to-b from-violet-shade to-night"
          : "border border-white/15 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
          {ticket.name}
        </h3>
        {featured ? (
          <span className="rounded-full bg-violet px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            250 cupos
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-base font-light text-white/60 md:text-lg">{ticket.claim}</p>

      <div className="mt-8 border-t border-white/15 pt-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">
          {active.label} · {active.note}
        </p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-5xl font-bold tracking-tighter text-white md:text-6xl">
            {active.price}
          </span>
          <span className="text-base font-medium text-white/50">COP</span>
        </p>

        {/* La escalera solo muestra lo que viene: la etapa vigente ya está
            arriba en grande y repetirla tres renglones más abajo no aporta. */}
        {activeIdx < ticket.stages.length - 1 ? (
          <>
            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.28em] text-white/60">
              Después
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {ticket.stages.slice(activeIdx + 1).map((stage) => (
                <li
                  key={stage.id}
                  className="flex items-center justify-between gap-4 text-sm text-white/70 md:text-base"
                >
                  <span>{stage.note}</span>
                  <span className="font-semibold">{stage.price}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <div className="mt-8 flex-1 border-t border-white/15 pt-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/60">
          {ticket.includesTitle}
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {ticket.includes.map((item) => (
            <li key={item} className="flex items-start gap-3 text-base text-white/80 md:text-lg">
              <Dot
                color={featured ? "var(--violet)" : "var(--violet-soft)"}
                className="mt-2.5 h-1.5 w-1.5"
              />
              <span className="font-light">{item}</span>
            </li>
          ))}
        </ul>
        {ticket.footnote ? (
          <p className="mt-6 text-sm font-light italic leading-relaxed text-white/60">
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
    <section id="boleteria" className="s-night relative w-full overflow-hidden">

      <div className="relative z-20 mx-auto max-w-[1400px] px-5 py-24 sm:px-8 md:px-14 md:py-32 lg:px-20">
        <Reveal>
          <p className="mb-7 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft md:text-xs">
            <Dot className="h-1.5 w-1.5" />
            Boletería
          </p>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 className="max-w-4xl text-3xl font-light leading-[0.98] tracking-tighter text-white sm:text-4xl md:text-5xl lg:text-[3.75rem]">
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
                Compra anticipadamente
                <br />
                y asegura el mejor precio.
              </p>
              <p className="mt-4 text-base font-light leading-relaxed text-white/55 md:text-lg">
                Los precios aumentan a medida que se agotan las etapas de boletería. La compra se
                realiza a través de Luma y la confirmación llega a tu correo.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/60">
                Ten a la mano
              </p>
              <ul className="mt-5 flex flex-col gap-2.5">
                {datosLuma.map((dato) => (
                  <li key={dato} className="flex items-start gap-3 text-sm text-white/70 md:text-base">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet" />
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
