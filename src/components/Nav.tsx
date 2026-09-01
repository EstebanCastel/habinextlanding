"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { EVENT, LINKS } from "@/config/event";

const sections = [
  { href: "#aprendizajes", label: "Qué aprenderás" },
  { href: "#experiencia", label: "La experiencia" },
  { href: "#escenarios", label: "Escenarios" },
  { href: "#boleteria", label: "Boletería" },
];

/**
 * La barra arranca transparente sobre el hero y se vuelve sólida al bajar,
 * para que el CTA de compra esté siempre a un clic sin tapar el titular.
 */
export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-black/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-5 py-3 md:px-10 md:py-4">
        <a href="#top" className="flex shrink-0 items-center gap-3" aria-label={`${EVENT.name} ${EVENT.city}`}>
          <Image
            src="/img/logo.png"
            alt="Habi"
            width={684}
            height={642}
            priority
            className="h-8 w-auto md:h-10"
          />
          <span className="hidden text-sm font-semibold tracking-tight text-white/70 sm:block md:text-base">
            Next {EVENT.city}
          </span>
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {sections.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <a
          href={LINKS.general}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-[#802ef6] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#6d25d1] md:px-7 md:py-3 md:text-base"
        >
          Quiero mi entrada
        </a>
      </div>
    </header>
  );
}
