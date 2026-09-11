import type { Metadata, Viewport } from "next";
import Rastro from "@/components/Rastro";
import { Urbanist } from "next/font/google";
import Pixels from "@/components/Pixels";
import { EVENT } from "@/config/event";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const title = `${EVENT.fullName} — El agente inmobiliario con IA`;
const description =
  "Un evento de un día para agentes inmobiliarios y financieros que quieren usar Inteligencia Artificial para atraer más clientes, crear contenido, organizar sus oportunidades y construir un asistente que trabaje 24/7.";

export const metadata: Metadata = {
  metadataBase: new URL("https://habinextlanding.vercel.app"),
  title,
  description,
  keywords: [
    "Habi Next",
    "agente inmobiliario",
    "inteligencia artificial inmobiliaria",
    "evento inmobiliario Bogotá",
    "brokers inmobiliarios",
    "IA para vender vivienda",
  ],
  openGraph: {
    title,
    description,
    type: "website",
    locale: "es_CO",
    siteName: EVENT.fullName,
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
  /**
   * Verificación del dominio ante Meta.
   *
   * Meta **rechaza toda plantilla de WhatsApp cuyo botón apunte a un dominio
   * sin verificar**, y lo hace sin decir por qué: la plantilla queda en
   * REJECTED y no hay forma de saber la causa por la API. Está comprobado
   * contra la cuenta real — el mismo botón, con el mismo texto, pasa la
   * revisión si apunta a un dominio ya verificado y la falla si apunta a
   * habinext.com.
   *
   * El código sale de Meta Business Manager → Configuración del negocio →
   * Seguridad de la marca → Dominios. Al ponerlo en `META_DOMAIN_VERIFICATION`
   * esta etiqueta aparece en el `<head>` y el dominio queda verificado.
   */
  ...(process.env.META_DOMAIN_VERIFICATION
    ? { other: { "facebook-domain-verification": process.env.META_DOMAIN_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO" className={urbanist.variable}>
      <body className="antialiased">
        {children}
        <Rastro />
        <Pixels />
      </body>
    </html>
  );
}
