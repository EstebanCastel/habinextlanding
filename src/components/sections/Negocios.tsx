import Image from "next/image";
import Asterisk from "@/components/Asterisk";
import Reveal from "@/components/Reveal";
import Seam from "@/components/Seam";
import Thread from "@/components/Thread";

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
      <Seam variant="wave" color="var(--lavender)" />
      <Thread from={[18, 50, 82]} to={50} opacity={0.5} />

      <div className="absolute inset-0">
        <Image
          src="/img/Fondo_4.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-80"
          style={{ objectPosition: "12% center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050208]/45 via-[#050208]/72 to-[#050208]" />
      </div>

      <div className="relative z-20 px-5 pt-28 pb-24 sm:px-8 md:px-14 md:pt-44 md:pb-36 lg:px-20">
        <div className="mx-auto flex max-w-[1400px] justify-end">
          <div className="w-full lg:w-[58%]">
            <Reveal>
              <p className="mb-7 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#ba9dfa] md:text-xs">
                <Asterisk className="h-4 w-4" />
                Networking
              </p>
            </Reveal>

            <Reveal delay={0.05}>
              <h2 className="text-4xl font-light leading-[0.92] tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
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
              <p className="mt-10 max-w-xl border-l-[3px] border-[#802ef6] pl-6 text-xl font-semibold leading-snug tracking-tight md:text-2xl">
                La tecnología puede acelerar los negocios. Pero los negocios siguen ocurriendo
                entre personas.
              </p>
            </Reveal>

            <dl className="mt-12 grid gap-8 sm:grid-cols-3">
              {cifras.map((c, i) => (
                <Reveal key={c.valor} delay={0.18 + i * 0.07}>
                  <div className="border-t border-white/15 pt-5">
                    <dt className="text-3xl font-bold tracking-tighter text-[#ba9dfa] md:text-4xl">
                      {c.valor}
                    </dt>
                    <dd className="mt-2 text-sm font-light leading-snug text-white/55 md:text-base">
                      {c.label}
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
