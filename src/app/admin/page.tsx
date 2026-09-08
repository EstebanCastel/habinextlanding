import type { Metadata } from "next";
import { todos, type Etapa, type Registro } from "@/lib/registros";
import { haySesion } from "@/lib/sesion";

/**
 * Panel de operación de la boletería. Es la pantalla donde alguien del equipo
 * ve, persona por persona, en qué punto va: si le llegó el WhatsApp, si abrió
 * el pago, si mandó comprobante, y desde ahí aprueba o rechaza.
 *
 * Está fuera de los buscadores y detrás de una clave. No se cachea nunca: una
 * versión vieja de esta página haría que alguien apruebe mirando datos de hace
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
  const total = registros.length;
  // Cuenta acumulada: quien llegó a "pagó" también pasó por "le llegó el
  // mensaje". Contar solo la etapa actual haría ver el embudo lleno de huecos.
  const orden = ETAPAS.map((e) => e.id);
  const conteo = ETAPAS.map((etapa, i) => ({
    ...etapa,
    n: registros.filter((r) => orden.indexOf(r.etapa) >= i && r.etapa !== "rechazado").length,
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

function Fila({ r }: { r: Registro }) {
  const pendiente = r.etapa !== "aprobado" && r.etapa !== "rechazado";
  const listoParaAprobar = r.etapa === "comprobante_recibido" || r.etapa === "pago_confirmado";

  return (
    <tr className="border-t border-white/8 align-top">
      <td className="px-3 py-3">
        <p className="font-medium">{r.luma.nombre || "(sin nombre)"}</p>
        <p className="text-xs text-white/45">{r.luma.email}</p>
        <p className="text-xs text-white/45">{r.telefono ? `+${r.telefono}` : "sin celular ⚠"}</p>
        {r.luma.empresa ? <p className="text-xs text-white/35">{r.luma.empresa}</p> : null}
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
      </td>
      <td className="px-3 py-3 text-xs">
        <p className={listoParaAprobar ? "font-semibold text-violet-soft" : ""}>
          {ETAPAS.find((e) => e.id === r.etapa)?.texto ?? r.etapa}
        </p>
        <p className="text-white/40">Registro {hora(r.luma.registradoEn)}</p>
        <p className="text-white/40">WhatsApp {hora(r.whatsapp.enviadoEn)}</p>
        {r.whatsapp.error ? <p className="text-red-400">{r.whatsapp.error}</p> : null}
        <p className="text-white/40">Abrió pago {hora(r.pago.abiertoEn)}</p>
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
                  {c.tipo} · {hora(c.en)}
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
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1.5">
          {pendiente ? (
            <>
              <form method="post" action="/api/admin">
                <input type="hidden" name="accion" value="aprobar" />
                <input type="hidden" name="token" value={r.token} />
                <button
                  type="submit"
                  className={`w-full rounded-full px-3 py-1.5 text-xs font-semibold ${
                    listoParaAprobar ? "bg-violet text-white" : "bg-white/10 text-white/70"
                  }`}
                >
                  Aprobar y enviar entrada
                </button>
              </form>
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
              <form method="post" action="/api/admin">
                <input type="hidden" name="accion" value="rechazar" />
                <input type="hidden" name="token" value={r.token} />
                <button
                  type="submit"
                  className="w-full rounded-full border border-red-500/30 px-3 py-1.5 text-xs text-red-300/80"
                >
                  Rechazar
                </button>
              </form>
            </>
          ) : (
            <p className="text-xs text-white/50">
              {r.etapa === "aprobado" ? "Entrada enviada" : "Rechazado"}
              <span className="block text-white/35">{hora(r.aprobacion.decididoEn)}</span>
              <span className="block text-white/35">{r.aprobacion.decididoPor}</span>
            </p>
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

  const registros = await todos().catch(() => [] as Registro[]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Boletería Habi Next</h1>
          <p className="text-sm text-white/50">
            {registros.length} {registros.length === 1 ? "registro" : "registros"} · martes 20 de
            octubre
          </p>
        </div>
        <div className="flex gap-2">
          <form method="post" action="/api/admin">
            <input type="hidden" name="accion" value="resincronizar" />
            <button
              type="submit"
              className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/70"
            >
              Reconstruir la hoja
            </button>
          </form>
          <form method="post" action="/api/admin">
            <input type="hidden" name="accion" value="salir" />
            <button
              type="submit"
              className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/70"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      {aviso ? (
        <p className="mb-6 rounded-lg border border-violet/40 bg-violet/10 px-4 py-3 text-sm">
          {aviso}
        </p>
      ) : null}

      <Embudo registros={registros} />

      {registros.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/50">
          Todavía no hay registros. Aparecen acá apenas alguien se inscriba en Luma.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[64rem] text-left text-sm">
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
