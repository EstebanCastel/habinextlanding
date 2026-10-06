import { CANALES, correoDe, cuerpoWhatsapp, NOMBRE_CANAL, pendientesDePago, resumirCampana, resumirPendientes, smsDe, type Campana } from "@/lib/recuperacion";
import type { Registro } from "@/lib/registros";
import { hora } from "./comunes";

/**
 * Recuperación de pago: a los que siguen pendientes se les vuelve a poner el
 * link de pago delante por WhatsApp, SMS y correo, con el precio que sube como
 * argumento. Primero una prueba al teléfono y correo del operador; después,
 * la campaña a todos, que corre sola y se puede continuar si se corta.
 */
export default function Recuperacion({ registros, campana }: { registros: Registro[]; campana: Campana | null }) {
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
