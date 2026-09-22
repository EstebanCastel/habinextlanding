import type { Metadata } from "next";
import Link from "next/link";
import Asterisk from "@/components/Asterisk";
import Dot from "@/components/Dot";
import { EVENT, TICKETS, activeStageIndex } from "@/config/event";

/**
 * La compra: primero se paga, después se da de alta en Luma.
 *
 * Es la puerta nueva de la boletería. La persona deja sus datos acá —los que
 * hacen falta para darla de alta en Luma y para escribirle— y pasa al pago en
 * Wompi con su link personal. Cuando el pago está, el equipo la da de alta en
 * Luma ya aprobada y le llega la confirmación por correo, SMS y WhatsApp.
 *
 * Formulario HTML plano, como el de códigos: tiene que funcionar en el
 * navegador de WhatsApp de cualquier teléfono.
 */

export const metadata: Metadata = {
  title: "Comprar entrada · Habi Next",
  description: "Compra tu entrada a Habi Next Colombia: pagas en Wompi y tu entrada con el código QR te llega al correo.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const campo =
  "w-full rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-4 text-lg text-white " +
  "placeholder:text-white/25 transition-colors focus:border-violet-soft/70 focus:bg-white/[0.07] focus:outline-none";
const etiqueta = "text-sm font-medium tracking-tight text-white/65";

function Colombia() {
  return (
    <svg viewBox="0 0 9 6" aria-hidden="true" className="h-3.5 w-5 shrink-0 rounded-[2px]">
      <rect width="9" height="6" fill="#ce1126" />
      <rect width="9" height="4.5" fill="#003893" />
      <rect width="9" height="3" fill="#fcd116" />
    </svg>
  );
}

export default async function Comprar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const tier = q.tier === "vip" ? "vip" : "general";
  const ticket = TICKETS.find((t) => t.id === tier)!;
  const etapa = ticket.stages[activeStageIndex(ticket.stages, new Date())];
  const otro = TICKETS.find((t) => t.id !== tier)!;

  return (
    <main className="s-night relative min-h-dvh overflow-hidden">
      <Asterisk color="var(--violet)" className="pointer-events-none absolute -right-24 -top-24 h-[22rem] w-[22rem] opacity-[0.07] md:-right-16 md:h-[30rem] md:w-[30rem]" />
      <div className="relative z-10 mx-auto w-full max-w-xl px-5 py-16 sm:px-8 md:py-24">
        <p className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
          <Dot className="h-1.5 w-1.5" />
          Entrada {ticket.name} · {etapa.note}
        </p>
        <h1 className="text-[2rem] font-semibold leading-[1.1] tracking-tight md:text-5xl">
          Tu entrada {ticket.name}
          <span className="mt-2 block text-violet-soft">{etapa.price} <span className="text-lg font-light text-white/50">COP</span></span>
        </h1>
        <p className="mt-6 text-lg font-light leading-relaxed text-white/65">
          Déjanos tus datos y pasa a pagar en Wompi. Cuando el pago esté confirmado te damos de alta y tu entrada con el
          código QR te llega al correo, con la confirmación por WhatsApp.
        </p>

        <ul className="mt-8 flex flex-col gap-2.5 border-l border-white/10 pl-5">
          {ticket.includes.slice(0, 5).map((item) => (
            <li key={item} className="flex items-start gap-3 text-base font-light text-white/60">
              <Dot color="var(--violet-soft)" className="mt-2.5 h-1 w-1" />
              {item}
            </li>
          ))}
        </ul>

        <form method="post" action="/api/comprar" className="mt-11 flex flex-col gap-6">
          <input type="hidden" name="tier" value={tier} />
          <input type="hidden" name="origen" value={q.utm_source ?? ""} />
          <input type="hidden" name="contenido" value={q.utm_content ?? ""} />

          <label className="flex flex-col gap-2.5">
            <span className={etiqueta}>Nombre y apellido</span>
            <input name="nombre" required defaultValue={q.nombre ?? ""} autoComplete="name" placeholder="Ana Gómez" className={campo} />
          </label>

          <label className="flex flex-col gap-2.5">
            <span className={etiqueta}>Correo</span>
            <input name="email" type="email" required defaultValue={q.email ?? ""} autoComplete="email" inputMode="email" placeholder="ana@inmobiliaria.com" className={campo} />
            <span className="text-sm font-light text-white/40">A este correo llega tu entrada con el código QR.</span>
          </label>

          <label className="flex flex-col gap-2.5">
            <span className={etiqueta}>Número de cédula</span>
            <input name="cedula" required defaultValue={q.cedula ?? ""} inputMode="numeric" pattern="[0-9]{6,12}" maxLength={12} autoComplete="off" placeholder="1020304050" className={`${campo} tracking-wide`} />
            <span className="text-sm font-light text-white/40">Solo números. Es lo que te van a pedir en la entrada.</span>
          </label>

          <div className="flex flex-col gap-2.5">
            <span className={etiqueta}>Celular</span>
            <div className="flex items-stretch rounded-2xl border border-white/12 bg-white/[0.04] transition-colors focus-within:border-violet-soft/70 focus-within:bg-white/[0.07]">
              <span className="flex select-none items-center gap-2.5 border-r border-white/10 px-5 text-lg text-white/70">
                <Colombia />
                +57
              </span>
              <input name="telefono" type="tel" required defaultValue={q.telefono ?? ""} autoComplete="tel-national" inputMode="numeric" pattern="[0-9 ]{10,13}" maxLength={13} placeholder="300 123 4567" className="w-full min-w-0 rounded-r-2xl bg-transparent px-5 py-4 text-lg tracking-wide text-white placeholder:text-white/25 focus:outline-none" />
            </div>
            <span className="text-sm font-light text-white/40">Por acá te llega la confirmación y te acompañamos hasta el día del evento.</span>
          </div>

          {q.error ? (
            <p role="alert" className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-400/[0.08] px-5 py-4 text-base font-light leading-relaxed text-red-200">
              <Dot color="rgb(252 165 165)" className="mt-2.5 h-1.5 w-1.5" />
              {q.error}
            </p>
          ) : null}

          <button type="submit" className="mt-2 rounded-full bg-violet px-10 py-5 text-lg font-semibold tracking-tight text-white shadow-[0_18px_44px_-14px_rgba(128,46,246,0.9)] transition-colors hover:bg-violet-press sm:text-xl">
            Ir a pagar {etapa.price}
          </button>
          <p className="text-sm font-light leading-relaxed text-white/40">
            El pago es en Wompi, con tarjeta, PSE o Nequi. Al pagar, escribe el mismo correo y celular que pusiste acá para
            que cuadremos tu pago sin demoras.
          </p>
        </form>

        <p className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-base font-light text-white/45">
          <Link href={`/comprar?tier=${otro.id}`} className="text-violet-soft underline underline-offset-4 transition-colors hover:text-white">
            Prefiero la entrada {otro.name}
          </Link>
          <Link href={`/codigo?tier=${tier}`} className="underline underline-offset-4 transition-colors hover:text-violet-soft">
            Tengo un código de invitación
          </Link>
          <Link href="/" className="underline underline-offset-4 transition-colors hover:text-violet-soft">
            Volver a Habi Next
          </Link>
        </p>
        <p className="mt-6 text-xs font-light text-white/35">{EVENT.dateLong} · {EVENT.venue}</p>
      </div>
    </main>
  );
}
