import { NextResponse } from "next/server";
import { EQUIPO, selloDeEquipo } from "@/config/equipo";
import { todos } from "@/lib/experiencia";
import { urlDePase } from "@/lib/pases";
import { traerPadron } from "@/lib/validacion";

/**
 * Todo lo que el lector necesita para seguir trabajando sin internet.
 *
 * El recinto es un centro de convenciones con setecientas personas entrando
 * a la misma hora y la señal se cae: pasó en las pruebas de sala. Un lector
 * que depende del servidor para cada escaneo deja la fila parada justo en el
 * peor momento, que es el de las ocho y media.
 *
 * Así que el teléfono se lleva el padrón entero en el bolsillo. Son ochocientas
 * filas de cuatro campos —unos sesenta kilobytes— y con eso puede decidir solo:
 * quién es, de qué tipo y si su pase es válido. Las marcas que haga sin señal
 * se guardan y se mandan cuando vuelve; como validar es idempotente, reenviar
 * no cuenta a nadie dos veces.
 *
 * Va sin clave, igual que leer y contar: lo que protege la puerta es el QR
 * firmado, no una contraseña repartida por radio a las siete de la mañana.
 * Y lo que entrega acá es lo mismo que el lector vería escaneando uno por uno.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";

/** El sello de un pase, sacado de la URL que ya sabemos construir. */
function selloDe(tipo: "almuerzo" | "taller", id: string, secreto: string, extra = ""): string {
  const u = urlDePase(tipo, id, secreto, SITIO, extra);
  return new URL(u).searchParams.get("k") ?? "";
}

export async function GET() {
  const secreto = process.env.EXPERIENCIA_SECRET ?? "";
  const padron = await traerPadron().catch(() => null);
  if (!padron) {
    return NextResponse.json({ ok: false, error: "El padrón no está armado." }, { status: 503 });
  }

  // El padrón, en filas y no en objetos: con ochocientas personas, los nombres
  // de las claves repetidos pesan más que los datos.
  const gente = padron.gente.map((p) => [p.id, p.tipo, p.nombre, p.correo, p.prueba ? 1 : 0]);

  // Los sellos del equipo de la lista. A quien llega por el dominio de Habi no
  // lo podemos enumerar, así que sin señal se le cree y el servidor lo
  // comprueba cuando la marca se sincroniza.
  const equipo: Record<string, string> = {};
  if (secreto) for (const c of EQUIPO) equipo[c.email.toLowerCase()] = selloDeEquipo(c.email.toLowerCase(), secreto);

  // Los pases de adentro, solo de quien reservó algo: el resto no tiene qué
  // enseñar en el restaurante ni en la puerta del taller.
  const gentePases: Record<string, { n: string; t: string; a?: string; ka?: string; kt?: Record<string, string> }> = {};
  if (secreto) {
    const participantes = await todos().catch(() => []);
    for (const p of participantes) {
      const conAlmuerzo = Boolean(p.almuerzo?.turno);
      const talleres = p.talleres ?? [];
      if (!conAlmuerzo && !talleres.length) continue;
      gentePases[p.id] = {
        n: `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || p.email || p.id,
        t: p.equipo ? "equipo" : p.registro?.tier === "vip" ? "vip" : "general",
        ...(conAlmuerzo ? { a: p.almuerzo!.turno, ka: selloDe("almuerzo", p.id, secreto) } : {}),
        ...(talleres.length
          ? { kt: Object.fromEntries(talleres.map((t) => [t.id, selloDe("taller", p.id, secreto, t.id)])) }
          : {}),
      };
    }
  }

  return NextResponse.json(
    { ok: true, armadoEn: padron.armadoEn, bajadoEn: new Date().toISOString(), gente, equipo, pases: gentePases },
    { headers: { "Cache-Control": "no-store" } }
  );
}
