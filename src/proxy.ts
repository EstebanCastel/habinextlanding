import { NextResponse, type NextRequest } from "next/server";

/**
 * Dominios de terceros que las etiquetas de pauta necesitan alcanzar. Se
 * declaran aunque los píxeles estén apagados, para que encenderlos sea solo
 * cuestión de poner la variable de entorno y no tocar la política.
 */
const ANALYTICS_HOSTS = [
  "https://connect.facebook.net",
  "https://www.facebook.com",
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://analytics.google.com",
  "https://googleads.g.doubleclick.net",
  "https://analytics.tiktok.com",
];

/**
 * Límite de peticiones por IP y por minuto al documento HTML. Es una defensa
 * de mejor esfuerzo: el estado vive en memoria de cada instancia del proxy, así
 * que no es un contador global. Para un bloqueo duro va el Firewall de Vercel.
 * Con 0 queda desactivado.
 */
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 90);
const WINDOW_MS = 60_000;

const hits = new Map<string, { count: number; resetAt: number }>();

function overLimit(ip: string, now: number): boolean {
  if (RATE_LIMIT <= 0) return false;

  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Barrido barato: se limpia solo cuando el mapa crece de más.
    if (hits.size > 5000) {
      for (const [key, value] of hits) {
        if (now > value.resetAt) hits.delete(key);
      }
    }
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

export function proxy(request: NextRequest) {
  const now = Date.now();
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  if (overLimit(ip, now)) {
    return new NextResponse("Demasiadas peticiones. Intenta de nuevo en un minuto.", {
      status: 429,
      headers: {
        "Retry-After": "60",
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  // Un nonce nuevo por petición: es lo que permite prohibir 'unsafe-inline' en
  // los scripts sin romper el arranque de React ni las etiquetas de pauta.
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' deja que los scripts con nonce carguen a los píxeles;
    // los hosts quedan como respaldo para navegadores sin CSP nivel 3.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${ANALYTICS_HOSTS.join(" ")}${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    // GSAP y Next escriben estilos en el atributo style, que ningún nonce
    // cubre; por eso aquí sí va 'unsafe-inline'. El riesgo de un estilo
    // inyectado es de otro orden que el de un script.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.facebook.com https://www.google-analytics.com https://analytics.tiktok.com",
    "font-src 'self' data:",
    `connect-src 'self' ${ANALYTICS_HOSTS.join(" ")}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    // Los formularios de compra viven en Luma, no aquí.
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  // Next lee el nonce de la cabecera en la petición y lo aplica solo a sus
  // propios scripts y a los <Script>; por eso viaja en las dos direcciones.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.well-known).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
