import { NextResponse } from "next/server";
import { redimirCodigo } from "@/lib/bot";
import { normalizarTelefono, type Tier } from "@/lib/registros";

/**
 * Redención de un código de invitación. Es el único endpoint público que
 * escribe, así que es también el único que un desconocido puede golpear a
 * voluntad: lleva su propio límite por IP para que nadie pueda probar códigos
 * al azar hasta acertar uno.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Intentos por IP y por ventana. Un invitado real necesita uno, o dos. */
const LIMITE = 8;
const VENTANA_MS = 10 * 60_000;
const intentos = new Map<string, { n: number; hasta: number }>();

function pasaElLimite(ip: string): boolean {
  const ahora = Date.now();
  const previo = intentos.get(ip);
  if (!previo || ahora > previo.hasta) {
    intentos.set(ip, { n: 1, hasta: ahora + VENTANA_MS });
    if (intentos.size > 3000) {
      for (const [k, v] of intentos) if (ahora > v.hasta) intentos.delete(k);
    }
    return true;
  }
  previo.n += 1;
  return previo.n <= LIMITE;
}

function volver(params: Record<string, string>) {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
  const url = new URL(`${sitio}/codigo`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url.toString(), { status: 303 });
}

const correoValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconocida";
  if (!pasaElLimite(ip)) {
    return volver({ error: "Demasiados intentos. Espera unos minutos y vuelve a probar." });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return volver({ error: "No pudimos leer el formulario." });

  const codigo = String(form.get("codigo") ?? "").trim();
  const nombre = String(form.get("nombre") ?? "").trim().replace(/\s+/g, " ");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const telefonoCrudo = String(form.get("telefono") ?? "").trim();
  const tier = (String(form.get("tier") ?? "general") === "vip" ? "vip" : "general") as Tier;

  const conservar = { codigo, nombre, email, telefono: telefonoCrudo, tier };

  if (!codigo) return volver({ ...conservar, error: "Escribe tu código." });
  if (nombre.length < 3) return volver({ ...conservar, error: "Escribe tu nombre completo." });
  if (!correoValido(email)) return volver({ ...conservar, error: "Ese correo no parece válido." });

  // El formulario ya fija el +57, así que aquí llegan los diez dígitos
  // colombianos. `normalizarTelefono` los completa, y si alguien pegó el
  // número entero con indicativo tampoco se rompe.
  const telefono = normalizarTelefono(telefonoCrudo);
  if (!telefono) {
    return volver({
      ...conservar,
      error: "Ese celular no parece completo. Son diez dígitos, empezando por 3.",
    });
  }

  try {
    const res = await redimirCodigo({ codigo, tier, nombre, email, telefono: `+${telefono}` });
    if (!res.ok) return volver({ ...conservar, error: res.nota });
    return volver({ listo: "1", tier, email });
  } catch (error) {
    console.error("[codigo] fallo al redimir:", (error as Error).message);
    return volver({ ...conservar, error: "Algo se nos rompió. Inténtalo de nuevo en un momento." });
  }
}
