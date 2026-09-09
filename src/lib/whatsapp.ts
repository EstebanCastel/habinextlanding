/**
 * Salida de WhatsApp por Infobip, línea Colombia.
 *
 * Dos caminos distintos y no intercambiables:
 *
 * - **Plantilla** (`enviarPlantilla`): lo único que Meta deja mandar a alguien
 *   que no nos ha escrito. Tiene que estar aprobada y sus variables van por
 *   posición. Es el primer mensaje, el del link de pago.
 * - **Texto libre** (`enviarTexto`): solo vale dentro de las 24 horas
 *   siguientes al último mensaje de la persona. Es lo que se usa para
 *   responderle cuando manda el comprobante o pregunta algo. Fuera de esa
 *   ventana Meta lo rechaza, y por eso nunca se usa para iniciar nada.
 */

function base(): string {
  const b = String(process.env.INFOBIP_BASE_URL || "").replace(/\/+$/, "");
  if (!b) throw new Error("falta INFOBIP_BASE_URL");
  return b.startsWith("http") ? b : `https://${b}`;
}

function cabeceras(): HeadersInit {
  const k = process.env.INFOBIP_API_KEY;
  if (!k) throw new Error("falta INFOBIP_API_KEY");
  return { Authorization: `App ${k}`, "Content-Type": "application/json", Accept: "application/json" };
}

function linea(): string {
  const l = process.env.INFOBIP_LINEA_CO;
  if (!l) throw new Error("falta INFOBIP_LINEA_CO");
  return l;
}

export type Salida = {
  ok: boolean;
  status: number;
  messageId: string | null;
  estado: string | null;
  error?: string;
};

/**
 * A dónde le pide Infobip que mande los reportes de entrega.
 *
 * Se arma acá y en un solo lugar porque el token de la query no es opcional:
 * sin él, `/api/infobip` responde 401 y los reportes se pierden en silencio —
 * el mensaje sale, la persona lo recibe, y el panel se queda diciendo
 * «enviado» para siempre. Es el tipo de fallo que no se nota hasta que alguien
 * pregunta por qué nadie parece haber leído nada.
 */
function urlDeReportes(): string | undefined {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
  const token = process.env.INFOBIP_WEBHOOK_TOKEN;
  if (!token) return undefined;
  return `${sitio}/api/infobip?dlr=1&k=${encodeURIComponent(token)}`;
}

async function despachar(ruta: string, mensaje: Record<string, unknown>): Promise<Salida> {
  const res = await fetch(`${base()}${ruta}`, {
    method: "POST",
    headers: cabeceras(),
    body: JSON.stringify({ messages: [mensaje] }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => null)) as {
    messages?: { messageId?: string; status?: { name?: string; description?: string } }[];
    requestError?: { serviceException?: { text?: string } };
  } | null;
  const m = data?.messages?.[0];
  return {
    ok: res.status === 200,
    status: res.status,
    messageId: m?.messageId ?? null,
    estado: m?.status?.name ?? null,
    ...(res.status !== 200
      ? { error: data?.requestError?.serviceException?.text || `HTTP ${res.status}` }
      : {}),
  };
}

/**
 * Un botón del envío. El orden de la lista tiene que ser el mismo que el de la
 * plantilla: si la plantilla declara dos y el envío manda uno, o los manda al
 * revés, Meta descarta el mensaje.
 *
 * - `URL`: el parámetro es **solo el sufijo variable** de la URL, nunca la URL
 *   entera. La base (`https://www.habinext.com/p/`) se horneó al registrar la
 *   plantilla.
 * - `QUICK_REPLY`: el parámetro es el payload que vuelve por el webhook.
 */
export type Boton = { tipo: "URL" | "QUICK_REPLY"; parametro: string };

export async function enviarPlantilla(opciones: {
  a: string;
  plantilla: string;
  /**
   * Valor de la variable del encabezado, si la plantilla tiene una. Meta solo
   * admite **una** por encabezado, y ahí es donde va el nombre: es el único
   * lugar donde cabe una variable sin chocar con el parámetro del botón URL,
   * porque el cuerpo y el botón comparten numeración y el encabezado no.
   */
  encabezado?: string;
  /** Valores de `{{1}}`, `{{2}}`… en el orden en que aparecen en el cuerpo. */
  placeholders?: string[];
  botones?: Boton[];
  callbackData?: unknown;
}): Promise<Salida> {
  const notifyUrl = urlDeReportes();
  const botones = opciones.botones ?? [];
  return despachar("/whatsapp/1/message/template", {
    from: linea(),
    to: opciones.a.replace(/\D/g, ""),
    content: {
      templateName: opciones.plantilla,
      language: "es_CO",
      templateData: {
        body: { placeholders: (opciones.placeholders ?? []).map(String) },
        ...(opciones.encabezado !== undefined
          ? { header: { type: "TEXT", placeholder: opciones.encabezado } }
          : {}),
        // Sin esto Infobip acepta el POST (PENDING_ENROUTE) y Meta lo descarta
        // después con "Failed to match template parameters": el mensaje nunca
        // llega y el único rastro está en el reporte de entrega.
        ...(botones.length
          ? { buttons: botones.map((b) => ({ type: b.tipo, parameter: b.parametro })) }
          : {}),
      },
    },
    ...(notifyUrl ? { notifyUrl } : {}),
    ...(opciones.callbackData !== undefined
      ? { callbackData: JSON.stringify(opciones.callbackData) }
      : {}),
  });
}

export async function enviarTexto(opciones: { a: string; texto: string }): Promise<Salida> {
  const notifyUrl = urlDeReportes();
  return despachar("/whatsapp/1/message/text", {
    from: linea(),
    to: opciones.a.replace(/\D/g, ""),
    content: { text: opciones.texto },
    ...(notifyUrl ? { notifyUrl } : {}),
  });
}
