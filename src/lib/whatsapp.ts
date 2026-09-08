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
 * Manda la plantilla del link de pago.
 *
 * Los dos marcadores de la plantilla son, en orden: `{{1}}` el primer nombre y
 * `{{2}}` el token del registro, que se pega al final de la URL corta que va
 * escrita dentro del cuerpo. Ese token es lo que hace que el link sea de esa
 * persona y de nadie más, y lo que después permite saber quién abrió el pago.
 *
 * `notifyUrl` es lo que hace que después sepamos si el mensaje llegó y si lo
 * leyeron: sin eso, un fallo masivo de entrega pasaría inadvertido hasta el
 * día del evento.
 */
export async function enviarPlantilla(opciones: {
  a: string;
  plantilla: string;
  /** Valores de `{{1}}`, `{{2}}`… en el orden en que aparecen en el cuerpo. */
  placeholders: string[];
  /**
   * Payload de cada botón de respuesta rápida, en el mismo orden en que están
   * en la plantilla. Todos tienen que ir: si la plantilla declara dos botones
   * y el envío manda uno, Meta descarta el mensaje.
   */
  botones: string[];
  callbackData?: unknown;
}): Promise<Salida> {
  const notifyUrl = urlDeReportes();
  return despachar("/whatsapp/1/message/template", {
    from: linea(),
    to: opciones.a.replace(/\D/g, ""),
    content: {
      templateName: opciones.plantilla,
      language: "es_CO",
      templateData: {
        body: { placeholders: opciones.placeholders.map(String) },
        // Los botones de la plantilla tienen que declararse en el envío: sin
        // esto Infobip acepta el POST (PENDING_ENROUTE) y Meta lo descarta
        // después con "Failed to match template parameters", de modo que el
        // mensaje nunca llega y el único rastro está en el reporte de entrega.
        // El payload lleva el token para reconocer a la persona cuando toca el
        // botón y su respuesta vuelve por el webhook.
        ...(opciones.botones.length
          ? { buttons: opciones.botones.map((p) => ({ type: "QUICK_REPLY", parameter: p })) }
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
