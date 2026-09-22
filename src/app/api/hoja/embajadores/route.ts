import { NextResponse } from "next/server";
import { aFilas, CABECERA_HOJA, tablero } from "@/lib/embajadores";
import { tokenValido } from "@/lib/seguridad";

/**
 * La tabla de enlaces para la hoja de Google del equipo.
 *
 * La hoja la refresca un Apps Script cada pocos minutos (ver
 * `docs/hoja-embajadores.gs`). No tiene cómo usar la cookie del panel, así
 * que entra con su propio token, `HOJA_TOKEN`, que va en la cabecera
 * `Authorization` y no en la URL: las URL quedan en registros de acceso, las
 * cabeceras no. El token solo lee; con él no se puede cambiar nada.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Cruza enlaces, registros y rastro completos: le hace falta más que el tiempo por defecto. */
export const maxDuration = 60;

function tokenRecibido(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export async function GET(request: Request) {
  if (!tokenValido(tokenRecibido(request), process.env.HOJA_TOKEN)) {
    // Espera fija: que probar tokens al azar sea lento además de inútil.
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }

  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
  const t = await tablero();

  return NextResponse.json(
    {
      ok: true,
      actualizadoEn: new Date().toISOString(),
      cabecera: CABECERA_HOJA,
      filas: aFilas(t, sitio),
      resumen: {
        enlaces: t.marcadores.length,
        registros: t.totalRegistros,
        traidos: t.traidosTotal,
        sinAtribuir: t.sinAtribuir,
        meta: t.metaTotal,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
