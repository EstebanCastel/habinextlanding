interface DotProps {
  /** Por defecto hereda el color del texto que acompaña. */
  color?: string;
  className?: string;
}

/**
 * Punto: el marcador de listas y de etiquetas de sección.
 *
 * El asterisco quedó reservado para los momentos de marca —el cursor del hero,
 * el trío de Construir, los tres perfiles y el cierre—. Cuando aparecía además
 * como viñeta de cada lista y de cada antetítulo salía unas cuarenta veces en
 * la página y dejaba de leerse como firma.
 */
export default function Dot({ color = "currentColor", className = "" }: DotProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}
