import Link from "next/link";

/**
 * La franja del día del evento, encima de todo lo demás.
 *
 * Hoy la landing recibe a dos tipos de visita y ninguna viene a leer la
 * promesa del evento: el que está en la fila buscando su QR y el que todavía
 * no ha salido de la casa y quiere saber dónde es. Los dos necesitan la misma
 * pantalla, y hasta hoy había que encontrarla en el menú, detrás del botón de
 * hamburguesa.
 *
 * Solo aparece el 20. Cualquier otro día la landing es lo que era.
 */
export default function HoyEsHoy() {
  return (
    <div className="relative z-40 bg-violet">
      <Link
        href="/experiencia"
        className="mx-auto flex max-w-7xl items-center justify-center gap-2.5 px-4 py-2.5 text-center transition-colors hover:bg-violet-press sm:gap-3"
      >
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        <span className="text-[13px] font-semibold leading-tight text-white sm:text-sm">
          Hoy es Habi Next.
          <span className="font-light text-white/80"> Abre tu QR y la agenda del día</span>
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}
