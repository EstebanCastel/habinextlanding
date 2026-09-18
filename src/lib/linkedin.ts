/**
 * LinkedIn, en nombre de la persona.
 *
 * Dos cosas pasan acá: el inicio de sesión (OpenID Connect) y la publicación
 * (Posts API + Images API). Las dos usan la misma app de LinkedIn que ya
 * publica habipublicador; lo que cambia es que acá el token es de cada
 * asistente, no de un solo perfil, y se pide en el mismo login con el permiso
 * `w_member_social`.
 *
 * Lecciones heredadas de habipublicador que acá ya vienen resueltas:
 *
 * - **La versión de la API caduca.** LinkedIn retira cada versión al año;
 *   con una vencida responde 426 y la publicación muere sin decir por qué.
 *   Va en `LINKEDIN_API_VERSION` para subirla sin tocar código.
 * - **La imagen no se pasa por URL.** Hay que registrarla, subir los bytes y
 *   recién entonces referenciarla en la publicación.
 * - **El texto es "little text".** Paréntesis, arrobas, almohadillas y otros
 *   caracteres tienen que ir escapados o LinkedIn devuelve 422.
 */

const VERSION = process.env.LINKEDIN_API_VERSION || "202606";
const SCOPES = "openid profile email w_member_social";

export function configurado(): boolean {
  return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
}

export function urlDeAutorizacion(state: string, redirectUri: string): string {
  const u = new URL("https://www.linkedin.com/oauth/v2/authorization");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID ?? "");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("scope", SCOPES);
  u.searchParams.set("state", state);
  return u.toString();
}

export async function canjearCodigo(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; expiraEnSegundos: number }> {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
      client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } | null;
  if (!res.ok || !data?.access_token) {
    throw new Error(`LinkedIn no entregó token: ${data?.error_description || data?.error || res.status}`);
  }
  // Sin expires_in se asume lo que LinkedIn documenta: 60 días.
  return { accessToken: data.access_token, expiraEnSegundos: data.expires_in ?? 5_184_000 };
}

export type Perfil = {
  sub: string;
  nombre: string;
  nombrePila?: string;
  apellido?: string;
  email?: string;
  foto?: string;
};

export async function perfil(accessToken: string): Promise<Perfil> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  const d = (await res.json().catch(() => null)) as {
    sub?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
    picture?: string;
  } | null;
  if (!res.ok || !d?.sub) throw new Error(`LinkedIn no entregó el perfil (${res.status})`);
  return {
    sub: d.sub,
    nombre: d.name || [d.given_name, d.family_name].filter(Boolean).join(" ") || "Asistente",
    nombrePila: d.given_name,
    apellido: d.family_name,
    email: d.email?.toLowerCase(),
    foto: d.picture,
  };
}

/**
 * Escapa el texto al formato "little text" de la Posts API. Todo carácter
 * reservado lleva barra invertida, salvo las etiquetas, que se convierten a la
 * macro `{hashtag|\#|nombre}` para que LinkedIn las vuelva enlaces.
 */
export function escapar(texto: string): string {
  const reservados = /[\\|{}@[\]()<>#*_~]/g;
  return texto
    .split(/(#[\p{L}\p{N}]+)/u)
    .map((trozo) =>
      /^#[\p{L}\p{N}]+$/u.test(trozo)
        ? `{hashtag|\\#|${trozo.slice(1)}}`
        : trozo.replace(reservados, (c) => `\\${c}`)
    )
    .join("");
}

export type Imagen = { bytes: Buffer; contentType: string; alt?: string };

export type Resultado =
  | { ok: true; urn: string; url: string }
  | { ok: false; motivo: "reconectar" | "version" | "limite" | "otro"; detalle: string };

function cabeceras(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": VERSION,
    "Content-Type": "application/json",
  };
}

async function subirImagen(token: string, sub: string, imagen: Imagen): Promise<string> {
  const init = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: cabeceras(token),
    body: JSON.stringify({ initializeUploadRequest: { owner: `urn:li:person:${sub}` } }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!init.ok) throw Object.assign(new Error(`initializeUpload ${init.status}`), { status: init.status });
  const d = (await init.json()) as { value?: { uploadUrl?: string; image?: string } };
  const uploadUrl = d.value?.uploadUrl;
  const urn = d.value?.image;
  if (!uploadUrl || !urn) throw new Error("initializeUpload sin uploadUrl o urn");

  // La subida lleva solo el token y el tipo: con las cabeceras de versión
  // el servidor de archivos responde 400.
  const up = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": imagen.contentType },
    body: new Uint8Array(imagen.bytes),
    signal: AbortSignal.timeout(60_000),
  });
  if (!up.ok) throw Object.assign(new Error(`subida ${up.status}`), { status: up.status });
  return urn;
}

export async function publicar(opciones: {
  accessToken: string;
  sub: string;
  texto: string;
  imagenes: Imagen[];
}): Promise<Resultado> {
  const { accessToken, sub, texto, imagenes } = opciones;
  try {
    const urns: { id: string; altText?: string }[] = [];
    for (const imagen of imagenes.slice(0, 20)) {
      urns.push({ id: await subirImagen(accessToken, sub, imagen), altText: imagen.alt });
    }

    const content =
      urns.length === 0
        ? {}
        : urns.length === 1
          ? { content: { media: { id: urns[0].id, ...(urns[0].altText ? { altText: urns[0].altText } : {}) } } }
          : { content: { multiImage: { images: urns } } };

    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: cabeceras(accessToken),
      body: JSON.stringify({
        author: `urn:li:person:${sub}`,
        commentary: escapar(texto).slice(0, 3000),
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        ...content,
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, motivo: "reconectar", detalle: `LinkedIn ${res.status}` };
    }
    if (res.status === 426) {
      return { ok: false, motivo: "version", detalle: `versión ${VERSION} retirada` };
    }
    if (res.status === 429) {
      return { ok: false, motivo: "limite", detalle: "límite diario de LinkedIn" };
    }
    if (!res.ok) {
      const cuerpo = (await res.text().catch(() => "")).slice(0, 300);
      return { ok: false, motivo: "otro", detalle: `LinkedIn ${res.status} ${cuerpo}` };
    }

    const urn = res.headers.get("x-restli-id") || res.headers.get("x-linkedin-id") || "";
    return { ok: true, urn, url: urn ? `https://www.linkedin.com/feed/update/${urn}/` : "" };
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 401 || status === 403) {
      return { ok: false, motivo: "reconectar", detalle: (error as Error).message };
    }
    return { ok: false, motivo: "otro", detalle: (error as Error).message };
  }
}
