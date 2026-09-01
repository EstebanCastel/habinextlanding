import type { ReactNode } from "react";

interface CTAButtonProps {
  href: string;
  children: ReactNode;
  variant?: "solid" | "outline" | "light";
  className?: string;
  id?: string;
}

const base =
  "inline-flex items-center justify-center gap-3 rounded-full font-semibold tracking-tight transition-all duration-300 px-8 py-4 text-base sm:px-10 sm:py-5 sm:text-lg md:text-xl active:scale-[0.97]";

const variants: Record<NonNullable<CTAButtonProps["variant"]>, string> = {
  solid:
    "bg-[#802ef6] text-white shadow-[0_18px_40px_-14px_rgba(128,46,246,0.85)] hover:bg-[#6d25d1] hover:shadow-[0_22px_50px_-12px_rgba(128,46,246,0.95)] hover:-translate-y-0.5",
  outline:
    "border-[3px] border-[#802ef6] text-white hover:bg-[#802ef6] hover:-translate-y-0.5",
  light:
    "bg-white text-black hover:bg-[#f1e9ff] hover:-translate-y-0.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.5)]",
};

/** Todos los CTA salen a Luma, por eso siempre abren en pestaña nueva. */
export default function CTAButton({
  href,
  children,
  variant = "solid",
  className = "",
  id,
}: CTAButtonProps) {
  return (
    <a
      id={id}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </a>
  );
}
