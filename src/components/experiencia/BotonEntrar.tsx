"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** El nombre del evento con el que la portada abre su ventana de entrada. */
export const EVENTO_ENTRAR = "hn:entrar";

/**
 * Un «Entrar» que funciona desde cualquier pantalla. Desde otra página
 * navega a la portada con `?entrar=`; ya en la portada, navegar a la misma
 * dirección no vuelve a montar nada y la ventana no se abría: ahí se avisa
 * por un evento y la portada la abre en el sitio.
 */
export default function BotonEntrar({ destino = "/experiencia", className = "", children }: { destino?: string; className?: string; children: ReactNode }) {
  const ruta = usePathname();
  const href = `/experiencia?entrar=${encodeURIComponent(destino)}`;
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (ruta !== "/experiencia") return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(EVENTO_ENTRAR, { detail: destino }));
      }}
    >
      {children}
    </Link>
  );
}
