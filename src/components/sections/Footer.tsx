import Image from "next/image";
import { EVENT, LINKS } from "@/config/event";

export default function Footer() {
  return (
    <footer className="s-night w-full border-t border-white/12 px-5 py-12 sm:px-8 md:px-14 lg:px-20">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Image src="/img/logo.png" alt="Habi" width={684} height={642} className="h-10 w-auto" />
          <div>
            <p className="text-base font-semibold tracking-tight text-white">
              {EVENT.name} {EVENT.city}
            </p>
            <p className="text-sm font-light text-white/45">
              {EVENT.dateLong} · {EVENT.venue || EVENT.venueLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <a
            href={LINKS.general}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            Entrada General
          </a>
          <a
            href={LINKS.vip}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            Entrada VIP
          </a>
          <a
            href={LINKS.sponsors}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            Patrocinadores
          </a>
          <a
            href="https://habi.co/politica-de-tratamiento-de-datos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            Tratamiento de datos
          </a>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-[1400px] text-xs font-light text-white/30">
        © {new Date().getFullYear()} Habi. La compra de entradas se procesa en Luma. Los precios
        aumentan por etapas y los cupos VIP son limitados.
      </p>
    </footer>
  );
}
