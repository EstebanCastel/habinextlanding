import { NextResponse } from "next/server";
import { borrar, crearSiNoExiste, leer } from "@/lib/almacen";
import { importar } from "@/lib/codigos";
import { leerLista } from "@/lib/excel";
import { haySesion } from "@/lib/sesion";

/**
 * Recibe la lista de invitados (el Excel de asistencia) y deja a cada persona
 * con su código. Responde JSON cuando lo pide la zona de arrastrar del panel
 * y, si llega de un formulario sin JavaScript, vuelve al panel con el resumen.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** 425 personas son 425 escrituras al almacén; el tiempo por defecto no alcanza. */
export const maxDuration = 300;

// Vercel corta el cuerpo en 4,5 MB antes de llegar aquí; el tope propio va por debajo para que el mensaje sea el nuestro.
const TAMANO_MAXIMO = 4 * 1024 * 1024;
/** Dos importaciones a la vez se pisan (cada una crea su código para la misma persona). Un candado con caducidad. */
const CANDADO = "candados/importar-codigos.json";
const CANDADO_MS = 10 * 60_000;

async function tomarCandado(): Promise<boolean> {
  const ahora = Date.now();
  if (await crearSiNoExiste(CANDADO, { en: ahora })) return true;
  const previo = await leer<{ en: number }>(CANDADO);
  if (previo && ahora - previo.en < CANDADO_MS) return false;
  // Quedó de una importación que se cortó: se suelta y se vuelve a tomar.
  await borrar(CANDADO);
  return crearSiNoExiste(CANDADO, { en: ahora });
}

function sitio(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
}

export async function POST(request: Request) {
  if (!(await haySesion())) return NextResponse.json({ error: "no autorizado" }, { status: 401 });

  const quiereJson = /application\/json/.test(request.headers.get("accept") ?? "");
  const responder = (estado: number, cuerpo: { ok: boolean; informe?: unknown; error?: string }, aviso: string) =>
    quiereJson
      ? NextResponse.json(cuerpo, { status: estado })
      : NextResponse.redirect(`${sitio()}/admin/codigos?aviso=${encodeURIComponent(aviso)}`, { status: 303 });

  const form = await request.formData().catch(() => null);
  const archivo = form?.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return responder(400, { ok: false, error: "No llegó ningún archivo." }, "No llegó ningún archivo.");
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return responder(413, { ok: false, error: "El archivo pesa más de 4 MB." }, "El archivo pesa más de 4 MB.");
  }

  if (!(await tomarCandado())) {
    const texto = "Ya hay una importación en curso. Espera a que termine y vuelve a soltar el archivo.";
    return responder(409, { ok: false, error: texto }, texto);
  }

  try {
    const bytes = Buffer.from(await archivo.arrayBuffer());
    const lectura = await leerLista(archivo.name, bytes);
    if (lectura.filas.length === 0) {
      const texto = lectura.hojasIgnoradas.length
        ? `Ninguna hoja parecía una lista de invitados (se miraron: ${lectura.hojasIgnoradas.join(", ")}). Hace falta una columna de correo y una de tipo de entrada, o que la hoja se llame VIP o General.`
        : "El archivo no trae filas con correo.";
      return responder(422, { ok: false, error: texto }, texto);
    }
    const informe = await importar(lectura.filas, archivo.name, {
      hojasLeidas: lectura.hojasLeidas,
      hojasIgnoradas: lectura.hojasIgnoradas,
      sinCorreo: lectura.sinCorreo,
    });
    const aviso = `${archivo.name}: ${informe.filas} personas · ${informe.creados} códigos nuevos · ${informe.yaTenian} ya tenían el suyo · ${informe.actualizados} actualizados · ${informe.borrados} sobrantes borrados${informe.fallos.length ? ` · ${informe.fallos.length} fallos` : ""}`;
    return responder(200, { ok: true, informe }, aviso);
  } catch (error) {
    const texto = `No se pudo leer el archivo: ${(error as Error).message}`;
    console.error("[codigos/importar]", texto);
    return responder(422, { ok: false, error: texto }, texto);
  } finally {
    await borrar(CANDADO);
  }
}
