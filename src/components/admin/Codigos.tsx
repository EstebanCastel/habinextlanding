import { filtrarCodigos as filtrar, resumir, type CodigoConEstado, type FiltrosCodigos as Filtros } from "@/lib/codigos";
import SoltarExcel from "./SoltarExcel";
import { consulta, hora, Paginacion, Pastilla, Tarjetas, Vacio } from "./comunes";

/**
 * Códigos de invitación: a quién se le dio cada uno y quién lo usó.
 *
 * Son dos columnas distintas a propósito. «Asignado a» es lo que dice la lista
 * del equipo —a quién se le mandó— y «Quién lo usó» es lo que pasó de verdad
 * cuando alguien lo redimió. Cuando no coinciden es justamente lo que hay que
 * mirar: el código se reenvió, o la persona entró con otro correo.
 */

const ESTADOS: { id: string; texto: string }[] = [
  { id: "todos", texto: "Todos" },
  { id: "redimidos", texto: "Redimidos" },
  { id: "asignados", texto: "Asignados sin usar" },
  { id: "sin-asignar", texto: "Sin dueño" },
  { id: "desactivados", texto: "Desactivados" },
];

export const POR_PAGINA = 50;

export default function Codigos({ codigos, filtros }: { codigos: CodigoConEstado[]; filtros: Filtros }) {
  const resumen = resumir(codigos);
  const filtrados = filtrar(codigos, filtros);
  const visibles = filtrados.slice((filtros.pagina - 1) * POR_PAGINA, filtros.pagina * POR_PAGINA);
  const enlace = (cambios: Partial<Filtros>) => `/admin/codigos${consulta({ ...filtros, pagina: 1, ...cambios })}`;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Códigos de invitación</h2>
          <p className="mt-1 text-sm font-light text-white/50">Quien tiene uno entra sin pagar. Cada código es de una persona y sirve una vez.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Lo que se ve es lo que se baja: mismos filtros y misma búsqueda que la tabla. */}
          <a
            href={`/api/admin/codigos.xlsx${consulta({ estado: filtros.estado, entrada: filtros.entrada, q: filtros.q })}`}
            className="rounded-full bg-violet px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-press"
          >
            Bajar esta vista en Excel
          </a>
          <a
            href="/api/admin/codigos.xlsx"
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-light text-white/60 transition-colors hover:border-white/30 hover:text-white"
          >
            Bajar todo
          </a>
        </div>
      </div>

      <Tarjetas
        items={[
          { n: resumen.total, t: "Códigos en total" },
          { n: resumen.redimidos, t: "Ya redimidos", acento: true },
          { n: resumen.asignados - codigos.filter((c) => c.asignado && c.usos > 0).length, t: "Asignados sin usar" },
          { n: resumen.sinAsignar, t: "Sin dueño" },
          { n: `${resumen.porTier.general.redimidos} · ${resumen.porTier.vip.redimidos}`, t: "Redimidos General · VIP" },
        ]}
      />

      <SoltarExcel />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs uppercase tracking-wider text-white/35">Estado</span>
        {ESTADOS.map((e) => (
          <Pastilla key={e.id} activa={filtros.estado === e.id} href={enlace({ estado: e.id })}>
            {e.texto}
          </Pastilla>
        ))}
        <span className="ml-4 mr-1 text-xs uppercase tracking-wider text-white/35">Entrada</span>
        <Pastilla activa={filtros.entrada === "todas"} href={enlace({ entrada: "todas" })}>
          Las dos
        </Pastilla>
        <Pastilla activa={filtros.entrada === "general"} href={enlace({ entrada: "general" })}>
          General
        </Pastilla>
        <Pastilla activa={filtros.entrada === "vip"} href={enlace({ entrada: "vip" })}>
          VIP
        </Pastilla>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <form method="get" action="/admin/codigos" className="flex gap-2">
          {filtros.estado !== "todos" ? <input type="hidden" name="estado" value={filtros.estado} /> : null}
          {filtros.entrada !== "todas" ? <input type="hidden" name="entrada" value={filtros.entrada} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={filtros.q}
            placeholder="Buscar por código, nombre, correo, teléfono o grupo"
            className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors placeholder:text-white/25 focus:border-violet-soft/70 focus:outline-none"
          />
          <button type="submit" className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 transition-colors hover:border-white/35 hover:text-white">
            Buscar
          </button>
        </form>

        <form method="post" action="/api/admin" className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[1fr_auto_auto_auto]">
          <input type="hidden" name="accion" value="crear-codigo" />
          <input type="hidden" name="usos" value="1" />
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium tracking-tight text-white/50">Código suelto (vacío = se genera)</span>
            <input
              name="codigo"
              placeholder="HABI-XXXX-XXXX"
              className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 font-mono text-sm uppercase tracking-wider text-white transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:text-white/25 focus:border-violet-soft/70 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium tracking-tight text-white/50">Sirve para</span>
            <select name="sirve" defaultValue="general" className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:border-violet-soft/70 focus:outline-none">
              <option value="general">General</option>
              <option value="vip">VIP</option>
              <option value="ambos">Las dos</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium tracking-tight text-white/50">Para quién</span>
            <input
              name="nota"
              placeholder="Prensa"
              className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors placeholder:text-white/25 focus:border-violet-soft/70 focus:outline-none"
            />
          </label>
          <button type="submit" className="self-end rounded-full bg-violet px-5 py-2.5 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-violet-press">
            Crear
          </button>
        </form>
      </div>

      {filtrados.length === 0 ? (
        <Vacio>Ningún código con ese filtro.</Vacio>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[64rem] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Entrada</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Asignado a · según la lista</th>
                  <th className="px-4 py-3 font-medium">Quién lo usó</th>
                  <th className="px-4 py-3 font-medium">Cuándo</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => {
                  const usado = c.usos > 0;
                  const r = c.redenciones[0];
                  const a = c.asignado;
                  const otroCorreo = Boolean(a && r && a.email.toLowerCase() !== r.email.toLowerCase());
                  return (
                    <tr key={c.codigo} className="border-t border-white/8 align-top">
                      <td className="px-4 py-3 font-mono tracking-wider">
                        {c.codigo}
                        {c.nota ? <p className="font-sans text-xs tracking-normal text-white/40">{c.nota}</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.sirvePara === "vip" ? "bg-violet text-white" : "bg-white/10 text-white/75"}`}>
                          {c.sirvePara === "vip" ? "VIP" : c.sirvePara === "ambos" ? "Las dos" : "General"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {usado ? (
                          <span className="text-violet-soft">Redimido</span>
                        ) : !c.activo ? (
                          <span className="text-red-300/80">Desactivado</span>
                        ) : c.vencido ? (
                          <span className="text-white/40">Vencido</span>
                        ) : a ? (
                          <span className="text-white/70">Asignado</span>
                        ) : (
                          <span className="text-white/40">Sin dueño</span>
                        )}
                        {c.usosMaximos > 1 ? (
                          <span className="block text-white/35">
                            {c.usos}/{c.usosMaximos}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {a ? (
                          <>
                            <p className="text-white/85">{[a.nombre, a.apellido].filter(Boolean).join(" ") || <span className="text-white/35">(sin nombre)</span>}</p>
                            <p className="text-white/45">{a.email}</p>
                            {a.telefono ? <p className="text-white/45">+{a.telefono.replace(/^\+/, "")}</p> : null}
                            <p className="mt-1 flex flex-wrap gap-1">
                              {a.grupo ? <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70">{a.grupo}</span> : null}
                              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/40" title={`${a.archivo}${a.hoja ? ` · hoja ${a.hoja}` : ""}${a.fila ? ` · fila ${a.fila}` : ""}`}>
                                {a.hoja ?? a.archivo}
                                {a.fila ? ` · ${a.fila}` : ""}
                              </span>
                            </p>
                          </>
                        ) : (
                          <span className="text-white/25">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r ? (
                          <>
                            <p className="text-white/85">{r.nombre}</p>
                            <p className="text-white/45">{r.email}</p>
                            {otroCorreo ? <p className="mt-1 text-[10px] uppercase tracking-wider text-amber-200/80">otro correo que el asignado</p> : null}
                          </>
                        ) : (
                          <span className="text-white/25">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/50">{r ? hora(r.en) : a ? <span className="text-white/30">asignado {hora(a.asignadoEn)}</span> : "—"}</td>
                      <td className="px-4 py-3">
                        {usado ? null : (
                          <div className="flex flex-col items-start gap-1.5">
                            <form method="post" action="/api/admin">
                              <input type="hidden" name="accion" value="codigo-estado" />
                              <input type="hidden" name="codigo" value={c.codigo} />
                              <input type="hidden" name="activo" value={c.activo ? "0" : "1"} />
                              <button type="submit" className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/70 transition-colors hover:border-white/35 hover:text-white">
                                {c.activo ? "Desactivar" : "Activar"}
                              </button>
                            </form>
                            <form method="post" action="/api/admin">
                              <input type="hidden" name="accion" value="codigo-borrar" />
                              <input type="hidden" name="codigo" value={c.codigo} />
                              <button type="submit" className="px-1 text-[11px] text-white/35 underline-offset-2 hover:text-red-300 hover:underline">
                                Borrar
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Paginacion total={filtrados.length} pagina={filtros.pagina} porPagina={POR_PAGINA} enlace={(p) => `/admin/codigos${consulta({ ...filtros, pagina: p })}`} />
        </>
      )}
    </section>
  );
}
