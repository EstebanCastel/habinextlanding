import type { Resumen } from "@/lib/rastro";

/**
 * El A/B/C de la landing. Lo que decide es la **tasa**: qué proporción de las
 * visitas de cada versión terminó tocando boletería. Comparar los totales
 * sueltos no dice nada mientras el reparto no esté parejo.
 */
export default function Experimento({ r }: { r: Resumen }) {
  const conDatos = r.variantes.filter((v) => v.sesiones > 0);
  const mejor = Math.max(0, ...conDatos.map((v) => v.tasa));
  const totalVisitas = conDatos.reduce((n, v) => n + v.sesiones, 0);

  return (
    <section className="mb-10">
      <h2 className="mb-1 text-xl font-semibold tracking-tight">Las tres versiones de la página</h2>
      <p className="mb-5 text-sm font-light leading-relaxed text-white/50">
        A era la página completa, B la corta con la boletería arriba y C solo hero y precio. Desde el 23 de
        septiembre todos ven la A; ?v=b y ?v=c siguen abriendo las otras dos para revisarlas.
      </p>

      {totalVisitas === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-base font-light text-white/50">
          Todavía no hay visitas con versión asignada. Aparecen apenas alguien entre.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {r.variantes.map((v) => {
            const gana = v.tasa === mejor && v.tasa > 0 && conDatos.length > 1;
            return (
              <div
                key={v.id}
                className={`rounded-2xl border p-5 ${
                  gana ? "border-violet/50 bg-violet/[0.08]" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">
                  {v.nombre}
                </p>
                <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight">
                  {v.tasa}%
                </p>
                <p className="text-xs text-white/45">de sus visitas tocó boletería</p>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, v.tasa)}%`,
                      background: gana ? "#7ddba4" : "var(--color-violet)",
                    }}
                  />
                </div>

                <div className="mt-4 flex flex-col gap-1 text-xs text-white/50">
                  <p className="flex justify-between">
                    <span>Visitas</span>
                    <span className="tabular-nums text-white/75">{v.sesiones}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Tocaron boletería</span>
                    <span className="tabular-nums text-white/75">{v.aBoleteria}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Llegaron al 75%</span>
                    <span className="tabular-nums text-white/75">{v.hasta75}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Se quedaron</span>
                    <span className="tabular-nums text-white/75">{v.segundos}s</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-white/40">
        Prueba cerrada el 23 de septiembre: todo el mundo ve la A, la completa, que fue la que más visitas
        llevó a boletería. Las cifras quedan como historia; ?v=b y ?v=c siguen mostrando las otras dos.
      </p>
    </section>
  );
}
