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

/**
 * Las tres versiones de la landing que se están comparando.
 *
 *   a · la página completa, tal como está
 *   b · corta, con la boletería mucho más arriba
 *   c · directo: hero y boletería, nada en medio
 *
 * La asignación va acá y no en el navegador porque el reparto tiene que estar
 * decidido **antes** del primer render: hacerlo en el cliente significa pintar
 * una versión y reemplazarla, que además de verse mal contamina la medición —
 * el visitante alcanza a ver dos páginas distintas.
 *
 * Se guarda en cookie para que la misma persona vea siempre lo mismo. Un
 * experimento en el que alguien ve A el lunes y C el martes no mide nada.
 */
type Variante = "a" | "b" | "c";
const COOKIE_VARIANTE = "hn_ab";
const DIAS_VARIANTE = 60 * 60 * 24 * 45;

function esVariante(v: string | undefined | null): v is Variante {
  return v === "a" || v === "b" || v === "c";
}

/**
 * A quién le toca cuál. El `?v=` de la URL manda sobre todo lo demás: es lo
 * que permite abrir las tres a voluntad para revisarlas o mostrarlas, sin
 * esperar a que el azar reparta.
 */
function asignarVariante(request: NextRequest): { variante: Variante; nueva: boolean } {
  const forzada = request.nextUrl.searchParams.get("v")?.toLowerCase();
  if (esVariante(forzada)) return { variante: forzada, nueva: true };

  // La prueba se cerró el 23 de septiembre con la A adelante (37 % frente a
  // 32 % y 15 % de visitas que tocaron boletería): todo el mundo ve la
  // completa. `?v=b` y `?v=c` siguen sirviendo para revisarlas.
  const guardada = request.cookies.get(COOKIE_VARIANTE)?.value;
  return { variante: "a", nueva: guardada !== "a" };
}

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
    // El formulario de compra sale de aquí y termina en Wompi: Chrome aplica
    // `form-action` a toda la cadena de redirecciones del envío, así que la
    // pasarela tiene que estar permitida o el pago se bloquea en el navegador.
    "form-action 'self' https://checkout.wompi.co",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  // Next lee el nonce de la cabecera en la petición y lo aplica solo a sus
  // propios scripts y a los <Script>; por eso viaja en las dos direcciones.
  const { variante, nueva } = asignarVariante(request);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-variante", variante);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  if (nueva) {
    // Legible desde JavaScript a propósito: el rastro tiene que poder decir
    // con qué versión se comportó cada visita. No es un secreto, es la
    // etiqueta del experimento.
    response.cookies.set(COOKIE_VARIANTE, variante, {
      path: "/",
      maxAge: DIAS_VARIANTE,
      sameSite: "lax",
      secure: true,
    });
  }

  return response;
}

export const config = {
  matcher: [
    {
      // `webhook`, `p/`, `l/` e `i/` quedan fuera junto a `api`: ninguno renderiza
      // nada, así que la CSP no les aplica, y el límite por IP sí les haría
      // daño. Luma e Infobip entregan sus callbacks desde un puñado de
      // direcciones —una tanda de registros se vería como una sola IP
      // inundando el sitio—, y un enlace corto recién publicado recibe su pico
      // de clics justo cuando no puede fallar.
      source: "/((?!api|webhook|p/|l/|i/|_next/static|_next/image|favicon.ico|.well-known).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
