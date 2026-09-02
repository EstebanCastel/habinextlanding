interface AsteriskProps {
  color?: string;
  className?: string;
}

/**
 * Asterisco de ocho puntas: la firma gráfica de Habi Next.
 *
 * Es el trazado oficial de marca (`Asterisco.svg`), no una reconstrucción: va
 * relleno y con las puntas escuadradas, no son ocho líneas con las puntas
 * redondeadas. De ahí el viewBox heredado del archivo.
 */
export default function Asterisk({ color = "var(--violet)", className = "" }: AsteriskProps) {
  return (
    <svg viewBox="0 0 152.4 152.47" fill={color} aria-hidden="true" className={className}>
      <polygon points="142.91 70.47 90.11 70.47 127.45 33.11 119.3 24.96 81.96 62.31 81.96 9.49 70.43 9.49 70.43 62.31 33.1 24.96 24.95 33.11 62.28 70.47 9.48 70.47 9.48 82 62.28 82 24.95 119.36 33.1 127.51 70.43 90.16 70.43 142.98 81.96 142.98 81.96 90.16 119.3 127.51 127.45 119.36 90.11 82 142.91 82 142.91 70.47" />
    </svg>
  );
}
