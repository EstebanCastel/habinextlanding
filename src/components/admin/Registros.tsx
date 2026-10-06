import { pendientesDePago } from "@/lib/recuperacion";
import type { Registro } from "@/lib/registros";
import { Fila } from "./Fila";
import { consulta, Paginacion, Pastilla, Vacio } from "./comunes";

/**
 * Todas las personas, con filtros y por páginas. Lo que se busca acá es a
 * alguien concreto —«¿qué pasó con la de Habi Credit?»— o un grupo —«los que
 * pagaron y faltan por dar de alta»—, no leer de corrido.
 */

export type FiltrosRegistros = { estado: string; tier: string; q: string; pagina: number };

const ESTADOS: { id: string; texto: string }[] = [
  { id: "todos", texto: "Todos" },
  { id: "por-atender", texto: "Por atender" },
  { id: "pendientes", texto: "Sin pagar" },
  { id: "aprobados", texto: "Aprobados" },
  { id: "cortesias", texto: "Con código" },
  { id: "rechazados", texto: "Rechazados" },
];

const llano = (t: unknown) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filtrarRegistros(registros: Registro[], f: FiltrosRegistros): Registro[] {
  const q = llano(f.q).trim();
  const pendientes = f.estado === "pendientes" ? new Set(pendientesDePago(registros).map((r) => r.token)) : null;
  return registros.filter((r) => {
    if (f.estado === "por-atender") {
      const leToca = (r.etapa === "comprobante_recibido" || r.etapa === "pago_confirmado") && Boolean(r.luma.guestId);
      const porDarDeAlta = !r.luma.guestId && (r.etapa === "pago_confirmado" || r.etapa === "por_pagar");
      if (!leToca && !porDarDeAlta) return false;
    }
    if (pendientes && !pendientes.has(r.token)) return false;
    if (f.estado === "aprobados" && r.etapa !== "aprobado") return false;
    if (f.estado === "cortesias" && !r.cortesia) return false;
    if (f.estado === "rechazados" && r.etapa !== "rechazado") return false;
    if (f.tier !== "todas" && r.tier !== f.tier) return false;
    if (q) {
      const pajar = llano([r.luma.nombre, r.luma.email, r.telefono, r.luma.cedula, r.luma.empresa, r.token, r.cortesia?.codigo, r.pago.referencia].join(" "));
      if (!pajar.includes(q)) return false;
    }
    return true;
  });
}

export const POR_PAGINA = 25;

export default function Registros({ registros, filtros }: { registros: Registro[]; filtros: FiltrosRegistros }) {
  const filtrados = filtrarRegistros(registros, filtros);
  const visibles = filtrados.slice((filtros.pagina - 1) * POR_PAGINA, filtros.pagina * POR_PAGINA);
  const enlace = (cambios: Partial<FiltrosRegistros>) => `/admin/registros${consulta({ ...filtros, pagina: 1, ...cambios })}`;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Registros</h2>
          <p className="mt-1 text-sm font-light text-white/50">
            {registros.length} personas · lo que le pasó a cada una desde que se inscribió hasta que tiene su entrada.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs uppercase tracking-wider text-white/35">Estado</span>
        {ESTADOS.map((e) => (
          <Pastilla key={e.id} activa={filtros.estado === e.id} href={enlace({ estado: e.id })}>
            {e.texto}
          </Pastilla>
        ))}
        <span className="ml-4 mr-1 text-xs uppercase tracking-wider text-white/35">Entrada</span>
        <Pastilla activa={filtros.tier === "todas"} href={enlace({ tier: "todas" })}>
          Las dos
        </Pastilla>
        <Pastilla activa={filtros.tier === "general"} href={enlace({ tier: "general" })}>
          General
        </Pastilla>
        <Pastilla activa={filtros.tier === "vip"} href={enlace({ tier: "vip" })}>
          VIP
        </Pastilla>
      </div>

      <form method="get" action="/admin/registros" className="mb-6 flex max-w-2xl gap-2">
        {filtros.estado !== "todos" ? <input type="hidden" name="estado" value={filtros.estado} /> : null}
        {filtros.tier !== "todas" ? <input type="hidden" name="tier" value={filtros.tier} /> : null}
        <input
          type="search"
          name="q"
          defaultValue={filtros.q}
          placeholder="Buscar por nombre, correo, celular, cédula, código o referencia"
          className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-colors placeholder:text-white/25 focus:border-violet-soft/70 focus:outline-none"
        />
        <button type="submit" className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 transition-colors hover:border-white/35 hover:text-white">
          Buscar
        </button>
      </form>

      {filtrados.length === 0 ? (
        <Vacio>{registros.length === 0 ? "Todavía no hay registros. Aparecen acá apenas alguien se inscriba en Luma." : "Nadie con ese filtro."}</Vacio>
      ) : (
        <>
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
                {visibles.map((r) => (
                  <Fila key={r.token} r={r} />
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion total={filtrados.length} pagina={filtros.pagina} porPagina={POR_PAGINA} enlace={(p) => `/admin/registros${consulta({ ...filtros, pagina: p })}`} />
        </>
      )}
    </section>
  );
}
