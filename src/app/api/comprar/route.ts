import { NextResponse } from "next/server";
import { crearCompra, normalizarCedula, normalizarTelefono, type Tier } from "@/lib/registros";

/**
 * Recibe los datos de la compra, crea el registro en `por_pagar` y manda a la
 * persona a su link personal de pago (`/p/<token>`), que la lleva a Wompi.
 * Público y escribe, así que lleva su propio límite por IP.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITE = 10;
const VENTANA_MS = 10 * 60_000;
const intentos = new Map<string, { n: number; hasta: number }>();

function pasaElLimite(ip: string): boolean {
  const ahora = Date.now();
  const previo = intentos.get(ip);
  if (!previo || ahora > previo.hasta) {
    intentos.set(ip, { n: 1, hasta: ahora + VENTANA_MS });
    if (intentos.size > 3000) for (const [k, v] of intentos) if (ahora > v.hasta) intentos.delete(k);
    return true;
  }
  previo.n += 1;
  return previo.n <= LIMITE;
}

function sitio(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
}

function volver(params: Record<string, string>) {
  const url = new URL(`${sitio()}/comprar`);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return NextResponse.redirect(url.toString(), { status: 303 });
}

const correoValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export async function POST(request: Request) {
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  if (!pasaElLimite(ip)) return volver({ error: "Demasiados intentos. Espera unos minutos y vuelve a probar." });

  const form = await request.formData().catch(() => null);
  if (!form) return volver({ error: "No pudimos leer el formulario." });

  const tier = (String(form.get("tier") ?? "general") === "vip" ? "vip" : "general") as Tier;
  const nombre = String(form.get("nombre") ?? "").trim().replace(/\s+/g, " ");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const telefonoCrudo = String(form.get("telefono") ?? "").trim();
  const cedulaCruda = String(form.get("cedula") ?? "").trim();
  const origen = String(form.get("origen") ?? "").trim().toLowerCase().slice(0, 60) || undefined;
  const contenido = String(form.get("contenido") ?? "").trim().slice(0, 80) || undefined;
  const conservar = { tier, nombre, email, telefono: telefonoCrudo, cedula: cedulaCruda };

  if (nombre.length < 3) return volver({ ...conservar, error: "Escribe tu nombre completo." });
  if (!correoValido(email)) return volver({ ...conservar, error: "Ese correo no parece válido." });
  const cedula = normalizarCedula(cedulaCruda);
  if (!cedula) return volver({ ...conservar, error: "La cédula va solo en números, sin puntos ni comas." });
  const telefono = normalizarTelefono(telefonoCrudo);
  if (!telefono) return volver({ ...conservar, error: "Ese celular no parece completo. Son diez dígitos, empezando por 3." });

  try {
    const registro = await crearCompra({ tier, email, nombre, telefonoCrudo: `+${telefono}`, cedula, origen, contenido });
    return NextResponse.redirect(`${sitio()}/p/${registro.token}`, { status: 303 });
  } catch (error) {
    console.error("[comprar] no se pudo crear el registro:", (error as Error).message);
    return volver({ ...conservar, error: "Algo se nos rompió. Inténtalo de nuevo en un momento." });
  }
}
