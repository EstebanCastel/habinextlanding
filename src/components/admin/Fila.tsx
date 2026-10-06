import { CANALES, NOMBRE_CANAL } from "@/lib/recuperacion";
import type { Registro } from "@/lib/registros";
import { ETAPAS, hora, LUMA_INVITADOS } from "./comunes";

/** Todo lo que le pasó a una persona, en orden. Es el detalle que traía la hoja. */
export function Bitacora({ r }: { r: Registro }) {
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

export function Fila({ r }: { r: Registro }) {
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
