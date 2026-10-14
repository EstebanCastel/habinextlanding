import type { Registro } from "@/lib/registros";
import { ETAPAS } from "./comunes";

export default function Embudo({ registros }: { registros: Registro[] }) {
  const vivos = registros.filter((r) => r.etapa !== "rechazado");
  const total = vivos.length;
  const orden = ETAPAS.map((e) => e.id);
  // Conteo acumulado: quien pagó también pasó por "le llegó el mensaje".
  // Contar solo la etapa actual dejaría el embudo lleno de huecos.
  const conteo = ETAPAS.map((etapa, i) => ({
    ...etapa,
    // La última etapa cuenta entradas reales: quien figura aprobado pero no
    // tiene invitado en Luma no tiene entrada, y contarlo acá era lo que hacía
    // que el embudo cerrara por encima de lo que muestra Luma.
    n: vivos.filter((r) => orden.indexOf(r.etapa) >= i && (etapa.id !== "aprobado" || Boolean(r.luma.guestId))).length,
  }));

  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {conteo.map((e) => (
        <div key={e.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{e.n}</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">
            {e.texto}
          </p>
          {total > 0 ? (
            <p className="mt-2 text-sm tabular-nums text-violet-soft">
              {Math.round((e.n / total) * 100)}%
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
