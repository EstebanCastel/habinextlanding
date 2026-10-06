"use client";

import Link from "next/link";
import Asterisk from "@/components/Asterisk";
import type { Vista } from "@/lib/experiencia";
import type { EntradaVista } from "./entrada";
import { clasesBoton } from "./util";

/**
 * «Tu entrada»: lo primero que se ve al abrir el carnet.
 *
 * Antes la persona llegaba a un editor de fotos y el QR estaba al final de
 * la página, detrás de una tarjeta que había que girar. Lo que de verdad
 * quiere saber quien compró es si su entrada está confirmada, de qué tipo es
 * y cómo la lleva en el teléfono. Eso va acá arriba, en una sola franja: el
 * tipo de entrada, el estado y el QR a un toque. Las billeteras van en el
 * carnet, debajo del botón de guardar, que es donde la persona termina.
 */
export default function Boleta({
  yo,
  entrada,
  motivo,
  cargando,
  alVerQr,
}: {
  yo: Vista | null;
  entrada: EntradaVista | null;
  motivo: string;
  cargando: boolean;
  alVerQr: () => void;
}) {
  if (cargando) {
    return (
      <section aria-busy="true" className="rounded-[28px] border border-white/12 bg-white/[0.03] p-6 md:p-8">
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
        <div className="mt-4 h-8 w-2/3 animate-pulse rounded-full bg-white/10" />
        <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-white/[0.06]" />
      </section>
    );
  }

  const tier = entrada?.tier ?? yo?.registro?.tier;
  const esVip = tier === "vip";
  const confirmada = Boolean(entrada?.qr);
  const etapa = entrada?.etapa;
  const rechazada = etapa === "rechazado";
  // Ya pagó o ya mandó el comprobante: no se le vuelve a pedir plata.
  const pagada = etapa === "aprobado" || etapa === "pago_confirmado" || etapa === "comprobante_recibido";
  // Hay un registro enlazado pero no se pudo leer ahora: no es «no tienes entrada».
  const sinLeer = !entrada && Boolean(yo?.registro);

  let titulo: string;
  let texto: string;
  if (!entrada) {
    titulo = sinLeer ? "No pudimos leerla ahora." : "Todavía no la encontramos.";
    texto = sinLeer
      ? motivo || "Tu entrada existe, pero no la pudimos consultar en este momento. Recarga la página en un minuto."
      : `No hay una entrada a nombre de este correo${yo?.email ? ` (${yo.email})` : ""}. Si ya compraste con otro correo, sal y vuelve a entrar con ese correo y tu cédula. Si todavía no tienes entrada, es el momento.`;
  } else if (rechazada) {
    titulo = "Este registro no está activo.";
    texto = motivo || entrada.motivo || "Escríbenos y lo revisamos.";
  } else if (confirmada) {
    titulo = `Confirmada${esVip ? ", y es VIP." : "."}`;
    texto =
      "El QR que va atrás de tu carnet es el mismo que leen en la puerta: te lo mandó Luma al correo y también vive aquí. Abajo puedes guardarlo en Apple Wallet o Google Wallet.";
  } else if (pagada) {
    titulo = etapa === "comprobante_recibido" ? "Recibimos tu comprobante." : "Recibida, falta el QR.";
    texto = motivo || entrada.motivo || "Estamos confirmando tu pago. Tu QR aparece aquí apenas quede listo.";
  } else {
    titulo = "Reservada, falta el pago.";
    texto = motivo || entrada.motivo || "Tu QR aparece aquí apenas confirmemos tu pago.";
  }

  return (
    <section
      className={`relative overflow-hidden rounded-[28px] border p-6 md:p-8 ${
        confirmada ? "border-violet/40 bg-gradient-to-br from-violet-shade via-night to-night" : "border-white/12 bg-white/[0.03]"
      }`}
    >
      {esVip ? (
        <Asterisk color="var(--violet)" className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 opacity-20" />
      ) : null}

      <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 max-w-xl">
          <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">
            Tu entrada
            {tier && !rechazada ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.18em] ${
                  esVip ? "bg-white text-night" : "border border-white/25 text-white/80"
                }`}
              >
                {esVip ? <Asterisk color="currentColor" className="h-2.5 w-2.5" /> : null}
                {esVip ? "VIP" : "GENERAL"}
              </span>
            ) : null}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tighter md:text-4xl">{titulo}</h2>
          <p className="mt-2 text-base font-light leading-relaxed text-white/65">{texto}</p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
          {entrada && confirmada ? (
            <button type="button" onClick={alVerQr} className={clasesBoton.claro}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <path d="M14 14h3v3h-3zM20 14v1M17 20h4M14 20h1" strokeLinecap="round" />
              </svg>
              Ver mi QR
            </button>
          ) : entrada && !pagada && !rechazada ? (
            <Link href={`/p/${entrada.token}`} className={clasesBoton.solido}>
              Pagar mi entrada
            </Link>
          ) : rechazada ? (
            <a
              href={`https://wa.me/573009110459?text=${encodeURIComponent("Hola, mi entrada a Habi Next aparece como no activa y quiero revisarla")}`}
              target="_blank"
              rel="noreferrer"
              className={clasesBoton.borde}
            >
              Escríbenos por WhatsApp
            </a>
          ) : !entrada && !sinLeer ? (
            <div className="flex flex-wrap gap-3">
              <Link href="/#boleteria" className={clasesBoton.solido}>
                Comprar mi entrada
              </Link>
              <form method="post" action="/api/experiencia/salir">
                <button type="submit" className={clasesBoton.borde}>
                  Entrar con otro correo
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>

    </section>
  );
}
