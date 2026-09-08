import type { Registro } from "./registros";

/**
 * Espejo de la operación en Google Sheets.
 *
 * La cuenta corporativa no permite service accounts de GCP, así que la
 * escritura entra por un Apps Script pegado a la propia hoja (`docs/hoja.gs`),
 * protegido con un token compartido. La hoja es del equipo comercial: ahí se
 * mira quién se registró, si le llegó el WhatsApp, si abrió el pago y si ya
 * tiene su entrada.
 *
 * Cada fila se identifica por el token del registro y se reescribe entera en
 * cada cambio (upsert). Así la hoja converge al estado real aunque un webhook
 * se pierda o llegue dos veces, y nunca aparece la misma persona dos veces.
 *
 * Que la hoja falle no puede tumbar un webhook: es un espejo, no la fuente de
 * verdad. Por eso todo lo de aquí se llama sin `await` bloqueante y los
 * errores se tragan con una nota en el log.
 */

const ENCABEZADOS = [
  "Token",
  "Entrada",
  "Etapa",
  "Nombre",
  "Correo",
  "WhatsApp",
  "Empresa",
  "Precio",
  "Etapa de precio",
  "Registro en Luma",
  "Mensaje enviado",
  "Mensaje entregado",
  "Mensaje leído",
  "Abrió el pago",
  "Comprobantes",
  "Pago confirmado",
  "Referencia de pago",
  "Aprobado",
  "Aprobado por",
  "ID invitado Luma",
  "Actualizado",
];

/** Fecha corta en hora de Bogotá. El formato es-CO es ambiguo para Sheets. */
function fecha(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("sv-SE", { timeZone: "America/Bogota", hour12: false }).slice(0, 16);
}

const ETIQUETA: Record<string, string> = {
  registrado: "1 · Registrado en Luma",
  mensaje_enviado: "2 · WhatsApp enviado",
  mensaje_entregado: "3 · WhatsApp entregado",
  mensaje_leido: "4 · WhatsApp leído",
  pago_abierto: "5 · Abrió el pago",
  comprobante_recibido: "6 · Mandó comprobante",
  pago_confirmado: "7 · Pago confirmado",
  aprobado: "8 · Aprobado · entrada enviada",
  rechazado: "✕ Rechazado",
};

export function filaDe(r: Registro): (string | number)[] {
  return [
    r.token,
    r.tier === "vip" ? "VIP" : "General",
    ETIQUETA[r.etapa] ?? r.etapa,
    r.luma.nombre,
    r.luma.email,
    r.telefono ? `+${r.telefono}` : r.luma.telefonoCrudo || "",
    r.luma.empresa || "",
    r.pago.precio,
    r.pago.etiquetaEtapa,
    fecha(r.luma.registradoEn),
    fecha(r.whatsapp.enviadoEn),
    fecha(r.whatsapp.entregadoEn),
    fecha(r.whatsapp.leidoEn),
    fecha(r.pago.abiertoEn),
    r.pago.comprobantes.length ? `${r.pago.comprobantes.length} · ${fecha(r.pago.comprobantes.at(-1)?.en)}` : "",
    fecha(r.pago.confirmadoEn),
    r.pago.referencia || "",
    fecha(r.aprobacion.decididoEn),
    r.aprobacion.decididoPor || "",
    r.luma.guestId,
    fecha(r.actualizadoEn),
  ];
}

async function llamar(cuerpo: Record<string, unknown>): Promise<{ ok: boolean; nota: string }> {
  const url = String(process.env.SHEETS_WEBHOOK_URL || "").trim();
  const token = String(process.env.SHEETS_TOKEN || "").trim();
  if (!url.startsWith("https://") || !token) return { ok: false, nota: "hoja no conectada" };

  // Apps Script responde el doPost con una redirección a
  // script.googleusercontent.com que solo acepta GET. La escritura ya ocurrió
  // cuando llega el redirect; el cuerpo se lee con un GET a la Location.
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, ...cuerpo }),
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });

  let texto = "";
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location");
    if (loc) {
      texto = await fetch(loc, { signal: AbortSignal.timeout(15_000) })
        .then((r) => r.text())
        .catch(() => "");
    }
  } else {
    texto = await res.text().catch(() => "");
  }
  return { ok: texto.includes('"ok":true'), nota: texto.slice(0, 160) };
}

/** Inserta o actualiza la fila de una persona. Nunca lanza. */
export async function reflejar(r: Registro): Promise<void> {
  try {
    const res = await llamar({ accion: "upsert", encabezados: ENCABEZADOS, fila: filaDe(r) });
    if (!res.ok) console.warn("[hoja] no se reflejó el registro:", res.nota);
  } catch (error) {
    console.warn("[hoja] error al reflejar:", (error as Error).message);
  }
}

/** Reescribe la hoja completa. Para reconstruirla si quedó desfasada. */
export async function reflejarTodo(registros: Registro[]): Promise<{ ok: boolean; nota: string }> {
  return llamar({ accion: "reemplazar", filas: [ENCABEZADOS, ...registros.map(filaDe)] });
}
