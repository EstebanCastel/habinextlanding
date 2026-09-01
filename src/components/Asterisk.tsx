interface AsteriskProps {
  color?: string;
  className?: string;
}

/** Asterisco de ocho puntas: la firma gráfica de Habi Next. */
export default function Asterisk({ color = "#802ef6", className = "" }: AsteriskProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <line x1="12" y1="12" x2="12" y2="3" />
      <line x1="12" y1="12" x2="18.36" y2="5.64" />
      <line x1="12" y1="12" x2="21" y2="12" />
      <line x1="12" y1="12" x2="18.36" y2="18.36" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <line x1="12" y1="12" x2="5.64" y2="18.36" />
      <line x1="12" y1="12" x2="3" y2="12" />
      <line x1="12" y1="12" x2="5.64" y2="5.64" />
    </svg>
  );
}
