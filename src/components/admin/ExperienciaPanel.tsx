import { MISIONES } from "@/config/experiencia";
import { nivel as nivelDe, puntos as puntosDe, resumir as resumirExperiencia, type Participante } from "@/lib/experiencia";
import { hora, Paginacion } from "./comunes";

/**
 * La experiencia del asistente: quién armó su carnet, qué misiones completó
 * y qué publicó. Es la trazabilidad de lo que la gente dijo de Habi Next en
 * redes, con el enlace a cada publicación de LinkedIn.
 */
export default function ExperienciaPanel({ lista, sitio, pagina }: { lista: Participante[]; sitio: string; pagina: number }) {
  const r = resumirExperiencia(lista);
  const POR_PAGINA = 50;
  const visibles = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const pct = (n: number) => (r.participantes ? Math.round((n / r.participantes) * 100) : 0);

  return (
    <section id="experiencia" className="mb-10 scroll-mt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">La experiencia</h2>
          <p className="mt-1 text-sm font-light text-white/50">
            Carnets, misiones y publicaciones desde{" "}
            <a href={`${sitio}/experiencia`} target="_blank" rel="noreferrer noopener" className="underline">
              /experiencia
            </a>
            . Para ver las misiones del día del evento antes de tiempo:{" "}
            <a href={`${sitio}/experiencia?fase=evento`} target="_blank" rel="noreferrer noopener" className="underline">
              ?fase=evento
            </a>
            .
          </p>
        </div>
        <a
          href="/api/admin/experiencia.csv"
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-light text-white/60 transition-colors hover:border-white/30 hover:text-white"
        >
          Bajar la experiencia
        </a>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { n: r.participantes, t: "Participantes" },
          { n: r.carnets, t: "Carnets" },
          { n: r.publicacionesLinkedIn, t: "Publicaciones LinkedIn", acento: true },
          { n: r.compartidosInstagram + r.pruebas, t: "Instagram y pruebas" },
          { n: r.paradas, t: "Paradas del mapa" },
          { n: r.rutasCompletas, t: "Rutas completas" },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className={`text-3xl font-semibold tabular-nums tracking-tight ${c.acento ? "text-violet-soft" : ""}`}>{c.n}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">{c.t}</p>
          </div>
        ))}
      </div>

      {r.participantes > 0 ? (
        <div className="mb-6 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2 lg:grid-cols-4">
          {MISIONES.map((m) => (
            <div key={m.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-white/70">{m.titulo}</span>
                <span className="shrink-0 tabular-nums text-white/50">
                  {r.porMision[m.id]} · {pct(r.porMision[m.id])}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-violet" style={{ width: `${pct(r.porMision[m.id])}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {lista.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-base font-light text-white/50">
          Nadie ha armado su carnet todavía.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[64rem] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Persona</th>
                  <th className="px-4 py-3 font-medium">Entrada</th>
                  <th className="px-4 py-3 font-medium">Misiones</th>
                  <th className="px-4 py-3 font-medium">Puntos</th>
                  <th className="px-4 py-3 font-medium">Publicó</th>
                  <th className="px-4 py-3 font-medium">Mapa</th>
                  <th className="px-4 py-3 font-medium">Fotos</th>
                  <th className="px-4 py-3 font-medium">Invitación</th>
                  <th className="px-4 py-3 font-medium">Último movimiento</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => {
                  const li = p.publicaciones.filter((x) => x.red === "linkedin");
                  const ig = p.publicaciones.filter((x) => x.red === "instagram").length;
                  return (
                    <tr key={p.id} className="border-t border-white/8 align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white/85">
                          {[p.nombre, p.apellido].filter(Boolean).join(" ") || p.linkedin?.nombre || <span className="text-white/35">Sin nombre</span>}
                        </p>
                        <p className="text-xs text-white/40">{p.email ?? "—"}</p>
                        {p.linkedin ? <p className="text-xs text-violet-soft">LinkedIn conectado</p> : null}
                        {p.credencial ? (
                          <form method="post" action="/api/admin" className="mt-1">
                            <input type="hidden" name="accion" value="experiencia-reset-clave" />
                            <input type="hidden" name="id" value={p.id} />
                            <button type="submit" className="text-xs text-white/40 underline hover:text-white">
                              Restablecer cédula
                            </button>
                          </form>
                        ) : null}
                        {p.carnet ? (
                          <a href={`${sitio}/c/${p.id}`} target="_blank" rel="noreferrer noopener" className="text-xs text-white/40 underline">
                            Ver carnet
                          </a>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/60">
                        {p.registro ? `${p.registro.tier === "vip" ? "VIP" : "General"} · ${p.registro.etapa}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {MISIONES.map((m) => (
                            <span
                              key={m.id}
                              title={`${m.titulo}${p.misiones[m.id] ? ` · ${hora(p.misiones[m.id]!.en)}` : ""}`}
                              className={`h-2.5 w-2.5 rounded-full ${p.misiones[m.id] ? "bg-violet" : "bg-white/12"}`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {puntosDe(p)} <span className="text-xs text-white/40">{nivelDe(p)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {li.length ? (
                          <ul className="flex flex-col gap-0.5">
                            {li.map((x, i) =>
                              x.url ? (
                                <li key={i}>
                                  <a href={x.url} target="_blank" rel="noreferrer noopener" className="text-violet-soft underline">
                                    LinkedIn {hora(x.en)}
                                  </a>
                                </li>
                              ) : (
                                <li key={i} className="text-white/60">LinkedIn {hora(x.en)}</li>
                              )
                            )}
                          </ul>
                        ) : null}
                        {ig ? <p className="text-white/60">Instagram ×{ig}</p> : null}
                        {!li.length && !ig ? <span className="text-white/25">—</span> : null}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {Object.keys(p.mapa?.paradas ?? {}).length ? (
                          <>
                            <p className="tabular-nums text-white/70">{Object.keys(p.mapa?.paradas ?? {}).length} paradas</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {Object.entries(p.mapa?.paradas ?? {}).map(([id, h]) => (
                                <a key={id} href={`/api/admin/experiencia/foto?id=${p.id}&f=${encodeURIComponent(h.fotoId)}`} target="_blank" rel="noreferrer noopener" title={`${id} · ${h.distanciaM !== undefined ? `${h.distanciaM} m` : "sin ubicación"}`} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70 underline">
                                  {id}
                                </a>
                              ))}
                            </div>
                          </>
                        ) : (
                          <span className="text-white/25">—</span>
                        )}
                        {p.fotos.filter((f) => f.clase === "prueba").length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.fotos.filter((f) => f.clase === "prueba").map((f) => (
                              <a key={f.id} href={`/api/admin/experiencia/foto?id=${p.id}&f=${encodeURIComponent(f.id)}`} target="_blank" rel="noreferrer noopener" className="rounded bg-violet/30 px-1.5 py-0.5 text-[10px] text-violet-soft underline">
                                prueba · {f.de}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-white/60">{p.fotos.filter((f) => f.clase === "foto").length}</td>
                      <td className="px-4 py-3 tabular-nums text-white/60">
                        {p.invitacion.clics ? `${p.invitacion.clics} ${p.invitacion.clics === 1 ? "clic" : "clics"}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/50">{hora(p.actualizadoEn)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Paginacion total={lista.length} pagina={pagina} porPagina={POR_PAGINA} enlace={(p) => `/admin/experiencia?pagina=${p}`} />
        </>
      )}
    </section>
  );
}
