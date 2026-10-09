import type { Tablero } from "@/lib/embajadores";

/**
 * Cuánta gente trajo cada quien. Lo que cuenta es el registro, no el clic: un
 * clic dice que compartió bien el enlace, un registro dice que la persona del
 * otro lado quiso ir.
 */
export default function Marcador({ t, sitio }: { t: Tablero; sitio: string }) {
  const conMeta = t.marcadores.filter((m) => m.avance !== null);
  if (t.marcadores.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Quién está trayendo gente</h2>
        <a
          href="/api/admin/embajadores.csv"
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-light text-white/60 transition-colors hover:border-white/30 hover:text-white"
        >
          Bajar la planilla
        </a>
      </div>

      {conMeta.length > 0 ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-3xl font-semibold tabular-nums tracking-tight">
              {t.traidosTotal}
              <span className="text-lg text-white/35"> / {t.metaTotal}</span>
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">
              Entradas contra la meta
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-3xl font-semibold tabular-nums tracking-tight">
              {t.metaTotal > 0 ? Math.round((t.traidosTotal / t.metaTotal) * 100) : 0}%
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">
              Avance del equipo
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-white/60">
              {t.sinAtribuir}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">
              Sin enlace conocido
            </p>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[54rem] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/45">
            <tr>
              <th className="px-4 py-3 font-medium">Quién</th>
              <th className="px-4 py-3 font-medium">Avance</th>
              <th className="px-4 py-3 font-medium" title="Tocaron su enlace">Clics</th>
              <th className="px-4 py-3 font-medium" title="Llegaron a la landing">Visitas</th>
              <th className="px-4 py-3 font-medium" title="Tocaron un botón de boletería">A boletería</th>
              <th className="px-4 py-3 font-medium" title="Entradas efectivas: código redimido o pago aprobado">Entradas</th>
              <th className="px-4 py-3 font-medium">VIP</th>
              <th className="px-4 py-3 font-medium" title="Se registraron por este enlace y siguen sin pagar; no suman">Pendientes</th>
            </tr>
          </thead>
          <tbody>
            {t.marcadores.map((m) => {
              return (
                <tr key={m.enlace.slug} className="border-t border-white/8">
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.quien}</p>
                    <p className="font-mono text-xs text-violet-soft">
                      {sitio.replace(/^https?:\/\//, "")}/l/{m.enlace.slug}
                    </p>
                    {m.enlace.persona?.email ? (
                      <p className="text-xs text-white/35">{m.enlace.persona.email}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3" style={{ minWidth: "11rem" }}>
                    {m.avance === null ? (
                      <span className="text-xs text-white/35">sin meta</span>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-[10px] uppercase tracking-wider text-white/40">
                            Gral
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, m.avanceGeneral ?? 0)}%`,
                                background: (m.avanceGeneral ?? 0) >= 100 ? "#7ddba4" : "#ba9dfa",
                              }}
                            />
                          </div>
                          <span className="w-12 text-right text-[11px] tabular-nums text-white/55">
                            {m.general}/{m.enlace.metas?.general ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-[10px] uppercase tracking-wider text-white/40">
                            VIP
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, m.avanceVip ?? 0)}%`,
                                background: (m.avanceVip ?? 0) >= 100 ? "#7ddba4" : "#802ef6",
                              }}
                            />
                          </div>
                          <span className="w-12 text-right text-[11px] tabular-nums text-white/55">
                            {m.vip}/{m.enlace.metas?.vip ?? 0}
                          </span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-white/45">{m.enlace.clics}</td>
                  <td className="px-4 py-3 tabular-nums text-white/60">{m.visitas}</td>
                  <td className="px-4 py-3 tabular-nums text-white/60">{m.clicsBoleteria}</td>
                  <td className="px-4 py-3 text-lg font-semibold tabular-nums">{m.registros}</td>
                  <td className="px-4 py-3 tabular-nums text-violet-soft">{m.vip}</td>
                  <td className="px-4 py-3 tabular-nums">{m.pendientes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-xs leading-relaxed text-white/40">
        Las columnas son el recorrido completo: tocaron su enlace → llegaron a la landing →
        tocaron boletería → se registraron en Luma. La meta se mide contra los registros, que
        es lo único que significa que alguien quiso ir. Si alguien tiene muchos clics y pocas
        visitas, el enlace se está compartiendo pero no se abre; si tiene muchas visitas y
        pocos registros, la gente mira y no se inscribe.
      </p>
    </section>
  );
}
