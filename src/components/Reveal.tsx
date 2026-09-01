"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Retraso en segundos, para escalonar elementos hermanos. */
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}

/**
 * Aparición al entrar en viewport. Un solo gesto en todo el sitio —subir 24px
 * y revelar— para que el scroll se sienta continuo y no como una suma de
 * efectos distintos.
 */
export default function Reveal({ children, delay = 0, className = "", as = "div" }: RevealProps) {
  const Tag = motion[as];

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}
