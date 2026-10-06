import type { Podio as Filas } from "@/lib/experiencia";

/**
 * Los tres primeros, como podio: oro, plata y bronce.
 *
 * El primero va en el medio y más alto, como en una premiación; los otros
 * dos a los lados. Cada medalla es un SVG con su metal pintado a mano —un
 * degradado radial y el canto más oscuro, sin destellos— y la cinta en el
 * morado de la marca, para que las tres se lean como de la misma casa. Donde todavía no hay nadie se deja el puesto
 * dibujado: es una invitación, no un vacío.
 */

const METALES = {
  1: { nombre: "Oro", claro: "#fff3b0", medio: "#f2b134", oscuro: "#9a6508", tinta: "#4a2f00" },
  2: { nombre: "Plata", claro: "#ffffff", medio: "#c9cad6", oscuro: "#6c6e80", tinta: "#2b2c38" },
  3: { nombre: "Bronce", claro: "#ffd4b3", medio: "#c77a3c", oscuro: "#6b3a14", tinta: "#3a1f08" },
} as const;

type Puesto = 1 | 2 | 3;

export function Medalla({ puesto, className = "" }: { puesto: Puesto; className?: string }) {
  const m = METALES[puesto];
  const id = `medalla-${puesto}`;
  return (
    <span className={`relative inline-block overflow-hidden ${className}`}>
      <svg viewBox="0 0 100 130" className="h-full w-full" aria-label={`Medalla de ${m.nombre.toLowerCase()}`} role="img">
        <defs>
          <radialGradient id={`${id}-disco`} cx="36%" cy="30%" r="75%">
            <stop offset="0%" stopColor={m.claro} />
            <stop offset="45%" stopColor={m.medio} />
            <stop offset="100%" stopColor={m.oscuro} />
          </radialGradient>
          <linearGradient id={`${id}-canto`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={m.claro} stopOpacity="0.9" />
            <stop offset="55%" stopColor={m.oscuro} />
            <stop offset="100%" stopColor={m.medio} />
          </linearGradient>
          <linearGradient id={`${id}-cinta`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#802ef6" />
            <stop offset="100%" stopColor="#3d1080" />
          </linearGradient>
        </defs>
        {/* La cinta: dos bandas en V que sostienen el disco. */}
        <path d="M30 0h16l10 48-14 10z" fill={`url(#${id}-cinta)`} />
        <path d="M70 0H54L44 48l14 10z" fill="#3d1080" />
        <path d="M30 0h16l-3 16h-16z" fill="#6d25d1" opacity="0.9" />
        {/* El disco, con canto y borde interior. */}
        <circle cx="50" cy="84" r="43" fill={`url(#${id}-canto)`} />
        <circle cx="50" cy="84" r="38" fill={`url(#${id}-disco)`} />
        <circle cx="50" cy="84" r="31" fill="none" stroke={m.oscuro} strokeOpacity="0.45" strokeWidth="1.5" />
        <circle cx="50" cy="84" r="29.5" fill="none" stroke={m.claro} strokeOpacity="0.5" strokeWidth="0.8" />
        {/* El número, grabado. */}
        <text
          x="50"
          y="84"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-urbanist), system-ui, sans-serif"
          fontWeight="800"
          fontSize="40"
          fill={m.tinta}
          opacity="0.92"
        >
          {puesto}
        </text>
      </svg>
    </span>
  );
}

export default function Podio({ podio }: { podio: Filas }) {
  const por = (puesto: Puesto) => podio.find((p) => p.puesto === puesto) ?? null;
  // En el DOM van 1, 2, 3 (es una lista ordenada); en pantalla, plata · oro ·
  // bronce con el primero en el centro, que es como se lee un podio.
  const orden: { puesto: Puesto; visual: number; alto: string; medalla: string }[] = [
    { puesto: 1, visual: 2, alto: "h-24 sm:h-32", medalla: "h-32 w-[6.2rem] sm:h-36 sm:w-[7rem]" },
    { puesto: 2, visual: 1, alto: "h-16 sm:h-20", medalla: "h-24 w-[4.6rem] sm:h-28 sm:w-[5.4rem]" },
    { puesto: 3, visual: 3, alto: "h-12 sm:h-14", medalla: "h-24 w-[4.6rem] sm:h-28 sm:w-[5.4rem]" },
  ];

  return (
    <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {orden.map(({ puesto, visual, alto, medalla }) => {
        const p = por(puesto);
        const m = METALES[puesto];
        return (
          <li key={puesto} className="flex min-w-0 flex-col items-center text-center" style={{ order: visual }}>
            <Medalla puesto={puesto} className={`${medalla} ${p ? "" : "opacity-35 grayscale"}`} />
            <div className="mt-3 flex w-full min-w-0 flex-col items-center px-1">
              {p ? (
                <>
                  <p className="line-clamp-2 w-full break-words text-[13px] font-semibold leading-tight tracking-tight sm:text-base" title={p.nombre}>
                    {p.nombre}
                  </p>
                  <p className="text-2xl font-bold tabular-nums tracking-tighter sm:text-3xl" style={{ color: m.medio }}>
                    {p.puntos}
                    <span className="ml-1 text-xs font-medium tracking-normal text-white/45">pts</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-white/40">Libre</p>
                  <p className="text-xs font-light text-white/30">puede ser tuyo</p>
                </>
              )}
            </div>
            <div
              className={`mt-3 w-full rounded-t-2xl border border-b-0 border-white/12 ${alto}`}
              style={{
                background: `linear-gradient(180deg, ${m.medio}26 0%, rgba(255,255,255,0.02) 100%)`,
                boxShadow: `inset 0 1px 0 ${m.claro}55`,
              }}
            >
              <p className="pt-2 text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: m.medio }}>
                {m.nombre}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
