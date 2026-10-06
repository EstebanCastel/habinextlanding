import { destinoDe, type Enlace } from "@/lib/enlaces";
import { hora } from "./comunes";

/**
 * Enlaces cortos para publicar en redes. Lo que se mira es la distancia entre
 * los clics de aquí y las visitas de la tabla de arriba: si mucha gente toca el
 * link de Instagram y pocos aparecen como visita, el problema no es el mensaje
 * sino que la página tarda en abrir dentro de esa app.
 */
export default function Enlaces({ enlaces, sitio }: { enlaces: Enlace[]; sitio: string }) {
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
