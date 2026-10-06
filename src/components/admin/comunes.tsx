import Dot from "@/components/Dot";
import type { Etapa } from "@/lib/registros";

/** Lo que comparten las páginas del panel: textos, formatos y piezas chicas. */

export const ETAPAS: { id: Etapa; texto: string }[] = [
  { id: "por_pagar", texto: "Fue a pagar" },
  { id: "registrado", texto: "Registrado" },
  { id: "mensaje_enviado", texto: "WhatsApp enviado" },
  { id: "mensaje_entregado", texto: "Entregado" },
  { id: "mensaje_leido", texto: "Leído" },
  { id: "pago_abierto", texto: "Abrió el pago" },
  { id: "comprobante_recibido", texto: "Mandó comprobante" },
  { id: "pago_confirmado", texto: "Pago confirmado" },
  { id: "aprobado", texto: "Aprobado" },
];

export const LUMA_INVITADOS: Record<string, string> = {
  general: "https://luma.com/habinext-general",
  vip: "https://luma.com/habinext-vip",
};

export function hora(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const sitio = () => process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";

/** Filtro de un listado. Es un enlace, no un botón: el estado vive en la dirección y se puede compartir. */
export function Pastilla({ activa, href, children }: { activa: boolean; href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`rounded-full px-4 py-2 text-sm transition-colors ${
        activa ? "bg-violet font-semibold text-white" : "border border-white/15 text-white/60 hover:border-white/35 hover:text-white"
      }`}
    >
      {children}
    </a>
  );
}

export function Tarjetas({ items }: { items: { n: string | number; t: string; acento?: boolean }[] }) {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((c) => (
        <div key={c.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className={`text-3xl font-semibold tabular-nums tracking-tight ${c.acento ? "text-violet-soft" : ""}`}>{c.n}</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">{c.t}</p>
        </div>
      ))}
    </div>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-base font-light text-white/50">{children}</p>
  );
}

/** El mensaje que deja una acción al volver (`?aviso=`). */
export function Aviso({ aviso }: { aviso?: string }) {
  if (!aviso) return null;
  return (
    <p className="mb-7 flex items-start gap-3 rounded-2xl border border-violet/40 bg-violet/10 px-5 py-4 text-base font-light">
      <Dot color="var(--violet-soft)" className="mt-2.5 h-1.5 w-1.5" />
      {aviso}
    </p>
  );
}

/** Número de página válido a partir de lo que venga en la dirección. */
export function paginaDe(valor: string | undefined, total: number, porPagina: number): number {
  const ultima = Math.max(1, Math.ceil(total / porPagina));
  const n = Math.trunc(Number(valor ?? 1));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, ultima) : 1;
}

/**
 * Páginas de un listado. Son enlaces y no botones: con cientos de filas la
 * dirección guarda en qué página ibas, y recargar no te devuelve al inicio.
 */
export function Paginacion({
  total,
  pagina,
  porPagina,
  enlace,
}: {
  total: number;
  pagina: number;
  porPagina: number;
  enlace: (p: number) => string;
}) {
  const ultima = Math.max(1, Math.ceil(total / porPagina));
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(total, pagina * porPagina);
  // Aunque quepa en una página, se dice cuántas filas son: con un filtro
  // puesto, ese número es la respuesta que se vino a buscar.
  if (ultima <= 1) {
    return (
      <p className="mt-4 text-xs text-white/40" aria-live="polite">
        {total} {total === 1 ? "fila" : "filas"}
      </p>
    );
  }
  // Siempre la primera, la última, y una ventana de dos a cada lado.
  const vistas = [...new Set([1, ultima, pagina - 2, pagina - 1, pagina, pagina + 1, pagina + 2].filter((p) => p >= 1 && p <= ultima))].sort((a, b) => a - b);
  const clase = (activa: boolean) =>
    `min-w-9 rounded-full px-3 py-1.5 text-center text-xs tabular-nums transition-colors ${
      activa ? "bg-violet font-semibold text-white" : "border border-white/15 text-white/60 hover:border-white/35 hover:text-white"
    }`;
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Páginas">
      <p className="text-xs text-white/40">
        {desde}–{hasta} de {total}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {pagina > 1 ? (
          <a href={enlace(pagina - 1)} className={clase(false)}>
            ←
          </a>
        ) : null}
        {vistas.map((p, i) => (
          <span key={p} className="flex items-center gap-1.5">
            {i > 0 && p - vistas[i - 1] > 1 ? <span className="px-1 text-xs text-white/30">…</span> : null}
            <a href={enlace(p)} className={clase(p === pagina)} aria-current={p === pagina ? "page" : undefined}>
              {p}
            </a>
          </span>
        ))}
        {pagina < ultima ? (
          <a href={enlace(pagina + 1)} className={clase(false)}>
            →
          </a>
        ) : null}
      </div>
    </nav>
  );
}

/** Arma `?a=1&b=2` dejando fuera lo vacío y lo que es valor por defecto. */
const POR_DEFECTO: Record<string, string> = { estado: "todos", entrada: "todas", tier: "todas" };
export function consulta(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    // Solo se omite lo que es valor por defecto EN SU CLAVE: buscar la palabra
    // «todos» en el buscador tiene que viajar en los enlaces como cualquier otra.
    if (v === undefined || v === "" || POR_DEFECTO[k] === v || (k === "pagina" && Number(v) <= 1)) continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
