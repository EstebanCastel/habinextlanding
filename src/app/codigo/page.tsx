import type { Metadata } from "next";
import Link from "next/link";
import { EVENT, TICKETS } from "@/config/event";

/**
 * Redención de códigos de invitación. Es la puerta de los invitados de la
 * casa: aliados, prensa, equipo, patrocinadores.
 *
 * Todo el formulario es HTML plano que hace POST y vuelve con un redirect. Sin
 * JavaScript de por medio: la página tiene que funcionar igual en el navegador
 * de WhatsApp de un teléfono viejo, que es exactamente donde va a abrirse.
 */

export const metadata: Metadata = {
  title: "Redime tu código · Habi Next",
  description: "Activa tu entrada de cortesía para Habi Next Bogotá.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Codigo({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const tier = q.tier === "vip" ? "vip" : "general";
  const ticket = TICKETS.find((t) => t.id === tier)!;
  const listo = q.listo === "1";

  if (listo) {
    return (
      <main className="s-night min-h-dvh px-5 py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
            Entrada confirmada
          </p>
          <h1 className="text-3xl font-semibold md:text-4xl">
            Listo. Tu entrada {tier === "vip" ? "VIP" : "General"} ya es tuya.
          </h1>
          <p className="mt-6 text-lg font-light leading-relaxed text-white/70">
            Te la acabamos de mandar a <strong className="font-medium text-white">{q.email}</strong>,
            con tu código QR. Guárdala: es la que te van a pedir en la puerta.
          </p>
          <p className="mt-4 text-lg font-light leading-relaxed text-white/70">
            Nos vemos el {EVENT.dateLong.toLowerCase()} en el {EVENT.venue}.
          </p>
          <p className="mt-10">
            <Link href="/" className="text-violet-soft underline underline-offset-4">
              Volver a Habi Next
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="s-night min-h-dvh px-5 py-16 md:py-24">
      <div className="mx-auto max-w-xl">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
          Código de invitación
        </p>
        <h1 className="text-3xl font-semibold md:text-4xl">
          Activa tu entrada {ticket.name}
        </h1>
        <p className="mt-5 text-lg font-light leading-relaxed text-white/70">
          Si te dieron un código, escríbelo acá con tus datos y te mandamos la entrada al correo
          en el momento. No tienes que pagar nada.
        </p>

        <form method="post" action="/api/codigo" className="mt-10 flex flex-col gap-5">
          <input type="hidden" name="tier" value={tier} />

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-white/70">Tu código</span>
            <input
              name="codigo"
              required
              defaultValue={q.codigo ?? ""}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="HABINEXT-ALIADOS"
              className="rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-lg tracking-wider text-white uppercase placeholder:text-white/25 placeholder:normal-case"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-white/70">Nombre y apellido</span>
            <input
              name="nombre"
              required
              defaultValue={q.nombre ?? ""}
              autoComplete="name"
              placeholder="Ana Gómez"
              className="rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/25"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-white/70">Correo</span>
            <input
              name="email"
              type="email"
              required
              defaultValue={q.email ?? ""}
              autoComplete="email"
              inputMode="email"
              placeholder="ana@inmobiliaria.com"
              className="rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/25"
            />
            <span className="text-xs text-white/40">
              A este correo llega tu entrada con el código QR.
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-white/70">Celular (WhatsApp)</span>
            <input
              name="telefono"
              type="tel"
              required
              defaultValue={q.telefono ?? ""}
              autoComplete="tel"
              inputMode="tel"
              placeholder="+57 300 123 4567"
              className="rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/25"
            />
          </label>

          {q.error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {q.error}
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-2 rounded-full bg-violet px-8 py-4 text-base font-semibold text-white"
          >
            Activar mi entrada {ticket.name}
          </button>
        </form>

        <p className="mt-8 text-sm text-white/45">
          ¿No tienes código?{" "}
          <Link href="/#boleteria" className="text-violet-soft underline underline-offset-4">
            Mira las entradas
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
