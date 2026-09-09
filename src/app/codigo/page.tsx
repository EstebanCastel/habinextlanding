import type { Metadata } from "next";
import Link from "next/link";
import Asterisk from "@/components/Asterisk";
import Dot from "@/components/Dot";
import { EVENT, TICKETS } from "@/config/event";

/**
 * Redención de códigos de invitación: la puerta de los invitados de la casa.
 *
 * Hereda el sistema visual de la landing —superficie `night`, el asterisco de
 * ocho puntas, la pastilla de antetítulo, el morado de marca— porque quien
 * llega acá viene de la página o de un mensaje nuestro, y aterrizar en un
 * formulario genérico se siente como haber salido del evento.
 *
 * Todo el formulario es HTML plano que hace POST y vuelve con un redirect. Sin
 * JavaScript de por medio: tiene que funcionar igual en el navegador de
 * WhatsApp de un teléfono viejo, que es exactamente donde va a abrirse.
 */

export const metadata: Metadata = {
  title: "Redime tu código · Habi Next",
  description: "Activa tu entrada de cortesía para Habi Next Bogotá.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const campo =
  "w-full rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-4 text-lg text-white " +
  "placeholder:text-white/25 transition-colors focus:border-violet-soft/70 focus:bg-white/[0.07] focus:outline-none";

const etiqueta = "text-sm font-medium tracking-tight text-white/65";

/** Bandera de Colombia. Va en SVG y no como emoji para que se vea igual en todo teléfono. */
function Colombia() {
  return (
    <svg viewBox="0 0 9 6" aria-hidden="true" className="h-3.5 w-5 shrink-0 rounded-[2px]">
      <rect width="9" height="6" fill="#ce1126" />
      <rect width="9" height="4.5" fill="#003893" />
      <rect width="9" height="3" fill="#fcd116" />
    </svg>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <main className="s-night relative min-h-dvh overflow-hidden">
      {/* El asterisco de marca, grande y al borde: la misma firma del cierre. */}
      <Asterisk
        color="var(--violet)"
        className="pointer-events-none absolute -right-24 -top-24 h-[22rem] w-[22rem] opacity-[0.07] md:-right-16 md:h-[30rem] md:w-[30rem]"
      />
      <div className="relative z-10 mx-auto w-full max-w-xl px-5 py-16 sm:px-8 md:py-24">
        {children}
      </div>
    </main>
  );
}

export default async function Codigo({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const tier = q.tier === "vip" ? "vip" : "general";
  const ticket = TICKETS.find((t) => t.id === tier)!;

  if (q.listo === "1") {
    return (
      <Marco>
        <div className="text-center">
          <Asterisk color="var(--violet-soft)" className="mx-auto mb-8 h-14 w-14" />
          <p className="mb-5 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
            <Dot className="h-1.5 w-1.5" />
            Entrada confirmada
          </p>
          <h1 className="text-[2rem] font-semibold leading-[1.1] tracking-tight md:text-5xl">
            Listo. Tu entrada {ticket.name} ya es tuya.
          </h1>
          <p className="mt-7 text-lg font-light leading-relaxed text-white/70">
            Te la acabamos de mandar a{" "}
            <strong className="font-medium text-white">{q.email}</strong>, con tu código QR.
            Guárdala: es lo que te van a pedir en la puerta.
          </p>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-violet-soft">
              Te esperamos
            </p>
            <p className="mt-3 text-xl font-medium tracking-tight">{EVENT.dateLong}</p>
            <p className="mt-1 text-base font-light text-white/60">
              {EVENT.venue} · {EVENT.city}
            </p>
          </div>

          <p className="mt-10">
            <Link
              href="/"
              className="text-base font-light text-white/50 underline underline-offset-4 transition-colors hover:text-violet-soft"
            >
              Volver a Habi Next
            </Link>
          </p>
        </div>
      </Marco>
    );
  }

  return (
    <Marco>
      <p className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
        <Dot className="h-1.5 w-1.5" />
        Código de invitación
      </p>
      <h1 className="text-[2rem] font-semibold leading-[1.1] tracking-tight md:text-5xl">
        Activa tu entrada {ticket.name}
      </h1>
      <p className="mt-6 text-lg font-light leading-relaxed text-white/65">
        Escribe el código que te dieron y tus datos. Te mandamos la entrada al correo en el
        momento, sin pagar nada.
      </p>

      {/* Qué está activando: lo mismo que promete la boleta en la landing. */}
      <ul className="mt-8 flex flex-col gap-2.5 border-l border-white/10 pl-5">
        {ticket.includes.slice(0, 4).map((item) => (
          <li key={item} className="flex items-start gap-3 text-base font-light text-white/60">
            <Dot color="var(--violet-soft)" className="mt-2.5 h-1 w-1" />
            {item}
          </li>
        ))}
      </ul>

      <form method="post" action="/api/codigo" className="mt-11 flex flex-col gap-6">
        <input type="hidden" name="tier" value={tier} />

        <label className="flex flex-col gap-2.5">
          <span className={etiqueta}>Tu código</span>
          <input
            name="codigo"
            required
            defaultValue={q.codigo ?? ""}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="HABINEXT-ALIADOS"
            className={`${campo} font-mono uppercase tracking-[0.15em] placeholder:normal-case placeholder:tracking-normal`}
          />
        </label>

        <label className="flex flex-col gap-2.5">
          <span className={etiqueta}>Nombre y apellido</span>
          <input
            name="nombre"
            required
            defaultValue={q.nombre ?? ""}
            autoComplete="name"
            placeholder="Ana Gómez"
            className={campo}
          />
        </label>

        <label className="flex flex-col gap-2.5">
          <span className={etiqueta}>Correo</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={q.email ?? ""}
            autoComplete="email"
            inputMode="email"
            placeholder="ana@inmobiliaria.com"
            className={campo}
          />
          <span className="text-sm font-light text-white/40">
            A este correo llega tu entrada con el código QR.
          </span>
        </label>

        <div className="flex flex-col gap-2.5">
          <span className={etiqueta}>Celular</span>
          {/* El indicativo va fijo: el evento es en Bogotá y pedirle a alguien
              que escriba "+57" es la forma más fácil de que el número llegue
              mal y el WhatsApp nunca salga. */}
          <div className="flex items-stretch rounded-2xl border border-white/12 bg-white/[0.04] transition-colors focus-within:border-violet-soft/70 focus-within:bg-white/[0.07]">
            <span className="flex select-none items-center gap-2.5 border-r border-white/10 px-5 text-lg text-white/70">
              <Colombia />
              +57
            </span>
            <input
              name="telefono"
              type="tel"
              required
              defaultValue={q.telefono ?? ""}
              autoComplete="tel-national"
              inputMode="numeric"
              pattern="[0-9 ]{10,13}"
              maxLength={13}
              placeholder="300 123 4567"
              className="w-full min-w-0 rounded-r-2xl bg-transparent px-5 py-4 text-lg tracking-wide text-white placeholder:text-white/25 focus:outline-none"
            />
          </div>
          <span className="text-sm font-light text-white/40">
            Por acá te acompañamos hasta el día del evento.
          </span>
        </div>

        {q.error ? (
          <p
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-400/[0.08] px-5 py-4 text-base font-light leading-relaxed text-red-200"
          >
            <Dot color="rgb(252 165 165)" className="mt-2.5 h-1.5 w-1.5" />
            {q.error}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-2 rounded-full bg-violet px-10 py-5 text-lg font-semibold tracking-tight text-white shadow-[0_18px_44px_-14px_rgba(128,46,246,0.9)] transition-colors hover:bg-violet-press sm:text-xl"
        >
          Activar mi entrada {ticket.name}
        </button>
      </form>

      <p className="mt-9 text-base font-light text-white/45">
        ¿No tienes código?{" "}
        <Link
          href="/#boleteria"
          className="text-violet-soft underline underline-offset-4 transition-colors hover:text-white"
        >
          Mira las entradas
        </Link>
        .
      </p>
    </Marco>
  );
}
