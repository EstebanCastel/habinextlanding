"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

interface CTAButtonProps {
  href: string;
  children: ReactNode;
  variant?: "solid" | "outline" | "light" | "ink";
  className?: string;
}

const base =
  "relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full px-8 py-4 text-base font-semibold tracking-tight transition-colors duration-300 sm:px-10 sm:py-5 sm:text-lg md:text-xl";

const variants: Record<NonNullable<CTAButtonProps["variant"]>, string> = {
  solid: "bg-[#802ef6] text-white shadow-[0_18px_44px_-14px_rgba(128,46,246,0.9)] hover:bg-[#6d25d1]",
  outline: "border-[3px] border-current text-current hover:bg-current/10",
  light: "bg-white text-[#0a0410] shadow-[0_18px_44px_-16px_rgba(0,0,0,0.6)] hover:bg-[#f1e9ff]",
  ink: "bg-[#0a0410] text-white hover:bg-[#1d0a33]",
};

/**
 * Botón magnético: sigue el cursor unos píxeles al acercarse. Todos los CTA
 * salen a Luma, de ahí el target en pestaña nueva.
 */
export default function CTAButton({
  href,
  children,
  variant = "solid",
  className = "",
}: CTAButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const el = ref.current;
      if (!el || !contextSafe) return;

      const mm = gsap.matchMedia();
      // Solo con puntero fino: en táctil el efecto no aplica y estorba.
      mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const moveX = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
        const moveY = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });

        const onMove = contextSafe((event: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          moveX((event.clientX - (rect.left + rect.width / 2)) * 0.28);
          moveY((event.clientY - (rect.top + rect.height / 2)) * 0.42);
        }) as (event: MouseEvent) => void;

        const onLeave = contextSafe(() => {
          moveX(0);
          moveY(0);
        }) as () => void;

        el.addEventListener("mousemove", onMove);
        el.addEventListener("mouseleave", onLeave);
        return () => {
          el.removeEventListener("mousemove", onMove);
          el.removeEventListener("mouseleave", onLeave);
        };
      });
    },
    { scope: ref },
  );

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </a>
  );
}
