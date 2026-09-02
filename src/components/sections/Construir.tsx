import Asterisk from "@/components/Asterisk";
import Reveal from "@/components/Reveal";
import Thread from "@/components/Thread";

const contrasts = [
  {
    no: "No es una charla de horas sobre Inteligencia Artificial.",
    si: "Es una experiencia práctica, con tu computador abierto.",
  },
  {
    no: "No recorres una agenda de temas sueltos.",
    si: "Recorres las etapas del negocio de un agente inmobiliario.",
  },
  {
    no: "No sales con una lista de herramientas por probar.",
    si: "Sales con tu propio sistema empezado.",
  },
];

export default function Construir() {
  return (
    <section id="experiencia" className="s-violet relative w-full overflow-hidden">
      {/* Sin costura y sin borde: esta sección abre y cierra con un corte
          recto, el cambio de color y nada más. La figura dentada se leía como
          un error de render. */}
      <Thread from={22} to={50} opacity={0.35} />

      <div className="relative z-20 px-5 py-20 sm:px-8 md:px-14 md:py-24 lg:px-20">
        <div className="mx-auto max-w-[1400px]">
          {/* Las dos columnas comparten centro vertical: tienen alturas
              distintas (391 y 422px) y antes la lista además llevaba un
              pt-6 suelto, así que quedaba 24px más abajo arriba y 55px más
              abajo al cerrar. */}
          <div className="grid gap-14 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:gap-20">
            <Reveal>
              <h2 className="text-3xl font-light leading-[0.96] tracking-tighter sm:text-4xl md:text-5xl lg:text-[3.75rem]">
                No vienes
                <br />
                solo a escuchar.
                <br />
                <span className="font-bold">Vienes a construir.</span>
              </h2>
              <div className="mt-9 flex items-center gap-3">
                <Asterisk color="#ffffff" className="h-9 w-9 md:h-12 md:w-12" />
                <Asterisk color="var(--violet-deep)" className="h-9 w-9 md:h-12 md:w-12" />
                <Asterisk color="#ffffff" className="h-9 w-9 md:h-12 md:w-12" />
              </div>
              <p className="mt-9 max-w-md text-lg font-light leading-relaxed text-white/80 md:text-xl">
                Queremos que llegues como agente inmobiliario y salgas entendiendo cómo convertirte
                en un Agente Inmobiliario con IA.
              </p>
            </Reveal>

            {/* Cada fila tacha lo que el evento no es y deja debajo lo que sí. */}
            <ul className="flex flex-col gap-9">
              {contrasts.map((c, i) => (
                <Reveal as="li" key={c.si} delay={i * 0.08}>
                  <div className="border-t border-white/30 pt-6">
                    {/* 85% y no 55%: sobre un morado saturado no hay margen
                        para bajar opacidad —al 55% daba 2,72:1—. Lo que separa
                        el "no" del "sí" es el tachado y el peso, no el tono. */}
                    <p className="text-base font-light leading-snug text-white/85 line-through decoration-white/60 md:text-lg">
                      {c.no}
                    </p>
                    <p className="mt-3 text-xl font-semibold leading-snug tracking-tight md:text-2xl">
                      {c.si}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
