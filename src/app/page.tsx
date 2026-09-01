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

/** Regenera cada hora para que la etapa de boletería vigente esté al día. */
export const revalidate = 3600;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: `${EVENT.name} ${EVENT.city}`,
  startDate: EVENT.startsAt,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  description:
    "Un evento de un día para agentes inmobiliarios y financieros que quieren usar Inteligencia Artificial para vender más.",
  location: {
    "@type": "Place",
    name: EVENT.venue || EVENT.venueLabel,
    address: { "@type": "PostalAddress", addressLocality: EVENT.city, addressCountry: "CO" },
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

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main>
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
      </main>
      <Footer />
    </>
  );
}
