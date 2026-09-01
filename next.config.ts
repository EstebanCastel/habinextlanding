import type { NextConfig } from "next";

/**
 * Origen canónico del sitio. Se usa para cerrar el CORS de los estáticos, que
 * de otro modo Vercel sirve con `Access-Control-Allow-Origin: *`.
 */
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://habinextlanding.vercel.app";

/**
 * Cabeceras de defensa. La Content-Security-Policy NO va aquí: se genera por
 * petición en `src/proxy.ts` porque lleva un nonce distinto cada vez.
 */
const securityHeaders = [
  // Fuerza HTTPS durante dos años, incluidos subdominios.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Clickjacking: nadie puede meter la landing en un iframe.
  { key: "X-Frame-Options", value: "DENY" },
  // Impide que el navegador adivine el tipo de contenido.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No filtra la URL completa hacia terceros (dominios externos solo ven el origen).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Apaga todas las APIs del navegador que esta página no necesita.
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "browsing-topics=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "geolocation=()",
      "gyroscope=()",
      "interest-cohort=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "picture-in-picture=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "serial=()",
      "usb=()",
      "xr-spatial-tracking=()",
    ].join(", "),
  },
  // Aísla la pestaña de cualquier ventana que la abra o que ella abra.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Los recursos del sitio no se pueden incrustar desde otros orígenes.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Cierra el CORS abierto que el CDN pone por defecto en los estáticos.
  { key: "Access-Control-Allow-Origin", value: SITE_ORIGIN },
  { key: "Vary", value: "Origin" },
];

const nextConfig: NextConfig = {
  // No anunciar el framework ni su versión.
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // La landing solo sirve imágenes propias; ningún host remoto está permitido.
    remotePatterns: [],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/.well-known/security.txt",
        headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }],
      },
    ];
  },
};

export default nextConfig;
