import { listarInvitados, type InvitadoLuma } from "./luma";
import { todos as todosLosRegistros, type Registro } from "./registros";
import { todos as todosLosParticipantes } from "./experiencia";
import type { Celda } from "./xlsx";

/**
 * La tabla de registros de Luma para la hoja del equipo: todos los invitados
 * de los dos eventos (General y VIP), con su estado en Luma y lo que el
 * sistema sabe de cada uno (etapa, pago, código, de dónde llegó, carnet).
 * Se arma en vivo desde Luma y el almacén; la hoja la refresca un Apps
 * Script cada pocos minutos.
 */

export const CABECERA_LUMA = [
  "Evento",
  "Estado en Luma",
  "Nombre",
  "Correo",
  "Celular",
  "Registrado en Luma (Bogotá)",
  "Llegó por (utm_source)",
  "Etapa en habinext",
  "Pago",
  "Código redimido",
  "Origen de la invitación",
  "Carnet",
  "Experiencia (entró)",
];

const ESTADOS: Record<string, string> = {
  approved: "Aprobado",
  pending_approval: "Pendiente de aprobación",
  declined: "Rechazado",
  invited: "Invitado (sin registrar)",
  waitlist: "En lista de espera",
};

function enBogota(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d).replace(",", "");
}

export type TablaLuma = {
  filas: Celda[][];
  resumen: { general: Record<string, number>; vip: Record<string, number>; total: number };
};

export async function tablaLuma(): Promise<TablaLuma> {
  const general = process.env.LUMA_EVENT_GENERAL;
  const vip = process.env.LUMA_EVENT_VIP;
  if (!general || !vip) throw new Error("faltan LUMA_EVENT_GENERAL o LUMA_EVENT_VIP");

  const [invG, invV, registros, participantes] = await Promise.all([
    listarInvitados(general),
    listarInvitados(vip),
    todosLosRegistros().catch(() => [] as Registro[]),
    todosLosParticipantes().catch(() => []),
  ]);

  // El registro más reciente por correo (una persona puede tener varios: General y luego VIP).
  const porCorreo = new Map<string, Registro>();
  for (const r of registros) {
    const k = (r.luma.email ?? "").trim().toLowerCase();
    if (!k) continue;
    const previo = porCorreo.get(k);
    if (!previo || r.creadoEn > previo.creadoEn) porCorreo.set(k, r);
  }
  const participantePorCorreo = new Map(participantes.map((p) => [(p.email ?? "").toLowerCase(), p] as const));

  const fila = (evento: "General" | "VIP", g: InvitadoLuma): Celda[] => {
    const r = porCorreo.get(g.email);
    const p = participantePorCorreo.get(g.email);
    return [
      evento,
      ESTADOS[g.estado] ?? g.estado,
      g.nombre,
      g.email,
      g.telefono ?? r?.telefono ?? "",
      enBogota(g.registradoEn),
      g.utmSource || r?.luma.origen || "",
      r?.etapa ?? "",
      r ? `${r.pago?.etiquetaEtapa ?? ""} ${r.pago?.precio ?? ""}`.trim() : "",
      r?.cortesia?.codigo ?? "",
      r?.luma.origen ?? "",
      p?.carnet ? "Sí" : "",
      p ? "Sí" : "",
    ];
  };

  const conteo = (lista: InvitadoLuma[]) => {
    const c: Record<string, number> = {};
    for (const g of lista) c[ESTADOS[g.estado] ?? g.estado] = (c[ESTADOS[g.estado] ?? g.estado] ?? 0) + 1;
    return c;
  };
  const orden = (a: InvitadoLuma, b: InvitadoLuma) => (b.registradoEn || "").localeCompare(a.registradoEn || "");
  const filas = [...[...invG].sort(orden).map((g) => fila("General", g)), ...[...invV].sort(orden).map((g) => fila("VIP", g))];
  return { filas, resumen: { general: conteo(invG), vip: conteo(invV), total: invG.length + invV.length } };
}
