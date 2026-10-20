import { redirect } from "next/navigation";

/**
 * El podio vive dentro de la tienda: son la misma pregunta —qué valen los
 * puntos— partida en dos páginas. Esto queda para que los enlaces que ya
 * circularon no se rompan.
 */
export default function PaginaPodio() {
  redirect("/experiencia/tienda#podio");
}
