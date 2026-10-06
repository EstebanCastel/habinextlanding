import { NextResponse } from "next/server";
import { fichaDe, salonDe, sesionDe, numeroDe } from "@/config/agenda";
import { aPdf, type Linea } from "@/lib/pdf";

/**
 * La ficha de una sesión para descargar: título, quién la dicta, qué se
 * lleva quien entra y qué traer. Si el equipo subió material propio
 * (`material` en la sesión), se manda allá en vez de generar la ficha.
 * Es información del evento: no pide sesión.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const s = sesionDe(id.replace(/\.pdf$/i, ""));
  if (!s || s.tipo) return NextResponse.json({ error: "Esa sesión no existe." }, { status: 404 });
  if (s.material) return NextResponse.redirect(s.material, { status: 302 });

  const salon = salonDe(s.salon);
  const gente = s.ponentes ?? (s.ponente ? [s.ponente] : []);
  const lineas: Linea[] = [
    { tipo: "etiqueta", texto: `Sesión ${String(numeroDe(s)).padStart(2, "0")} · Salón ${salon.numero} · ${salon.rotulo}` },
    { tipo: "titulo", texto: s.titulo },
  ];
  if (gente.length) {
    for (const g of gente) {
      const [quien, extra] = g.split("·").map((t) => t.trim());
      const cargo = s.detallePonente ?? fichaDe(quien)?.cargo ?? extra;
      lineas.push({ tipo: "parrafo", texto: cargo ? `${quien} · ${cargo}` : quien });
    }
  } else {
    lineas.push({ tipo: "parrafo", texto: "Ponente por confirmar" });
  }
  if (s.resumen) {
    lineas.push({ tipo: "espacio", alto: 6 }, { tipo: "parrafo", texto: s.resumen });
  }
  if (s.contenido?.length) {
    lineas.push({ tipo: "espacio", alto: 14 }, { tipo: "subtitulo", texto: "Qué te llevas" });
    for (const c of s.contenido) lineas.push({ tipo: "vineta", texto: c });
  }
  if (s.necesitas) {
    lineas.push({ tipo: "espacio", alto: 14 }, { tipo: "subtitulo", texto: "Trae contigo" }, { tipo: "parrafo", texto: s.necesitas });
  }
  lineas.push(
    { tipo: "espacio", alto: 18 },
    { tipo: "subtitulo", texto: "El salón" },
    { tipo: "parrafo", texto: `${salon.nombre}. ${salon.resumen}` },
    { tipo: "parrafo", texto: `${salon.montaje.join(" · ")}. ${salon.aforo}.` },
    { tipo: "espacio", alto: 18 },
    { tipo: "parrafo", texto: "Las horas de cada sesión se publican apenas el equipo las confirme. La agenda completa, con lo que te llevas de cada charla, vive en habinext.com/experiencia/agenda." }
  );

  const pdf = aPdf(lineas, "Habi Next Colombia · Centro de Convenciones Avenida 68, Bogotá · habinext.com");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="habi-next-${s.id}.pdf"`,
      "Cache-Control": "public, max-age=600",
    },
  });
}
