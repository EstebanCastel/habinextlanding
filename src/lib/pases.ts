import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Los pases de dentro del evento: el almuerzo y cada taller.
 *
 * El QR de la puerta es el de Luma y no sirve para nada más: en la entrada se
 * escanea una vez y listo. Adentro hay dos controles distintos —el restaurante
 * y la puerta del Salón Taller— y cada uno necesita saber algo que el QR de
 * Luma no lleva: qué turno le tocó, o a cuál taller se apuntó.
 *
 * Por eso cada uno tiene el suyo. Además separa los errores: alguien que
 * enseña el QR de la entrada en el restaurante recibe «ese no es el pase del
 * almuerzo» en vez de un «ya entró» que no le dice nada.
 *
 * Van firmados con el mismo secreto de la experiencia. El identificador del
 * participante viaja a la vista, así que sin firma cualquiera podría escribir
 * el de otro y comerse su almuerzo.
 */

export type TipoPase = "almuerzo" | "taller";

/** Las letras cortas que van en la URL: un QR corto es un QR que se lee rápido. */
const LETRA: Record<TipoPase, string> = { almuerzo: "a", taller: "t" };

function sello(secreto: string, tipo: TipoPase, id: string, extra: string): string {
  return createHmac("sha256", secreto)
    .update(`pase:${tipo}:${id}:${extra}`)
    .digest("base64url")
    .slice(0, 16);
}

/**
 * El pase de alguien, como URL.
 *
 * `extra` es el taller cuando lo hay. Para el almuerzo va vacío: el turno no
 * entra en la firma a propósito, porque alguien puede cambiarlo después de
 * guardar el QR en el teléfono y el pase tiene que seguir sirviendo.
 */
export function urlDePase(
  tipo: TipoPase,
  participanteId: string,
  secreto: string,
  sitio: string,
  extra = ""
): string {
  const cola = extra ? `/${encodeURIComponent(extra)}` : "";
  return `${sitio}/v/${LETRA[tipo]}/${encodeURIComponent(participanteId)}${cola}?k=${sello(secreto, tipo, participanteId, extra)}`;
}

export type PaseLeido = { tipo: TipoPase; participanteId: string; extra: string };

/**
 * Lee un pase y comprueba su firma. Devuelve null si no es uno de los
 * nuestros o si la firma no cuadra.
 */
export function leerPase(texto: string, secreto: string): PaseLeido | null {
  if (!secreto) return null;
  let u: URL;
  try {
    u = new URL(String(texto ?? "").trim());
  } catch {
    return null;
  }
  const partes = u.pathname.split("/").filter(Boolean);
  if (partes[0] !== "v" || partes.length < 3) return null;

  const tipo = (Object.keys(LETRA) as TipoPase[]).find((t) => LETRA[t] === partes[1]);
  if (!tipo) return null;

  const participanteId = decodeURIComponent(partes[2] ?? "");
  const extra = partes[3] ? decodeURIComponent(partes[3]) : "";
  if (!participanteId) return null;

  const dado = u.searchParams.get("k") ?? "";
  const bueno = sello(secreto, tipo, participanteId, extra);
  const a = Buffer.from(dado);
  const b = Buffer.from(bueno);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { tipo, participanteId, extra };
}
