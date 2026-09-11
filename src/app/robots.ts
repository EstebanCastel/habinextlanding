import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://habinextlanding.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // El panel de operación y los links personales de pago no son
        // contenido: indexarlos expondría rutas de trabajo en los buscadores.
        // Es una señal para los robots que se portan bien; lo que de verdad
        // protege el panel es la clave, y al link de pago, su token.
        disallow: ["/admin", "/p/", "/webhook", "/api/"],
        // `/l/` sí se deja: son los enlaces que se publican en redes.
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
