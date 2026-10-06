"use client";

import { useSearchParams } from "next/navigation";

/**
 * «Esa clave no es» vive en la dirección (`?error=1`) y el layout, que es
 * quien muestra la puerta, no puede leer parámetros: lo lee este trocito.
 */
export default function AvisoClave() {
  const q = useSearchParams();
  if (q.get("error") !== "1") return null;
  return <p className="mt-4 text-base font-light text-red-300">Esa clave no es.</p>;
}
