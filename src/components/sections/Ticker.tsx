import Asterisk from "@/components/Asterisk";
import { EVENT } from "@/config/event";

const items = [
  `${EVENT.dateShort} de 2026`,
  EVENT.city,
  "Un día completo",
  "Escenario Inspira",
  "Escenario Taller",
  "Espacio VIP",
  "Zona Partners",
  "Agentes inmobiliarios y financieros",
];

/** Cinta morada entre el hero y el primer bloque de contenido. */
export default function Ticker() {
  return (
    <div className="relative w-full overflow-hidden border-y-[3px] border-black bg-[#802ef6] py-4 md:py-5">
      <div className="habi-marquee flex w-max items-center">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center" aria-hidden={copy === 1}>
            {items.map((item) => (
              <span key={item} className="flex items-center">
                <span className="whitespace-nowrap px-6 text-sm font-semibold uppercase tracking-[0.22em] text-white md:px-9 md:text-base">
                  {item}
                </span>
                <Asterisk color="#ffffff" className="h-4 w-4 shrink-0 md:h-5 md:w-5" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
