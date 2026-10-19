import type { Metadata } from "next";
import Link from "next/link";
import Asterisk from "@/components/Asterisk";
import Marco from "@/components/experiencia/Marco";
import { EVENT } from "@/config/event";
import { FAQ, SAC } from "@/config/faq";
import { vistaDe } from "@/lib/experiencia";
import { participanteActual } from "@/lib/experiencia-http";

/**
 * Las preguntas frecuentes.
 *
 * Es HTML plano con `<details>`: sin JavaScript de por medio abre al instante,
 * funciona con la pantalla a medio cargar y el buscador del navegador la
 * encuentra entera, que es lo que pasa cuando alguien busca «parqueadero» con
 * una mano mientras maneja al evento.
 *
 * Las que no están confirmadas salen marcadas y no inventadas: una respuesta
 * a medias la gente la da por buena y llega a la puerta con un dato que nadie
 * le prometió.
 */

export const metadata: Metadata = {
  title: `Preguntas · ${EVENT.fullName}`,
  description: "Todo lo que hay que saber para llegar a Habi Next Colombia.",
};

export const dynamic = "force-dynamic";

export default async function Preguntas() {
  const p = await participanteActual();
  const yo = p ? vistaDe(p) : null;

  return (
    <Marco yo={yo} eyebrow="Habi Next Colombia" titulo="Preguntas frecuentes" bajada="Todo lo que hay que saber para llegar al 20 de octubre.">
      <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-4">
        {FAQ.map((s) => (
          <section key={s.id} className="mt-10 first:mt-0">
            <h2 className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.2em] text-violet-soft">
              <Asterisk className="size-3.5" />
              {s.titulo}
            </h2>
            <div className="mt-4 divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03]">
              {s.preguntas.map((q) => (
                <details key={q.p} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium text-white/90 transition-colors hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
                    {q.p}
                    <svg
                      className="size-5 shrink-0 text-white/40 transition-transform group-open:rotate-45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </summary>
                  <p className="px-5 pb-5 text-base font-light leading-relaxed text-white/65">
                    {q.porConfirmar ? (
                      <span className="text-white/50">
                        Lo estamos confirmando con la sede. Escríbenos al{" "}
                        <a href={SAC.url} className="font-medium text-violet-soft underline-offset-4 hover:underline">
                          {SAC.whatsapp}
                        </a>{" "}
                        y te lo decimos apenas lo tengamos.
                      </span>
                    ) : (
                      q.r
                    )}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-12 rounded-3xl border border-violet/35 bg-violet/[0.08] p-7 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">¿Te quedó una duda?</h2>
          <p className="mx-auto mt-2 max-w-md text-base font-light leading-relaxed text-white/65">
            Escríbenos por WhatsApp y te respondemos el mismo día.
          </p>
          <a
            href={SAC.url}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-violet px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-violet/90"
          >
            Escribir a SAC
          </a>
        </section>

        <p className="mt-8 text-center">
          <Link href="/experiencia" className="text-sm font-medium text-white/50 underline-offset-4 hover:text-white hover:underline">
            Volver a la experiencia
          </Link>
        </p>
      </div>
    </Marco>
  );
}
