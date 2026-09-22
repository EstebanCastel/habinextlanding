import type { Metadata } from "next";
import Asterisk from "@/components/Asterisk";
import Dot from "@/components/Dot";
import { resumir as resumirCodigos, todos as todosLosCodigos, type CodigoConEstado } from "@/lib/codigos";
import { MISIONES } from "@/config/experiencia";
import {
  nivel as nivelDe,
  puntos as puntosDe,
  resumir as resumirExperiencia,
  todos as todosLosParticipantes,
  type Participante,
} from "@/lib/experiencia";
import { tablero, type Tablero } from "@/lib/embajadores";
import { destinoDe, todos as todosLosEnlaces, type Enlace } from "@/lib/enlaces";
import { lotes, resumir, type Resumen } from "@/lib/rastro";
import {
  CANALES,
  correoDe,
  cuerpoWhatsapp,
  NOMBRE_CANAL,
  pendientesDePago,
  resumirCampana,
  resumirPendientes,
  smsDe,
  ultimaCampana,
  type Campana,
} from "@/lib/recuperacion";
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
 * El A/B/C de la landing. Lo que decide es la **tasa**: qué proporción de las
 * visitas de cada versión terminó tocando boletería. Comparar los totales
 * sueltos no dice nada mientras el reparto no esté parejo.
 */
function Experimento({ r }: { r: Resumen }) {
  const conDatos = r.variantes.filter((v) => v.sesiones > 0);
  const mejor = Math.max(0, ...conDatos.map((v) => v.tasa));
  const totalVisitas = conDatos.reduce((n, v) => n + v.sesiones, 0);

  return (
    <section className="mb-10">
      <h2 className="mb-1 text-xl font-semibold tracking-tight">Las tres versiones de la página</h2>
      <p className="mb-5 max-w-3xl text-sm font-light text-white/50">
        A es la página completa, B la corta con la boletería arriba, C solo hero y precio. El
        reparto es al azar, un tercio cada una, y se guarda por visitante. Para verlas:{" "}
        <code className="text-violet-soft">?v=a</code>, <code className="text-violet-soft">?v=b</code>{" "}
        o <code className="text-violet-soft">?v=c</code> al final de la dirección.
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
      {totalVisitas > 0 && totalVisitas < 300 ? (
        <p className="mt-3 text-xs text-white/40">
          Con {totalVisitas} visitas repartidas entre tres versiones todavía no hay con qué
          decidir: una diferencia de pocos puntos a esta escala es ruido. Conviene esperar a
          tener unas cien visitas por versión antes de apagar ninguna.
        </p>
      ) : null}
    </section>
  );
}

/**
 * Códigos de invitación: crear uno y ver cuánto le queda a cada uno.
 *
 * El cupo es lo que se mira: un código sin límite que se filtró por ahí es la
 * forma más silenciosa de llenar el evento de entradas que nadie pagó, y acá
 * se ve de un vistazo cuánto lleva usado cada uno y quién lo usó.
 */
/** Filtro del listado de códigos. Es un enlace, no un botón: ver `enlace()`. */
function Pastilla({
  activa,
  href,
  children,
}: {
  activa: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`rounded-full px-4 py-2 text-sm transition-colors ${
        activa
          ? "bg-violet font-semibold text-white"
          : "border border-white/15 text-white/60 hover:border-white/35 hover:text-white"
      }`}
    >
      {children}
    </a>
  );
}

function Codigos({
  codigos,
  estado,
  entrada,
}: {
  codigos: CodigoConEstado[];
  estado: string;
  entrada: string;
}) {
  const resumen = resumirCodigos(codigos);

  const filtrados = codigos.filter((c) => {
    if (estado === "redimidos" && c.usos === 0) return false;
    if (estado === "disponibles" && c.usos > 0) return false;
    if (entrada === "vip" && c.sirvePara === "general") return false;
    if (entrada === "general" && c.sirvePara === "vip") return false;
    return true;
  });

  // Los filtros son enlaces, no botones con JavaScript: el estado vive en la
  // dirección, así que «los VIP sin redimir» se puede compartir o dejar
  // guardado en el navegador.
  const enlace = (e: string, t: string) => {
    const q = new URLSearchParams();
    if (e !== "todos") q.set("cod", e);
    if (t !== "todas") q.set("tier", t);
    return `/admin${q.toString() ? `?${q}` : ""}#codigos`;
  };

  // Con cientos de códigos, listarlos todos vuelve la página inmanejable. Del
  // listado se necesita ver los últimos redimidos o buscar uno concreto; para
  // la lista entera está la descarga.
  const TOPE = 120;
  const visibles = filtrados.slice(0, TOPE);

  return (
    <section id="codigos" className="mb-10 scroll-mt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Códigos de invitación</h2>
        <a
          href={`/api/admin/codigos.csv${estado !== "todos" ? `?estado=${estado}` : ""}`}
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-light text-white/60 transition-colors hover:border-white/30 hover:text-white"
        >
          Bajar los códigos
        </a>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { n: String(resumen.total), t: "Códigos en total" },
          { n: String(resumen.redimidos), t: "Ya redimidos", acento: true },
          { n: String(resumen.disponibles), t: "Sin usar" },
          {
            n: `${resumen.porTier.general.redimidos} · ${resumen.porTier.vip.redimidos}`,
            t: "Redimidos General · VIP",
          },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p
              className={`text-3xl font-semibold tabular-nums tracking-tight ${
                c.acento ? "text-violet-soft" : ""
              }`}
            >
              {c.n}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">
              {c.t}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs uppercase tracking-wider text-white/35">Estado</span>
        <Pastilla activa={estado === "todos"} href={enlace("todos", entrada)}>
          Todos
        </Pastilla>
        <Pastilla activa={estado === "redimidos"} href={enlace("redimidos", entrada)}>
          Redimidos
        </Pastilla>
        <Pastilla activa={estado === "disponibles"} href={enlace("disponibles", entrada)}>
          Sin usar
        </Pastilla>

        <span className="ml-4 mr-1 text-xs uppercase tracking-wider text-white/35">Entrada</span>
        <Pastilla activa={entrada === "todas"} href={enlace(estado, "todas")}>
          Las dos
        </Pastilla>
        <Pastilla activa={entrada === "general"} href={enlace(estado, "general")}>
          General
        </Pastilla>
        <Pastilla activa={entrada === "vip"} href={enlace(estado, "vip")}>
          VIP
        </Pastilla>
      </div>

      <form
        method="post"
        action="/api/admin"
        className="mb-6 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2 lg:grid-cols-5"
      >
        <input type="hidden" name="accion" value="crear-codigo" />
        <label className="flex flex-col gap-1 lg:col-span-2">
          <span className="text-xs font-medium tracking-tight text-white/50">Código nuevo</span>
          <input
            name="codigo"
            required
            placeholder="HABI-XXXX-XXXX"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 font-mono text-sm uppercase tracking-wider text-white transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:text-white/25 focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Sirve para</span>
          <select
            name="sirve"
            defaultValue="general"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors focus:border-violet-soft/70 focus:outline-none"
          >
            <option value="general">General</option>
            <option value="vip">VIP</option>
            <option value="ambos">Las dos</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Para quién</span>
          <input
            name="nota"
            placeholder="Aliados comerciales"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors placeholder:text-white/25 focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <input type="hidden" name="usos" value="1" />
        <button
          type="submit"
          className="mt-1 self-end rounded-full bg-violet px-6 py-3 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-violet-press"
        >
          Crear código
        </button>
      </form>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-base font-light text-white/50">
          Ningún código con ese filtro.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Entrada</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Quién lo usó</th>
                  <th className="px-4 py-3 font-medium">Cuándo</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => {
                  const usado = c.usos > 0;
                  const r = c.redenciones[0];
                  return (
                    <tr key={c.codigo} className="border-t border-white/8">
                      <td className="px-4 py-3 font-mono tracking-wider">{c.codigo}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            c.sirvePara === "vip" ? "bg-violet text-white" : "bg-white/10 text-white/75"
                          }`}
                        >
                          {c.sirvePara === "vip"
                            ? "VIP"
                            : c.sirvePara === "ambos"
                              ? "Las dos"
                              : "General"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {usado ? (
                          <span className="text-violet-soft">Redimido</span>
                        ) : !c.activo ? (
                          <span className="text-red-300/80">Desactivado</span>
                        ) : c.vencido ? (
                          <span className="text-white/40">Vencido</span>
                        ) : (
                          <span className="text-white/55">Sin usar</span>
                        )}
                        {c.usosMaximos > 1 ? (
                          <span className="block text-white/35">
                            {c.usos}/{c.usosMaximos}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r ? (
                          <>
                            <p className="text-white/75">{r.nombre}</p>
                            <p className="text-white/40">{r.email}</p>
                          </>
                        ) : (
                          <span className="text-white/25">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/50">{r ? hora(r.en) : "—"}</td>
                      <td className="px-4 py-3">
                        {usado ? null : (
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
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtrados.length > TOPE ? (
            <p className="mt-3 text-xs text-white/40">
              Se muestran {TOPE} de {filtrados.length}. Para la lista completa, usa{" "}
              <em className="not-italic text-white/60">Bajar los códigos</em>.
            </p>
          ) : null}
        </>
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
          <span className="text-xs font-medium tracking-tight text-white/50">Persona (opcional)</span>
          <input
            name="persona"
            placeholder="María Gómez"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors placeholder:text-white/25 focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Su correo</span>
          <input
            name="email"
            type="email"
            placeholder="maria@habi.co"
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors placeholder:text-white/25 focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Meta General</span>
          <input
            name="metaGeneral"
            type="number"
            min={0}
            defaultValue={15}
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors focus:border-violet-soft/70 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-tight text-white/50">Meta VIP</span>
          <input
            name="metaVip"
            type="number"
            min={0}
            defaultValue={5}
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

/**
 * Cuánta gente trajo cada quien. Lo que cuenta es el registro, no el clic: un
 * clic dice que compartió bien el enlace, un registro dice que la persona del
 * otro lado quiso ir.
 */
function Marcador({ t, sitio }: { t: Tablero; sitio: string }) {
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
              Registros contra la meta
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
              <th className="px-4 py-3 font-medium">Registros</th>
              <th className="px-4 py-3 font-medium">VIP</th>
              <th className="px-4 py-3 font-medium">Pagados</th>
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
                  <td className="px-4 py-3 tabular-nums">{m.pagados}</td>
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


/**
 * La experiencia del asistente: quién armó su carnet, qué misiones completó
 * y qué publicó. Es la trazabilidad de lo que la gente dijo de Habi Next en
 * redes, con el enlace a cada publicación de LinkedIn.
 */
function ExperienciaPanel({ lista, sitio }: { lista: Participante[]; sitio: string }) {
  const r = resumirExperiencia(lista);
  const TOPE = 100;
  const visibles = lista.slice(0, TOPE);
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
          {lista.length > TOPE ? (
            <p className="mt-3 text-xs text-white/40">
              Se muestran {TOPE} de {lista.length}. La lista completa está en la descarga.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}


/**
 * Recuperación de pago: a los que siguen pendientes se les vuelve a poner el
 * link de pago delante por WhatsApp, SMS y correo, con el precio que sube como
 * argumento. Primero una prueba al teléfono y correo del operador; después,
 * la campaña a todos, que corre sola y se puede continuar si se corta.
 */
function Recuperacion({ registros, campana }: { registros: Registro[]; campana: Campana | null }) {
  const p = resumirPendientes(registros);
  const pendientes = pendientesDePago(registros);
  const muestraGeneral = pendientes.find((r) => r.tier === "general") ?? pendientes[0];
  const muestraVip = pendientes.find((r) => r.tier === "vip") ?? pendientes[0];
  const rc = campana ? resumirCampana(campana) : null;
  const plantillasListas = Boolean(process.env.INFOBIP_TPL_RECUPERA_GENERAL && process.env.INFOBIP_TPL_RECUPERA_VIP);
  const boton = "rounded-full px-5 py-2.5 text-sm font-semibold tracking-tight transition-colors";

  return (
    <section id="recuperacion" className="mb-10 scroll-mt-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Recuperación de pago</h2>
          <p className="mt-1 text-sm font-light text-white/50">
            Recordatorio con el link personal de pago a quienes se registraron y no han pagado. Ni aprobados, ni
            rechazados, ni cortesías. Nunca dos veces en 48 horas.
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { n: p.total, t: "Pendientes de pago", acento: true },
          { n: p.general, t: "General" },
          { n: p.vip, t: "VIP" },
          { n: p.conCelular, t: "Con celular" },
          { n: p.conCorreo, t: "Con correo" },
          { n: p.abrieronPago, t: "Abrieron el pago" },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className={`text-3xl font-semibold tabular-nums tracking-tight ${c.acento ? "text-violet-soft" : ""}`}>{c.n}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">{c.t}</p>
          </div>
        ))}
      </div>

      {!plantillasListas ? (
        <p className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-400/[0.08] px-5 py-4 text-sm font-light text-amber-100">
          Las plantillas de WhatsApp del recordatorio todavía no están configuradas (INFOBIP_TPL_RECUPERA_GENERAL /
          INFOBIP_TPL_RECUPERA_VIP). SMS y correo sí se pueden mandar.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Probar */}
        <form method="post" action="/api/admin" className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <input type="hidden" name="accion" value="recuperar-probar" />
          <div>
            <p className="text-base font-semibold tracking-tight">1 · Mandarme una prueba</p>
            <p className="mt-1 text-sm font-light text-white/50">
              Llega a {process.env.WHATSAPP_ESCALAMIENTO ? `+${process.env.WHATSAPP_ESCALAMIENTO.replace(/\D/g, "")}` : "el número de escalamiento"} y a{" "}
              {process.env.CAMPANA_REPLY_TO || "el correo de respuestas"}, con los datos de un pendiente real.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="tier" value="general" defaultChecked className="accent-violet" /> General
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="tier" value="vip" className="accent-violet" /> VIP
            </label>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {CANALES.map((c) => (
              <label key={c} className="flex items-center gap-2">
                <input type="checkbox" name="canal" value={c} defaultChecked className="accent-violet" /> {NOMBRE_CANAL[c]}
              </label>
            ))}
          </div>
          <button type="submit" className={`${boton} self-start border border-white/20 text-white hover:border-white/45 hover:bg-white/5`}>
            Mandarme la prueba
          </button>
        </form>

        {/* Enviar */}
        <form method="post" action="/api/admin" className="flex flex-col gap-4 rounded-2xl border border-violet/40 bg-violet/[0.07] p-5">
          <input type="hidden" name="accion" value="recuperar-enviar" />
          <div>
            <p className="text-base font-semibold tracking-tight">2 · Enviar a los {p.total} pendientes</p>
            <p className="mt-1 text-sm font-light text-white/50">
              Corre solo, de a tres personas a la vez, y se puede continuar si se corta. Cada envío queda en la historia de la
              persona.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {CANALES.map((c) => (
              <label key={c} className="flex items-center gap-2">
                <input type="checkbox" name="canal" value={c} defaultChecked className="accent-violet" /> {NOMBRE_CANAL[c]}
              </label>
            ))}
          </div>
          <label className="flex items-start gap-2 text-sm text-white/70">
            <input type="checkbox" name="seguro" value="1" className="mt-1 accent-violet" />
            Sí, mandar el recordatorio ahora a {p.total} personas.
          </label>
          <button type="submit" className={`${boton} self-start bg-violet text-white hover:bg-violet-press`}>
            Enviar recordatorio
          </button>
        </form>
      </div>

      {campana && rc ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-semibold">Última campaña</span> · {hora(campana.creadaEn)} · {campana.canales.map((c) => NOMBRE_CANAL[c]).join(", ")} ·{" "}
              <span className="tabular-nums">
                {rc.hechos}/{rc.total}
              </span>{" "}
              {rc.terminada ? "· terminada" : "· en curso"}
            </p>
            {!rc.terminada ? (
              <form method="post" action="/api/admin">
                <input type="hidden" name="accion" value="recuperar-continuar" />
                <input type="hidden" name="campana" value={campana.id} />
                <button type="submit" className={`${boton} border border-white/20 text-white hover:border-white/45`}>
                  Continuar
                </button>
              </form>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {CANALES.filter((c) => campana.canales.includes(c)).map((c) => (
              <p key={c} className="text-sm text-white/60">
                <span className="font-medium text-white/85">{NOMBRE_CANAL[c]}</span> · {rc.porCanal[c].ok} enviados · {rc.porCanal[c].fallo} fallaron ·{" "}
                {rc.porCanal[c].omitido} omitidos
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {/* Lo que reciben */}
      <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <summary className="cursor-pointer text-sm font-semibold tracking-tight">Ver los mensajes tal como salen</summary>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">WhatsApp · General</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/recupera-general.jpg" alt="" className="mb-2 w-full rounded-xl" />
              <pre className="whitespace-pre-wrap rounded-xl bg-white/[0.04] p-4 font-sans text-sm leading-relaxed text-white/80">{cuerpoWhatsapp("general")}</pre>
              <p className="mt-1 text-xs text-white/40">Botones: Ya pagué · Quiero pasar a VIP · Tengo una duda</p>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">WhatsApp · VIP</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/recupera-vip.jpg" alt="" className="mb-2 w-full rounded-xl" />
              <pre className="whitespace-pre-wrap rounded-xl bg-white/[0.04] p-4 font-sans text-sm leading-relaxed text-white/80">{cuerpoWhatsapp("vip")}</pre>
              <p className="mt-1 text-xs text-white/40">Botones: Ya pagué · Tengo una duda</p>
            </div>
            {muestraGeneral ? (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">SMS · ejemplo real</p>
                <pre className="whitespace-pre-wrap rounded-xl bg-white/[0.04] p-4 font-sans text-sm leading-relaxed text-white/80">{smsDe(muestraGeneral)}</pre>
                <p className="mt-1 text-xs text-white/40">{smsDe(muestraGeneral).length} caracteres · remitente numérico de Infobip</p>
              </div>
            ) : null}
          </div>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">
              Correo · {muestraVip && muestraVip.tier === "vip" ? "VIP" : "General"} · ejemplo real
            </p>
            {muestraVip ? (
              <>
                <p className="mb-2 text-sm text-white/70">Asunto: {correoDe(muestraVip).asunto}</p>
                <div
                  className="overflow-hidden rounded-xl bg-[#ece2fa]"
                  dangerouslySetInnerHTML={{ __html: correoDe(muestraVip).html.replace(/^[\s\S]*?<body[^>]*>/, "").replace(/<\/body>[\s\S]*$/, "") }}
                />
              </>
            ) : (
              <p className="text-sm text-white/40">Sin pendientes para armar el ejemplo.</p>
            )}
          </div>
        </div>
      </details>
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
        {r.luma.cedula ? (
          <p className="text-xs tabular-nums text-white/45">CC {r.luma.cedula}</p>
        ) : null}
        {r.luma.empresa ? <p className="text-xs text-white/35">{r.luma.empresa}</p> : null}
        {r.via === "compra" ? <p className="text-xs text-violet-soft">Compró desde la landing{r.luma.guestId ? "" : " · sin Luma todavía"}</p> : null}
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
        {r.recordatorio?.ultimoEn ? (
          <div className="mt-2 border-t border-white/10 pt-2">
            <p className="text-violet-soft">Recordatorio {hora(r.recordatorio.ultimoEn)}{(r.recordatorio.veces ?? 0) > 1 ? ` ×${r.recordatorio.veces}` : ""}</p>
            {CANALES.filter((c) => r.recordatorio?.[c]).map((c) => {
              const e = r.recordatorio![c]!;
              const estado = e.error
                ? `falló: ${e.error}`
                : e.clicEn
                  ? "abrió el link"
                  : e.leidoEn
                    ? "leído"
                    : e.abiertoEn
                      ? "abierto"
                      : e.entregadoEn
                        ? "entregado"
                        : e.enviadoEn
                          ? "enviado"
                          : "—";
              return (
                <p key={c} className={e.error ? "text-red-400" : "text-white/40"}>
                  {NOMBRE_CANAL[c]} {estado}
                </p>
              );
            })}
          </div>
        ) : null}
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
              {r.confirmacion?.enviadaEn ? (
                <span className="mt-1 block text-violet-soft">
                  Confirmación {hora(r.confirmacion.enviadaEn)}
                  {CANALES.filter((c) => r.confirmacion?.[c]).map((c) => {
                    const e = r.confirmacion![c]!;
                    return (
                      <span key={c} className={`block ${e.error ? "text-red-400" : "text-white/40"}`}>
                        {NOMBRE_CANAL[c]} {e.error ? `falló: ${e.error}` : e.clicEn ? "abrió el link" : e.leidoEn ? "leído" : e.abiertoEn ? "abierto" : e.entregadoEn ? "entregado" : "enviado"}
                      </span>
                    );
                  })}
                </span>
              ) : r.etapa === "aprobado" && r.via === "compra" ? (
                <form method="post" action="/api/admin" className="mt-2">
                  <input type="hidden" name="accion" value="confirmar-entrada" />
                  <input type="hidden" name="token" value={r.token} />
                  <button type="submit" className="w-full rounded-full border border-white/15 px-3 py-2 text-xs text-white/70 transition-colors hover:border-white/35 hover:text-white">
                    Mandar confirmación
                  </button>
                </form>
              ) : null}
            </p>
          ) : !r.luma.guestId ? (
            <>
              {/* Compró desde la landing y todavía no está en Luma: el alta se hace desde acá, ya aprobada. */}
              <form method="post" action="/api/admin" className="flex flex-col gap-1.5">
                <input type="hidden" name="accion" value="alta-luma" />
                <input type="hidden" name="token" value={r.token} />
                {r.etapa !== "pago_confirmado" ? (
                  <label className="flex items-start gap-2 text-[11px] leading-snug text-white/55">
                    <input type="checkbox" name="verificado" value="1" required className="mt-0.5 accent-violet" />
                    Vi el pago en Wompi
                  </label>
                ) : null}
                <button
                  type="submit"
                  className={`w-full rounded-full px-3 py-2 text-xs font-semibold ${r.etapa === "pago_confirmado" ? "bg-violet text-white" : "border border-violet/40 text-violet-soft hover:bg-violet/15"}`}
                >
                  Dar de alta en Luma
                </button>
              </form>
              <form method="post" action="/api/admin">
                <input type="hidden" name="accion" value="reenviar" />
                <input type="hidden" name="token" value={r.token} />
                <button type="submit" className="w-full rounded-full border border-white/15 px-3 py-2 text-xs text-white/70 transition-colors hover:border-white/35 hover:text-white">
                  Reenviar link de pago
                </button>
              </form>
            </>
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
  searchParams: Promise<{ aviso?: string; error?: string; cod?: string; tier?: string }>;
}) {
  const { aviso, error, cod, tier } = await searchParams;
  const estadoCodigos = cod === "redimidos" || cod === "disponibles" ? cod : "todos";
  const entradaCodigos = tier === "vip" || tier === "general" ? tier : "todas";

  if (!(await haySesion())) return <Entrar error={error === "1"} />;

  const [registros, codigos, rastro] = await Promise.all([
    todos().catch(() => [] as Registro[]),
    todosLosCodigos().catch(() => [] as CodigoConEstado[]),
    lotes().catch(() => []),
  ]);
  const [enlaces, marcador, participantes, campana] = await Promise.all([
    todosLosEnlaces().catch(() => [] as Enlace[]),
    tablero().catch(() => null),
    todosLosParticipantes().catch(() => [] as Participante[]),
    ultimaCampana().catch(() => null),
  ]);
  const trafico = resumir(rastro);
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
  const pendientes = registros.filter(
    (r) => (r.etapa === "comprobante_recibido" || r.etapa === "pago_confirmado") && r.luma.guestId
  );
  // Pagaron desde la landing y esperan su alta en Luma: el trabajo diario.
  const porDarDeAlta = registros.filter((r) => !r.luma.guestId && r.etapa === "pago_confirmado");
  const fueronAPagar = registros.filter((r) => !r.luma.guestId && r.etapa === "por_pagar");

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

      {porDarDeAlta.length > 0 || fueronAPagar.length > 0 ? (
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet/40 bg-violet/10 px-5 py-4">
          <p className="text-base font-light">
            {porDarDeAlta.length > 0 ? (
              <>
                <strong className="font-semibold">{porDarDeAlta.length}</strong> {porDarDeAlta.length === 1 ? "persona pagó" : "personas pagaron"} desde la landing y{" "}
                {porDarDeAlta.length === 1 ? "espera" : "esperan"} su alta en Luma.{" "}
              </>
            ) : null}
            {fueronAPagar.length > 0 ? (
              <span className="text-white/60">
                {fueronAPagar.length} {fueronAPagar.length === 1 ? "fue" : "fueron"} a pagar y Wompi no ha confirmado: si el pago aparece en Wompi, dales de alta desde su fila.
              </span>
            ) : null}
          </p>
          {porDarDeAlta.length > 0 ? (
            <form method="post" action="/api/admin">
              <input type="hidden" name="accion" value="alta-luma-pagados" />
              <button type="submit" className="rounded-full bg-violet px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-press">
                Dar de alta a {porDarDeAlta.length === 1 ? "esa persona" : `las ${porDarDeAlta.length}`} y confirmarles
              </button>
            </form>
          ) : null}
        </div>
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

      <Experimento r={trafico} />

      <Trafico r={trafico} />

      {marcador ? <Marcador t={marcador} sitio={sitio} /> : null}

      <Enlaces enlaces={enlaces} sitio={sitio} />

      <Codigos codigos={codigos} estado={estadoCodigos} entrada={entradaCodigos} />

      <ExperienciaPanel lista={participantes} sitio={sitio} />

      <Recuperacion registros={registros} campana={campana} />

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
