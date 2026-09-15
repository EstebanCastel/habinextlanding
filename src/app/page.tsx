import { headers } from "next/headers";
import { connection } from "next/server";
import Nav from "@/components/Nav";
import Aprendizajes from "@/components/sections/Aprendizajes";
import Boleteria from "@/components/sections/Boleteria";
import Cierre from "@/components/sections/Cierre";
import Construir from "@/components/sections/Construir";
import Countdown from "@/components/sections/Countdown";
import Escenarios from "@/components/sections/Escenarios";
import Footer from "@/components/sections/Footer";
import Futuro from "@/components/sections/Futuro";
import Hero from "@/components/sections/Hero";
import Industria from "@/components/sections/Industria";
import Negocios from "@/components/sections/Negocios";
import ParaQuien from "@/components/sections/ParaQuien";
import Ticker from "@/components/sections/Ticker";
import { EVENT, TICKETS } from "@/config/event";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: EVENT.fullName,
  startDate: EVENT.startsAt,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  description:
    "Un evento de un día para agentes inmobiliarios y financieros que quieren usar Inteligencia Artificial para vender más.",
  location: {
    "@type": "Place",
    name: EVENT.venue || EVENT.venueLabel,
    address: {
      "@type": "PostalAddress",
      ...(EVENT.venueAddress ? { streetAddress: EVENT.venueAddress } : {}),
      addressLocality: EVENT.city,
      addressCountry: "CO",
    },
  },
  organizer: { "@type": "Organization", name: "Habi", url: "https://habi.co" },
  offers: TICKETS.map((t) => ({
    "@type": "Offer",
    name: t.name,
    price: t.stages[0].price.replace(/[^0-9]/g, ""),
    priceCurrency: "COP",
    url: t.href,
    availability: "https://schema.org/InStock",
  })),
};

/**
 * Las tres versiones que se están comparando.
 *
 * Lo único que cambia es **qué tan lejos queda la boletería del hero**. En la
 * página completa está en el puesto 10 de 12, y los datos dicen que solo 38 de
 * cada 130 visitas llegan hasta ahí: el resto se va antes de ver un precio.
 *
 *   a · completa — todo el recorrido, la boletería al final
 *   b · corta — se queda con lo que responde "¿qué me llevo?" y sube la
 *       boletería al cuarto lugar; después sigue convenciendo a quien no compró
 *   c · directa — hero y precio, sin nada en medio
 *
 * B y C no son A recortada al azar: B conserva el argumento y solo lo ordena
 * distinto, C apuesta a que quien llega por un enlace de alguien conocido ya
 * viene convencido y solo quiere saber cuánto cuesta.
 */
function Completa() {
  return (
    <>
      <Hero />
      <Ticker />
      <Industria />
      <Aprendizajes />
      <Construir />
      <ParaQuien />
      <Negocios />
      <Escenarios />
      <Futuro />
      <Boleteria />
      <Countdown />
      <Cierre />
    </>
  );
}

function Corta() {
  return (
    <>
      <Hero />
      <Ticker />
      <Aprendizajes />
      <Boleteria />
      <ParaQuien />
      <Escenarios />
      <Countdown />
      <Cierre />
    </>
  );
}

function Directa() {
  return (
    <>
      <Hero />
      <Boleteria />
      <Aprendizajes />
      <Countdown />
      <Cierre />
    </>
  );
}

export default async function Page() {
  // El nonce de la CSP se aplica durante el render en servidor, así que la
  // página tiene que esperar a la petición en lugar de generarse en el build.
  await connection();

  // La reparte el proxy, antes de este render: así nadie ve una versión y
  // después otra.
  const variante = (await headers()).get("x-variante") ?? "a";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main>
        {variante === "c" ? <Directa /> : variante === "b" ? <Corta /> : <Completa />}
      </main>
      <Footer />
    </>
  );
}
