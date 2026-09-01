type Variant = "diagonal" | "arch" | "wave" | "notch" | "steps";

interface SeamProps {
  variant: Variant;
  /** Color de la sección anterior: la costura entra en la nueva, no la corta. */
  color: string;
  className?: string;
}

/**
 * Costura entre secciones. Cada borde del sitio usa una forma distinta de la
 * misma familia, para que el paso de una sección a otra sea un gesto gráfico y
 * no un corte recto más.
 *
 * Se dibuja arriba de la sección nueva, rellena con el color de la anterior.
 */
const shapes: Record<Variant, string> = {
  // Cuña inclinada: el bloque anterior se derrama hacia la izquierda.
  diagonal: "M0,0 H100 V22 L0,100 Z",
  // Arco: la sección anterior baja en curva sobre la nueva.
  arch: "M0,0 H100 V18 Q50,116 0,18 Z",
  // Ola asimétrica.
  wave: "M0,0 H100 V34 C74,96 26,-16 0,44 Z",
  // Muesca semicircular centrada, como el hueco de una ficha.
  notch: "M0,0 H100 V62 H63 A13,13 0 0 1 37,62 H0 Z",
  // Dientes: la misma cinta de bloques del cierre, en versión borde.
  steps: "M0,0 H100 V40 H88 V72 H72 V40 H56 V72 H40 V40 H24 V72 H8 V40 H0 Z",
};

export default function Seam({ variant, color, className = "" }: SeamProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-12 md:h-24 ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
        fill={color}
      >
        <path d={shapes[variant]} />
      </svg>
    </div>
  );
}
