import type { Metadata } from "next";
import Asterisk from "@/components/Asterisk";
import Dot from "@/components/Dot";
import { todos as todosLosCodigos, type CodigoConEstado } from "@/lib/codigos";
import { destinoDe, todos as todosLosEnlaces, type Enlace } from "@/lib/enlaces";
import { lotes, resumir, type Resumen } from "@/lib/rastro";
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
    <main className="s-night relative grid min-h-dvh place-items-center overflow-hidden px-6">
      <Asterisk
        color="var(--violet)"
        className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 opacity-[0.07]"
      />
      <form method="post" action="/api/admin" className="relative z-10 w-full max-w-sm">
        <input type="hidden" name="accion" value="entrar" />
        <p className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
          <Dot className="h-1.5 w-1.5" />
          Operación
        </p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">Boletería Habi Next</h1>
        <p className="mt-3 mb-8 text-base font-light text-white/55">
          Necesitas la clave del equipo.
        </p>
        <input
          type="password"
          name="clave"
          autoComplete="current-password"
          required
          placeholder="Clave"
          className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-4 text-lg text-white placeholder:text-white/25 transition-colors focus:border-violet-soft/70 focus:bg-white/[0.07] focus:outline-none"
        />
        {error ? (
          <p className="mt-4 text-base font-light text-red-300">Esa clave no es.</p>
        ) : null}
        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-violet px-8 py-4 text-lg font-semibold tracking-tight text-white shadow-[0_18px_44px_-14px_rgba(128,46,246,0.9)] transition-colors hover:bg-violet-press"
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
      <h2 className="mb-5 text-xl font-semibold tracking-tight">Códigos de invitación</h2>

      <form
        method="post"
        action="/api/admin"
        className="mb-6 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2 lg:grid-cols-6"
      >
        <input type="hidden" name="accion" value="crear-codigo" />
        <label className="flex flex-col gap-1 lg:col-span-2">
          <span className="text-xs font-medium tracking-tight text-white/50">Código</span>
          <input
            name="codigo"
            required
            placeholder="HABINEXT-ALIADOS"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 font-mono text-sm uppercase tracking-wider text-white transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:text-white/25 focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Sirve para</span>
          <select
            name="sirve"
            defaultValue="ambos"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors focus:border-violet-soft/70 focus:outline-none"
          >
            <option value="ambos">Las dos</option>
            <option value="general">Solo General</option>
            <option value="vip">Solo VIP</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Entradas (0 = sin tope)</span>
          <input
            name="usos"
            type="number"
            min={0}
            defaultValue={1}
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Vence (opcional)</span>
          <input
            name="vence"
            type="date"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Para quién</span>
          <input
            name="nota"
            placeholder="Aliados comerciales"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors placeholder:text-white/25 focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="mt-1 self-end rounded-full bg-violet px-6 py-3 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-violet-press sm:col-span-2 lg:col-span-6"
        >
          Crear código
        </button>
      </form>

      {codigos.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-base font-light text-white/50">
          Todavía no hay códigos. Crea uno arriba y compártelo con tus invitados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
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
                          className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/70 transition-colors hover:border-white/35 hover:text-white"
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

/**
 * De dónde llega la gente y qué hace. Se cuenta por sesión, no por evento:
 * quien recarga cinco veces no son cinco visitas.
 */
function Trafico({ r }: { r: Resumen }) {
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

/**
 * Enlaces cortos para publicar en redes. Lo que se mira es la distancia entre
 * los clics de aquí y las visitas de la tabla de arriba: si mucha gente toca el
 * link de Instagram y pocos aparecen como visita, el problema no es el mensaje
 * sino que la página tarda en abrir dentro de esa app.
 */
function Enlaces({ enlaces, sitio }: { enlaces: Enlace[]; sitio: string }) {
  const corto = (e: Enlace) => `${sitio.replace(/^https?:\/\//, "")}/l/${e.slug}`;

  return (
    <section className="mb-10">
      <h2 className="mb-5 text-xl font-semibold tracking-tight">Enlaces para redes</h2>

      <form
        method="post"
        action="/api/admin"
        className="mb-6 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2 lg:grid-cols-6"
      >
        <input type="hidden" name="accion" value="crear-enlace" />
        <input type="hidden" name="destino" value="/" />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Nombre corto</span>
          <input
            name="slug"
            required
            placeholder="li"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 font-mono text-sm text-white transition-colors placeholder:font-sans placeholder:text-white/25 focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Fuente</span>
          <input
            name="source"
            required
            placeholder="linkedin"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors placeholder:text-white/25 focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Medio</span>
          <input
            name="medium"
            defaultValue="social"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Campaña</span>
          <input
            name="campaign"
            defaultValue="habinext-2026"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Pieza</span>
          <input
            name="content"
            placeholder="post-organico"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors placeholder:text-white/25 focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="mt-1 self-end rounded-full bg-violet px-6 py-3 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-violet-press"
        >
          Crear enlace
        </button>
      </form>

      {enlaces.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-base font-light text-white/50">
          Todavía no hay enlaces.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/45">
              <tr>
                <th className="px-4 py-3 font-medium">Enlace corto</th>
                <th className="px-4 py-3 font-medium">Clics</th>
                <th className="px-4 py-3 font-medium">Último</th>
                <th className="px-4 py-3 font-medium">A dónde lleva</th>
              </tr>
            </thead>
            <tbody>
              {enlaces.map((e) => (
                <tr key={e.slug} className="border-t border-white/8 align-top">
                  <td className="px-4 py-3">
                    <p className="font-mono text-base text-violet-soft">{corto(e)}</p>
                    {e.nota ? <p className="text-xs text-white/40">{e.nota}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-lg font-semibold tabular-nums">{e.clics}</td>
                  <td className="px-4 py-3 text-xs text-white/50">{hora(e.ultimoClic)}</td>
                  <td className="px-4 py-3 text-xs break-all text-white/45">
                    {destinoDe(e, sitio)}
                  </td>
                </tr>
              ))}
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
                  className="w-full rounded-full border border-white/15 px-3 py-2 text-xs text-white/70 transition-colors hover:border-white/35 hover:text-white"
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
                    className="w-full rounded-full border border-violet/40 px-3 py-2 text-xs text-violet-soft transition-colors hover:bg-violet/15"
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

  const [registros, codigos, rastro] = await Promise.all([
    todos().catch(() => [] as Registro[]),
    todosLosCodigos().catch(() => [] as CodigoConEstado[]),
    lotes().catch(() => []),
  ]);
  const enlaces = await todosLosEnlaces().catch(() => [] as Enlace[]);
  const trafico = resumir(rastro);
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
  const pendientes = registros.filter(
    (r) => r.etapa === "comprobante_recibido" || r.etapa === "pago_confirmado"
  );

  return (
    <main className="s-night mx-auto min-h-dvh max-w-[92rem] px-5 py-12 md:px-8">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
            <Dot className="h-1.5 w-1.5" />
            Operación
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Boletería Habi Next</h1>
          <p className="mt-2 text-base font-light text-white/50">
            {registros.length} {registros.length === 1 ? "registro" : "registros"} · martes 20 de
            octubre
          </p>
        </div>
        <form method="post" action="/api/admin">
          <input type="hidden" name="accion" value="salir" />
          <button
            type="submit"
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-light text-white/60 transition-colors hover:border-white/30 hover:text-white"
          >
            Salir
          </button>
        </form>
      </header>

      {aviso ? (
        <p className="mb-7 flex items-start gap-3 rounded-2xl border border-violet/40 bg-violet/10 px-5 py-4 text-base font-light">
          <Dot color="var(--violet-soft)" className="mt-2.5 h-1.5 w-1.5" />
          {aviso}
        </p>
      ) : null}

      {pendientes.length > 0 ? (
        <p className="mb-7 rounded-2xl border border-violet/40 bg-violet/10 px-5 py-4 text-base font-light">
          <strong className="font-semibold">{pendientes.length}</strong>{" "}
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

      <Trafico r={trafico} />

      <Enlaces enlaces={enlaces} sitio={sitio} />

      <Codigos codigos={codigos} />

      <h2 className="mb-5 text-xl font-semibold tracking-tight">El embudo</h2>
      <Embudo registros={registros} />

      {registros.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-base font-light text-white/50">
          Todavía no hay registros. Aparecen acá apenas alguien se inscriba en Luma.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
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
