import type { Metadata, Viewport } from "next";
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

const title = `${EVENT.name} ${EVENT.city} — El agente inmobiliario con IA`;
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
    siteName: `${EVENT.name} ${EVENT.city}`,
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
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
        <Pixels />
      </body>
    </html>
  );
}
