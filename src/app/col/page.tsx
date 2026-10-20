import type { Metadata } from "next";
import { headers } from "next/headers";

/**
 * El atajo a la boletería de «Educación para Reconstruir Colombia».
 *
 * El enlace de Tuboleta trae cuatro identificadores y pasa de doscientos
 * caracteres: en un SMS no cabe, y pegado en un WhatsApp se ve como una
 * estafa. Esto es un enlace corto que enseña de qué se trata y salta.
 */

export const metadata: Metadata = {
  title: "Educación para Reconstruir Colombia · 26 de octubre",
  description: "12 horas, 2 escenarios, 26 speakers. 50% de descuento con el código EXCLUSIVOCOL.",
};

export const dynamic = "force-dynamic";

const BOLETERIA =
  "https://redencion2.checkout.tuboleta.com/selection/event/seat?perfId=10230555068698&choiceSelectionDone=true&productId=10230552990953&advantageId=10230594719443";

export default async function Col() {
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <main className="s-night grid min-h-dvh place-items-center bg-night px-5 py-10">
      <div className="w-full max-w-md text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/promos/reconstruir-colombia.jpg"
          alt="Educación para Reconstruir Colombia · 26 de octubre de 2026"
          className="mx-auto w-full rounded-2xl"
        />
        <h1 className="mt-7 text-2xl font-bold leading-tight tracking-tight text-white">
          Tu 50% con el código{" "}
          <span className="rounded-lg bg-violet px-2 py-0.5 font-mono tracking-tight">EXCLUSIVOCOL</span>
        </h1>
        <p className="mt-3 text-base font-light leading-relaxed text-white/60">
          Escríbelo en la casilla de código al comprar. Te llevamos a la boletería en un segundo.
        </p>
        <a
          href={BOLETERIA}
          className="mt-6 inline-block w-full rounded-full bg-violet px-6 py-4 text-base font-bold text-white transition-colors hover:bg-violet/90"
        >
          Ir a la boletería
        </a>
      </div>

      <script
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `setTimeout(function(){location.replace(${JSON.stringify(BOLETERIA)})},1400)`,
        }}
      />
    </main>
  );
}
