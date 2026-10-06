import type { Resumen } from "@/lib/rastro";

/**
 * De dónde llega la gente y qué hace. Se cuenta por sesión, no por evento:
 * quien recarga cinco veces no son cinco visitas.
 */
export default function Trafico({ r }: { r: Resumen }) {
  const pct = (n: number) => (r.sesiones ? Math.round((n / r.sesiones) * 100) : 0);
  const minutos = `${Math.floor(r.segundosMediana / 60)}:${String(r.segundosMediana % 60).padStart(2, "0")}`;

  return (
    <section className="mb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">De dónde llega la gente</h2>
        <a
          href="/api/admin/rastro.csv"
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-light text-white/60 transition-colors hover:border-white/30 hover:text-white"
        >
          Bajar a Excel
        </a>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { n: r.visitantes, t: "Personas" },
          { n: r.sesiones, t: "Visitas" },
          { n: `${pct(r.profundidad.hasta75)}%`, t: "Llegó al 75%" },
          { n: minutos, t: "Se quedó (mediana)" },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-3xl font-semibold tabular-nums tracking-tight">{c.n}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">
              {c.t}
            </p>
          </div>
        ))}
      </div>

      {r.sesiones === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-base font-light text-white/50">
          Todavía no hay visitas registradas.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="overflow-x-auto rounded-2xl border border-white/10 lg:col-span-2">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Fuente</th>
                  <th className="px-4 py-3 font-medium">Visitas</th>
                  <th className="px-4 py-3 font-medium">Personas</th>
                  <th className="px-4 py-3 font-medium">Clics a boletería</th>
                </tr>
              </thead>
              <tbody>
                {r.porFuente.map((f) => (
                  <tr key={f.nombre} className="border-t border-white/8">
                    <td className="px-4 py-3 font-medium">{f.nombre}</td>
                    <td className="px-4 py-3 tabular-nums">{f.sesiones}</td>
                    <td className="px-4 py-3 tabular-nums text-white/60">{f.visitantes}</td>
                    <td className="px-4 py-3 tabular-nums text-violet-soft">{f.clicsBoleteria}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-white/10 p-5">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">
                Aparato
              </p>
              {r.porDispositivo.map((d) => (
                <p key={d.nombre} className="flex justify-between py-1 text-sm">
                  <span className="capitalize text-white/70">{d.nombre}</span>
                  <span className="tabular-nums">{d.sesiones}</span>
                </p>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 p-5">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">
                País
              </p>
              {r.porPais.slice(0, 6).map((p) => (
                <p key={p.nombre} className="flex justify-between py-1 text-sm">
                  <span className="text-white/70">{p.nombre}</span>
                  <span className="tabular-nums">{p.sesiones}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {r.clics.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 p-5">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">
            Qué tocan
          </p>
          <div className="flex flex-wrap gap-2">
            {r.clics.slice(0, 12).map((c) => (
              <span
                key={c.nombre}
                className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/70"
              >
                {c.nombre} <span className="tabular-nums text-violet-soft">{c.veces}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
