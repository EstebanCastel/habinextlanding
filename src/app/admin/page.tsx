import Embudo from "@/components/admin/Embudo";
import { Fila } from "@/components/admin/Fila";
import { Aviso, LUMA_INVITADOS, Tarjetas } from "@/components/admin/comunes";
import { resumir as resumirCodigos, todos as todosLosCodigos, type CodigoConEstado } from "@/lib/codigos";
import { pendientesDePago } from "@/lib/recuperacion";
import { todos, type Registro } from "@/lib/registros";
import { haySesion } from "@/lib/sesion";
import { redirect } from "next/navigation";

/**
 * La portada del panel: lo que hay que atender hoy, las cuentas grandes y los
 * últimos movimientos. Cada asunto tiene su página; esta junta lo urgente.
 */

export const dynamic = "force-dynamic";

export default async function Hoy({ searchParams }: { searchParams: Promise<{ aviso?: string; cod?: string; tier?: string }> }) {
  const { aviso, cod, tier } = await searchParams;
  // Los marcadores del panel viejo (/admin?cod=redimidos&tier=vip#codigos) siguen llegando a alguna parte.
  if (cod || tier) {
    const q = new URLSearchParams();
    if (cod === "redimidos") q.set("estado", "redimidos");
    if (cod === "disponibles") q.set("estado", "sin-asignar");
    if (tier === "vip" || tier === "general") q.set("entrada", tier);
    redirect(`/admin/codigos${q.toString() ? `?${q}` : ""}`);
  }
  if (!(await haySesion())) return null;

  const [registros, codigos] = await Promise.all([
    todos().catch(() => [] as Registro[]),
    todosLosCodigos().catch(() => [] as CodigoConEstado[]),
  ]);

  const pendientes = registros.filter((r) => (r.etapa === "comprobante_recibido" || r.etapa === "pago_confirmado") && r.luma.guestId);
  // Pagaron desde la landing y esperan su alta en Luma: el trabajo diario.
  const porDarDeAlta = registros.filter((r) => !r.luma.guestId && r.etapa === "pago_confirmado");
  const fueronAPagar = registros.filter((r) => !r.luma.guestId && r.etapa === "por_pagar");

  const pagados = registros.filter((r) => (r.pago.confirmadoEn || r.etapa === "aprobado") && !r.cortesia).length;
  const cortesias = registros.filter((r) => r.cortesia).length;
  const sinPagar = pendientesDePago(registros).length;
  const rc = resumirCodigos(codigos);
  const ultimos = [...registros]
    .sort((a, b) => (b.actualizadoEn ?? b.creadoEn).localeCompare(a.actualizadoEn ?? a.creadoEn))
    .slice(0, 10);

  return (
    <>
      <Aviso aviso={aviso} />

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
                {fueronAPagar.length} {fueronAPagar.length === 1 ? "fue" : "fueron"} a pagar y Wompi no ha confirmado: si el pago aparece en Wompi, dales de alta desde su fila en{" "}
                <a href="/admin/registros?estado=por-atender" className="underline">
                  Registros
                </a>
                .
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
          <strong className="font-semibold">{pendientes.length}</strong> {pendientes.length === 1 ? "persona pagó y espera" : "personas pagaron y esperan"} su entrada. Se aprueban en
          Luma:{" "}
          <a href={LUMA_INVITADOS.general} target="_blank" rel="noreferrer noopener" className="underline">
            invitados de General
          </a>{" "}
          ·{" "}
          <a href={LUMA_INVITADOS.vip} target="_blank" rel="noreferrer noopener" className="underline">
            invitados de VIP
          </a>
        </p>
      ) : null}

      <Tarjetas
        items={[
          { n: registros.length, t: "Registros" },
          { n: pagados, t: "Pagados con plata", acento: true },
          { n: cortesias, t: "Entraron con código" },
          { n: sinPagar, t: "Sin pagar" },
          { n: `${rc.asignados} · ${rc.redimidos}`, t: "Códigos asignados · redimidos" },
          { n: rc.sinAsignar, t: "Códigos sin dueño" },
        ]}
      />

      <h2 className="mb-4 text-xl font-semibold tracking-tight">El embudo</h2>
      <Embudo registros={registros} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Últimos movimientos</h2>
        <a href="/admin/registros" className="text-sm text-violet-soft underline-offset-2 hover:underline">
          Ver todos los registros →
        </a>
      </div>
      {ultimos.length === 0 ? (
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
              {ultimos.map((r) => (
                <Fila key={r.token} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
