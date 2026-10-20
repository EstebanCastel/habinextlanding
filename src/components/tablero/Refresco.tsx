"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Vuelve a pedir los números cada minuto, y además cuando alguien regresa a la
 * pestaña. Un tablero abierto en una pantalla toda la noche que muestra el NPS
 * de las seis de la tarde es peor que no tener tablero: nadie sospecha que
 * está viejo.
 */
export default function Refresco({ cada = 60_000 }: { cada?: number }) {
  const router = useRouter();

  useEffect(() => {
    const mirar = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(mirar, cada);
    document.addEventListener("visibilitychange", mirar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", mirar);
    };
  }, [router, cada]);

  return null;
}
