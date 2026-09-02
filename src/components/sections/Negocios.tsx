import Image from "next/image";
import Dot from "@/components/Dot";
import Reveal from "@/components/Reveal";

const cifras = [
  { valor: "Cientos", label: "de agentes y brokers en un mismo día" },
  { valor: "4", label: "espacios distintos para encontrarse" },
  { valor: "1", label: "red que sigue funcionando después del evento" },
];

/**
 * Las tres ramas de los perfiles vuelven a juntarse en una sola: aprendieron
 * por separado, hacen negocios en el mismo sitio.
 */
export default function Negocios() {
  return (
    <section className="s-night relative w-full overflow-hidden">

      <div className="absolute inset-0">
        <Image
          src="/img/Fondo_4.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-80"
          style={{ objectPosition: "12% center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-night/45 via-night/72 to-night" />
      </div>

      <div className="relative z-20 px-5 py-24 sm:px-8 md:px-14 md:py-36 lg:px-20">
        <div className="mx-auto flex max-w-[1400px] justify-end">
          <div className="w-full lg:w-[58%]">
            <Reveal>
              <p className="mb-7 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft md:text-xs">
                <Dot className="h-1.5 w-1.5" />
                Networking
              </p>
            </Reveal>

            <Reveal delay={0.05}>
              <h2 className="text-3xl font-light leading-[0.96] tracking-tighter sm:text-4xl md:text-5xl lg:text-[3.75rem]">
                También vienes a
                <br />
                <span className="font-bold">hacer negocios.</span>
              </h2>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-8 max-w-2xl text-lg font-light leading-relaxed text-white/70 md:text-xl">
                Habi Next reúne a cientos de agentes, brokers y líderes de la industria
                inmobiliaria. Será un espacio para aprender, pero también para conocer personas,
                encontrar proveedores, detectar oportunidades y construir nuevas relaciones.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              {/* Sin franja lateral de color: el tamaño y el peso ya separan
                  esta frase del párrafo de arriba. */}
              <p className="mt-10 max-w-xl text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
                La tecnología puede acelerar los negocios. Pero los negocios siguen ocurriendo
                entre personas.
              </p>
            </Reveal>

            {/* Un solo div por grupo dt/dd: el <dl> solo admite un nivel de
                div envolviendo cada par, y el Reveal metía otro dentro, lo que
                rompía la lista para lectores de pantalla. */}
            <dl className="mt-12 grid gap-8 sm:grid-cols-3">
              {cifras.map((c, i) => (
                <Reveal
                  key={c.valor}
                  delay={0.18 + i * 0.07}
                  className="border-t border-white/15 pt-5"
                >
                  <dt className="text-3xl font-bold tracking-tighter text-violet-soft md:text-4xl">
                    {c.valor}
                  </dt>
                  <dd className="mt-2 text-sm font-light leading-snug text-white/60 md:text-base">
                    {c.label}
                  </dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
