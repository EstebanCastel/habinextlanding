import type { Metadata } from "next";
import { todos as todosLosCodigos, type CodigoConEstado } from "@/lib/codigos";
import { todos, type Etapa, type Registro } from "@/lib/registros";
import { haySesion } from "@/lib/sesion";

/**
 * Panel de operación de la boletería: la trazabilidad completa de cada persona
 * en una sola pantalla, desde que se registra en Luma hasta que tiene su
 * entrada. Reemplaza a la hoja de cálculo que había antes — todo lo que se
 * miraba allí se mira acá, sin desfase y sin un espejo que mantener.
 *
 * Lo que no está acá es aprobar: eso se hace en Luma, que es donde está la
 * lista de invitados. El panel muestra a quién le toca y lleva directo.
 *
 * Está fuera de los buscadores y detrás de una clave. No se cachea nunca: una
 * versión vieja de esta página haría que alguien decida mirando datos de hace
 * cinco minutos.
 */

export const metadata: Metadata = {
  title: "Operación · Habi Next",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ETAPAS: { id: Etapa; texto: string }[] = [
  { id: "registrado", texto: "Registrado" },
  { id: "mensaje_enviado", texto: "WhatsApp enviado" },
  { id: "mensaje_entregado", texto: "Entregado" },
  { id: "mensaje_leido", texto: "Leído" },
  { id: "pago_abierto", texto: "Abrió el pago" },
  { id: "comprobante_recibido", texto: "Mandó comprobante" },
  { id: "pago_confirmado", texto: "Pago confirmado" },
  { id: "aprobado", texto: "Aprobado" },
];

const LUMA_INVITADOS: Record<string, string> = {
  general: "https://luma.com/habinext-general",
  vip: "https://luma.com/habinext-vip",
};

function hora(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Entrar({ error }: { error: boolean }) {
  return (
    <main className="min-h-dvh grid place-items-center px-6">
      <form
        method="post"
        action="/api/admin"
        className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#0d0618] p-8"
      >
        <input type="hidden" name="accion" value="entrar" />
        <h1 className="text-xl font-semibold text-violet-soft">Operación Habi Next</h1>
        <p className="mt-2 mb-6 text-sm text-white/55">
          Boletería del 20 de octubre. Necesitas la clave del equipo.
        </p>
        <input
          type="password"
          name="clave"
          autoComplete="current-password"
          required
          placeholder="Clave"
          className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/30"
        />
        {error ? <p className="mt-3 text-sm text-red-400">Esa clave no es.</p> : null}
        <button
          type="submit"
          className="mt-5 w-full rounded-full bg-violet px-6 py-3 font-semibold text-white"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}

function Embudo({ registros }: { registros: Registro[] }) {
  const vivos = registros.filter((r) => r.etapa !== "rechazado");
  const total = vivos.length;
  const orden = ETAPAS.map((e) => e.id);
  // Conteo acumulado: quien pagó también pasó por "le llegó el mensaje".
  // Contar solo la etapa actual dejaría el embudo lleno de huecos.
  const conteo = ETAPAS.map((etapa, i) => ({
    ...etapa,
    n: vivos.filter((r) => orden.indexOf(r.etapa) >= i).length,
  }));

  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {conteo.map((e) => (
        <div key={e.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-2xl font-semibold tabular-nums">{e.n}</p>
          <p className="text-xs uppercase tracking-wide text-white/45">{e.texto}</p>
          {total > 0 ? (
            <p className="mt-1 text-xs text-violet-soft tabular-nums">
              {Math.round((e.n / total) * 100)}%
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}

/** Todo lo que le pasó a una persona, en orden. Es el detalle que traía la hoja. */
function Bitacora({ r }: { r: Registro }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-white/40 hover:text-white/70">
        Historia ({r.bitacora.length})
      </summary>
      <ol className="mt-1 border-l border-white/10 pl-3">
        {r.bitacora.map((b, i) => (
          <li key={i} className="text-xs text-white/50">
            <span className="text-white/35">{hora(b.en)}</span> · {b.que}
            {b.detalle ? <span className="text-white/35"> — {b.detalle}</span> : null}
          </li>
        ))}
      </ol>
    </details>
  );
}

/**
 * Códigos de invitación: crear uno y ver cuánto le queda a cada uno.
 *
 * El cupo es lo que se mira: un código sin límite que se filtró por ahí es la
 * forma más silenciosa de llenar el evento de entradas que nadie pagó, y acá
 * se ve de un vistazo cuánto lleva usado cada uno y quién lo usó.
 */
function Codigos({ codigos }: { codigos: CodigoConEstado[] }) {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-semibold">Códigos de invitación</h2>

      <form
        method="post"
        action="/api/admin"
        className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <input type="hidden" name="accion" value="crear-codigo" />
        <label className="flex flex-col gap-1 lg:col-span-2">
          <span className="text-xs text-white/45">Código</span>
          <input
            name="codigo"
            required
            placeholder="HABINEXT-ALIADOS"
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm uppercase text-white placeholder:text-white/25"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-white/45">Sirve para</span>
          <select
            name="sirve"
            defaultValue="ambos"
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="ambos">Las dos</option>
            <option value="general">Solo General</option>
            <option value="vip">Solo VIP</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-white/45">Entradas (0 = sin tope)</span>
          <input
            name="usos"
            type="number"
            min={0}
            defaultValue={1}
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-white/45">Vence (opcional)</span>
          <input
            name="vence"
            type="date"
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-white/45">Para quién</span>
          <input
            name="nota"
            placeholder="Aliados comerciales"
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/25"
          />
        </label>
        <button
          type="submit"
          className="self-end rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white sm:col-span-2 lg:col-span-6"
        >
          Crear código
        </button>
      </form>

      {codigos.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/50">
          Todavía no hay códigos.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/45">
              <tr>
                <th className="px-3 py-3 font-medium">Código</th>
                <th className="px-3 py-3 font-medium">Sirve para</th>
                <th className="px-3 py-3 font-medium">Usado</th>
                <th className="px-3 py-3 font-medium">Vence</th>
                <th className="px-3 py-3 font-medium">Quiénes lo usaron</th>
                <th className="px-3 py-3 font-medium">Link para repartir</th>
                <th className="px-3 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {codigos.map((c) => {
                return (
                  <tr key={c.codigo} className="border-t border-white/8 align-top">
                    <td className="px-3 py-3">
                      <p className="font-mono font-medium tracking-wider">{c.codigo}</p>
                      {c.nota ? <p className="text-xs text-white/40">{c.nota}</p> : null}
                      {!c.activo ? (
                        <p className="text-xs text-red-400">desactivado</p>
                      ) : c.agotado ? (
                        <p className="text-xs text-white/40">sin cupo</p>
                      ) : c.vencido ? (
                        <p className="text-xs text-white/40">vencido</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-xs text-white/60">
                      {c.sirvePara === "ambos" ? "Las dos" : c.sirvePara === "vip" ? "VIP" : "General"}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {c.usos}
                      {c.usosMaximos > 0 ? ` / ${c.usosMaximos}` : " · sin tope"}
                    </td>
                    <td className="px-3 py-3 text-xs text-white/50">
                      {c.venceEl ? hora(c.venceEl) : "no vence"}
                    </td>
                    <td className="px-3 py-3 text-xs text-white/50">
                      {c.redenciones.length === 0
                        ? "—"
                        : c.redenciones.map((r) => (
                            <p key={r.token}>
                              {r.nombre} · {r.email}{" "}
                              <span className="text-white/30">
                                ({r.tier === "vip" ? "VIP" : "General"}, {hora(r.en)})
                              </span>
                            </p>
                          ))}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <code className="text-violet-soft">
                        {sitio}/codigo?tier=
                        {c.sirvePara === "vip" ? "vip" : "general"}&amp;codigo={c.codigo}
                      </code>
                    </td>
                    <td className="px-3 py-3">
                      <form method="post" action="/api/admin">
                        <input type="hidden" name="accion" value="codigo-estado" />
                        <input type="hidden" name="codigo" value={c.codigo} />
                        <input type="hidden" name="activo" value={c.activo ? "0" : "1"} />
                        <button
                          type="submit"
                          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70"
                        >
                          {c.activo ? "Desactivar" : "Activar"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Fila({ r }: { r: Registro }) {
  const decidido = r.etapa === "aprobado" || r.etapa === "rechazado";
  const leToca = r.etapa === "comprobante_recibido" || r.etapa === "pago_confirmado";

  return (
    <tr className={`border-t border-white/8 align-top ${leToca ? "bg-violet/[0.07]" : ""}`}>
      <td className="px-3 py-3">
        <p className="font-medium">{r.luma.nombre || "(sin nombre)"}</p>
        <p className="text-xs text-white/45">{r.luma.email}</p>
        <p className="text-xs text-white/45">{r.telefono ? `+${r.telefono}` : "sin celular ⚠"}</p>
        {r.luma.empresa ? <p className="text-xs text-white/35">{r.luma.empresa}</p> : null}
        <Bitacora r={r} />
      </td>
      <td className="px-3 py-3">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            r.tier === "vip" ? "bg-violet text-white" : "bg-white/10 text-white/80"
          }`}
        >
          {r.tier === "vip" ? "VIP" : "General"}
        </span>
        <p className="mt-1 text-xs text-white/45">{r.pago.precio}</p>
        <p className="text-xs text-white/35">{r.pago.etiquetaEtapa}</p>
        {r.cortesia ? (
          <p className="mt-1 font-mono text-xs text-violet-soft">{r.cortesia.codigo}</p>
        ) : null}
        {r.upsell?.decision === "vip" ? (
          <p className="mt-1 text-xs text-violet-soft">subió desde General</p>
        ) : null}
        {r.tier === "general" && r.upsell?.ofrecidoEn ? (
          <p className="mt-1 text-xs text-white/35">se le ofreció VIP</p>
        ) : null}
      </td>
      <td className="px-3 py-3 text-xs">
        <p className={leToca ? "font-semibold text-violet-soft" : ""}>
          {ETAPAS.find((e) => e.id === r.etapa)?.texto ?? r.etapa}
        </p>
        <p className="text-white/40">Registro {hora(r.luma.registradoEn)}</p>
        <p className="text-white/40">WhatsApp {hora(r.whatsapp.enviadoEn)}</p>
        <p className="text-white/40">Entregado {hora(r.whatsapp.entregadoEn)}</p>
        <p className="text-white/40">Leído {hora(r.whatsapp.leidoEn)}</p>
        <p className="text-white/40">Abrió pago {hora(r.pago.abiertoEn)}</p>
        <p className="text-white/40">Pago {hora(r.pago.confirmadoEn)}</p>
        {r.whatsapp.error ? <p className="text-red-400">{r.whatsapp.error}</p> : null}
      </td>
      <td className="px-3 py-3 text-xs">
        {r.pago.comprobantes.length === 0 ? (
          <span className="text-white/35">—</span>
        ) : (
          r.pago.comprobantes.map((c, i) => (
            <p key={i}>
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-violet-soft underline"
                >
                  Ver {c.tipo.toLowerCase()} · {hora(c.en)}
                </a>
              ) : (
                <span className="text-white/60">
                  {c.tipo} · {hora(c.en)}
                </span>
              )}
              {c.texto ? <span className="block text-white/40">{c.texto}</span> : null}
            </p>
          ))
        )}
        {r.pago.referencia ? (
          <p className="mt-1 text-white/35">Ref. {r.pago.referencia}</p>
        ) : null}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1.5">
          {decidido ? (
            <p className="text-xs text-white/50">
              {r.etapa === "aprobado" ? "Entrada enviada" : "Rechazado"}
              <span className="block text-white/35">{hora(r.aprobacion.decididoEn)}</span>
            </p>
          ) : (
            <>
              <a
                href={LUMA_INVITADOS[r.tier]}
                target="_blank"
                rel="noreferrer noopener"
                className={`rounded-full px-3 py-1.5 text-center text-xs font-semibold ${
                  leToca ? "bg-violet text-white" : "border border-white/15 text-white/70"
                }`}
              >
                {leToca ? "Aprobar en Luma →" : "Ver en Luma"}
              </a>
              <form method="post" action="/api/admin">
                <input type="hidden" name="accion" value="reenviar" />
                <input type="hidden" name="token" value={r.token} />
                <button
                  type="submit"
                  className="w-full rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70"
                >
                  Reenviar WhatsApp
                </button>
              </form>
              {r.tier === "general" ? (
                <form method="post" action="/api/admin">
                  <input type="hidden" name="accion" value="pasar-a-vip" />
                  <input type="hidden" name="token" value={r.token} />
                  <button
                    type="submit"
                    className="w-full rounded-full border border-violet/40 px-3 py-1.5 text-xs text-violet-soft"
                  >
                    Pasar a VIP
                  </button>
                </form>
              ) : null}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; error?: string }>;
}) {
  const { aviso, error } = await searchParams;

  if (!(await haySesion())) return <Entrar error={error === "1"} />;

  const [registros, codigos] = await Promise.all([
    todos().catch(() => [] as Registro[]),
    todosLosCodigos().catch(() => [] as CodigoConEstado[]),
  ]);
  const pendientes = registros.filter(
    (r) => r.etapa === "comprobante_recibido" || r.etapa === "pago_confirmado"
  );

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Boletería Habi Next</h1>
          <p className="text-sm text-white/50">
            {registros.length} {registros.length === 1 ? "registro" : "registros"} · martes 20 de
            octubre
          </p>
        </div>
        <form method="post" action="/api/admin">
          <input type="hidden" name="accion" value="salir" />
          <button
            type="submit"
            className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/70"
          >
            Salir
          </button>
        </form>
      </header>

      {aviso ? (
        <p className="mb-6 rounded-lg border border-violet/40 bg-violet/10 px-4 py-3 text-sm">
          {aviso}
        </p>
      ) : null}

      {pendientes.length > 0 ? (
        <p className="mb-6 rounded-lg border border-violet/40 bg-violet/10 px-4 py-3 text-sm">
          <strong>{pendientes.length}</strong>{" "}
          {pendientes.length === 1 ? "persona pagó y espera" : "personas pagaron y esperan"} su
          entrada. Se aprueban en Luma:{" "}
          <a href={LUMA_INVITADOS.general} target="_blank" rel="noreferrer noopener" className="underline">
            invitados de General
          </a>{" "}
          ·{" "}
          <a href={LUMA_INVITADOS.vip} target="_blank" rel="noreferrer noopener" className="underline">
            invitados de VIP
          </a>
        </p>
      ) : null}

      <Codigos codigos={codigos} />

      <h2 className="mb-4 text-lg font-semibold">Embudo</h2>
      <Embudo registros={registros} />

      {registros.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/50">
          Todavía no hay registros. Aparecen acá apenas alguien se inscriba en Luma.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[70rem] text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/45">
              <tr>
                <th className="px-3 py-3 font-medium">Persona</th>
                <th className="px-3 py-3 font-medium">Entrada</th>
                <th className="px-3 py-3 font-medium">Dónde va</th>
                <th className="px-3 py-3 font-medium">Comprobante</th>
                <th className="px-3 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <Fila key={r.token} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
