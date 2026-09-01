"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
  /** Desplazamiento inicial en píxeles. 0 = solo desvanecido. */
  y?: number;
}

/**
 * Aparición al entrar en viewport. El estado inicial lo pone GSAP en el layout
 * effect, así que sin JavaScript el contenido simplemente se ve.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
  y = 28,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(ref.current, {
          opacity: 0,
          y,
          duration: 0.85,
          delay,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 88%", once: true },
        });
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={`reveal ${className}`}>
      {children}
    </Tag>
  );
}
