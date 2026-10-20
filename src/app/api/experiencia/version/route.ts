import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ALMUERZOS, SESIONES } from "@/config/agenda";

/**
 * La versión de la agenda que se está sirviendo.
 *
 * El día del evento la agenda cambió seis veces y nadie en el recinto se
 * enteró: quien dejó la pantalla abierta a las nueve de la mañana siguió
 * viendo las horas de las nueve de la mañana. Una página que vive abierta
 * cuatro horas no se entera de nada por su cuenta.
 *
 * Esto es lo que mira el navegador cada tanto para saber si lo que tiene en
 * pantalla sigue siendo verdad. Es una huella de las horas, los títulos y los
 * ponentes: si cambia cualquiera de los tres, cambia la huella.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const huella = createHash("sha256")
  .update(
    JSON.stringify([
      SESIONES.map((s) => [s.id, s.desde, s.titulo, s.ponente, s.ponentes, s.tipo]),
      ALMUERZOS.map((t) => [t.id, t.desde, t.hasta]),
    ])
  )
  .digest("base64url")
  .slice(0, 12);

export function GET() {
  return NextResponse.json({ ok: true, version: huella }, { headers: { "Cache-Control": "no-store" } });
}

/** La misma huella, para que el servidor la pinte en la página. */
export const VERSION_AGENDA = huella;
