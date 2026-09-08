import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Primitivas compartidas por los tres webhooks. Están juntas a propósito: cada
 * proveedor firma distinto, pero el error que hay que evitar es siempre el
 * mismo —comparar firmas con `===`, que filtra el secreto por el tiempo que
 * tarda en fallar— y así solo existe una función que compara.
 */

/** Comparación en tiempo constante de dos cadenas hexadecimales. */
export function igualSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // timingSafeEqual exige la misma longitud; la diferencia de longitud no es
  // secreta, así que devolverla de inmediato no filtra nada.
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function hmacHex(secreto: string, mensaje: string): string {
  return createHmac("sha256", secreto).update(mensaje, "utf8").digest("hex");
}

/**
 * Verifica la firma de un webhook de Luma.
 *
 * Luma manda `Webhook-Signature: t=<unix>,v1=<hex>` y firma el string
 * `${timestamp}.${cuerpo crudo}` con HMAC-SHA256 sobre el secreto `whsec_…`.
 * El cuerpo tiene que ser el texto exacto que llegó: si se parsea y se vuelve
 * a serializar, cualquier diferencia de espacios o de orden de llaves cambia
 * el digest y toda petición legítima se rechaza.
 *
 * La ventana de tolerancia corta los ataques de repetición: una petición
 * capturada hoy no sirve mañana.
 */
export function firmaLumaValida(
  cabecera: string | null,
  cuerpoCrudo: string,
  secreto: string,
  toleranciaSegundos = 300
): { ok: boolean; motivo?: string } {
  if (!secreto) return { ok: false, motivo: "sin secreto configurado" };
  if (!cabecera) return { ok: false, motivo: "falta Webhook-Signature" };

  const partes = new Map<string, string>();
  for (const trozo of cabecera.split(",")) {
    const i = trozo.indexOf("=");
    if (i > 0) partes.set(trozo.slice(0, i).trim(), trozo.slice(i + 1).trim());
  }

  const t = partes.get("t");
  const v1 = partes.get("v1");
  if (!t || !v1) return { ok: false, motivo: "cabecera mal formada" };

  const edad = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
  if (!Number.isFinite(edad) || edad > toleranciaSegundos) {
    return { ok: false, motivo: "timestamp fuera de ventana" };
  }

  return igualSeguro(hmacHex(secreto, `${t}.${cuerpoCrudo}`), v1)
    ? { ok: true }
    : { ok: false, motivo: "firma no coincide" };
}

/**
 * Verifica el checksum de un evento de Wompi. Wompi no usa HMAC: concatena los
 * valores de las propiedades que él mismo lista en `signature.properties`, les
 * pega el timestamp y el secreto de eventos, y aplica SHA-256. Hay que leer las
 * propiedades del payload y no una lista fija nuestra, porque Wompi puede
 * ampliarlas y el checksum dejaría de cuadrar.
 */
export async function firmaWompiValida(
  evento: unknown,
  secretoEventos: string
): Promise<boolean> {
  if (!secretoEventos) return false;
  const e = evento as {
    data?: Record<string, unknown>;
    timestamp?: number;
    signature?: { checksum?: string; properties?: string[] };
  };
  const checksum = e?.signature?.checksum;
  const propiedades = e?.signature?.properties;
  if (!checksum || !Array.isArray(propiedades) || e?.timestamp === undefined) return false;

  const concatenado =
    propiedades
      .map((ruta) => {
        // "transaction.amount_in_cents" → data.transaction.amount_in_cents
        let valor: unknown = e.data;
        for (const llave of ruta.split(".")) {
          valor = valor && typeof valor === "object" ? (valor as Record<string, unknown>)[llave] : undefined;
        }
        return valor === undefined || valor === null ? "" : String(valor);
      })
      .join("") + String(e.timestamp) + secretoEventos;

  const digest = Buffer.from(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(concatenado))
  ).toString("hex");

  return igualSeguro(digest.toUpperCase(), String(checksum).toUpperCase());
}

/**
 * Token público de un registro. Va en la URL que la persona recibe por
 * WhatsApp, así que es lo único de este sistema que viaja por un canal que no
 * controlamos: se genera con el CSPRNG y con 20 bytes (160 bits) para que no
 * se pueda adivinar ni enumerar.
 */
export function nuevoToken(): string {
  return randomBytes(20).toString("base64url");
}

/**
 * Autenticación de los endpoints que no firman (el webhook de Infobip y el
 * panel). Se compara en tiempo constante y se exige que el secreto exista:
 * un secreto vacío en el entorno no puede volverse una puerta abierta.
 */
export function tokenValido(recibido: string | null, esperado: string | undefined): boolean {
  if (!esperado || esperado.length < 16) return false;
  if (!recibido) return false;
  return igualSeguro(recibido, esperado);
}
