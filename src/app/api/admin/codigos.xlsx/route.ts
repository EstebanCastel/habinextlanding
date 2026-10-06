import { NextResponse } from "next/server";
import { filtrarCodigos, todos } from "@/lib/codigos";
import { haySesion } from "@/lib/sesion";
import { aXlsx, type Celda } from "@/lib/xlsx";

/**
 * Los códigos como Excel, con los mismos filtros que el listado del panel:
 * lo que se ve en pantalla es lo que se baja, o todo si no hay filtro.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ESTADOS = new Set(["todos", "redimidos", "asignados", "sin-asignar", "desactivados"]);

export async function GET(request: Request) {
  if (!(await haySesion())) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
  const q = new URL(request.url).searchParams;
  const estado = q.get("estado") && ESTADOS.has(q.get("estado")!) ? q.get("estado")! : "todos";
  const entrada = q.get("entrada") === "vip" || q.get("entrada") === "general" ? q.get("entrada")! : "todas";
  const texto = (q.get("q") ?? "").slice(0, 80);

  const lista = filtrarCodigos(await todos(), { estado, entrada, q: texto, pagina: 1 });
  const cuando = (iso?: string) => (iso ? iso.slice(0, 16).replace("T", " ") : "");
  const cabecera: Celda[] = [
    "Código", "Entrada", "Estado",
    "Asignado a", "Apellido", "Correo asignado", "Teléfono", "Invitado", "Hoja", "Fila",
    "Redimido por", "Correo de quien lo usó", "Cuándo",
    "Link para redimir", "Nota", "Creado",
  ];
  const filas: Celda[][] = lista.map((c) => {
    const r = c.redenciones[0];
    const a = c.asignado;
    const tier = c.sirvePara === "ambos" ? "general" : c.sirvePara;
    return [
      c.codigo,
      c.sirvePara === "vip" ? "VIP" : c.sirvePara === "ambos" ? "Las dos" : "General",
      c.usos > 0 ? "Redimido" : !c.activo ? "Desactivado" : c.vencido ? "Vencido" : a ? "Asignado" : "Sin dueño",
      a?.nombre ?? "",
      a?.apellido ?? "",
      a?.email ?? "",
      a?.telefono ?? "",
      a?.grupo ?? "",
      a?.hoja ?? "",
      a?.fila ?? null,
      r?.nombre ?? "",
      r?.email ?? "",
      cuando(r?.en),
      `${sitio}/codigo?tier=${tier}&codigo=${c.codigo}`,
      c.nota ?? "",
      cuando(c.creadoEn),
    ];
  });

  const nombreFiltro = [estado !== "todos" ? estado : "", entrada !== "todas" ? entrada : "", texto ? "busqueda" : ""].filter(Boolean).join("-");
  const hoy = new Date().toISOString().slice(0, 10);
  const libro = aXlsx([{ nombre: nombreFiltro ? `Códigos · ${nombreFiltro}` : "Códigos", filas: [cabecera, ...filas] }]);
  return new NextResponse(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="habinext-codigos${nombreFiltro ? `-${nombreFiltro}` : ""}-${hoy}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
