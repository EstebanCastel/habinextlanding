import Image from "next/image";
import Dot from "@/components/Dot";
import Reveal from "@/components/Reveal";
import Thread from "@/components/Thread";

const notes = [
  {
    title: "No necesitas ser experto en tecnología.",
    body: "Necesitas llegar con ganas de aprender, tu computador y tu celular.",
  },
  {
    title: "Conocer herramientas no es suficiente.",
    body: "Aquí aprendes, paso a paso, cómo incorporarlas a tu negocio inmobiliario.",
  },
  {
    title: "La meta no es solo que aprendas sobre IA.",
    body: "Es que empieces a usarla, desde el mismo día del evento.",
  },
];

export default function Industria() {
  return (
    <section className="s-paper relative w-full overflow-hidden">
      {/* El hilo baja por el centro, que aquí es zona de texto. Pasa más
          tenue que en el resto de la página: sigue conectando las secciones
          sin leerse como una raya encima de lo que hay que leer. */}
      <Thread from={50} to={78} bias={0.62} opacity={0.2} />

      {/* Curva gamma que oscurece la foto. Con la anterior —blanco y negro y
          clara— hacía falta 1.75 para que no flotara sobre el papel blanco.
          La foto del evento ya entra en 100 de luminancia y es cálida, así
          que a 1.75 se volvía barro: queda en 1.15, lo justo para asentarla.
          Al ser gamma —y no un velo encima— la madera y las lámparas
          conservan detalle. */}
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <filter id="ind-dim" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="gamma" exponent="1.15" />
            <feFuncG type="gamma" exponent="1.15" />
            <feFuncB type="gamma" exponent="1.15" />
          </feComponentTransfer>
        </filter>
      </svg>

      <div className="relative z-20 px-5 py-20 sm:px-8 md:px-14 md:py-24 lg:px-20">
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <p className="mb-7 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet md:text-xs">
              <Dot className="h-1.5 w-1.5" />
              La industria está cambiando
            </p>
          </Reveal>

          {/* Con seis renglones cortos el titular cabe en media columna, así
              que la foto vuelve a su costado en vez de dejar medio ancho
              vacío debajo. */}
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              {/* Dos pesos y nada más: el texto en regular y en negrita solo
                  lo que nombra el tema y lo que el evento va a cambiar. Sin
                  subrayado, que era un cuarto énfasis. "buscamos clientes,"
                  lleva además el morado de la marca, con la coma dentro del
                  color para que no quede un signo negro suelto al final del
                  renglón.

                  Los seis renglones son partidos a mano, no los que caigan
                  solos. El más largo —"cómo buscamos clientes,"— es el que
                  fija el tamaño: el titular escala con el ancho de la ventana
                  para que ninguno se parta dentro de su columna. Por debajo de
                  lg pasa a una sola columna y se reparten solos. */}
              <h2
                className="font-normal leading-[1.06] tracking-tight"
                style={{ fontSize: "clamp(1.75rem, 3.6vw, 3.4rem)" }}
              >
                La <span className="font-bold">Inteligencia Artificial</span>
                <br />
                ya está transformando
                <br />
                cómo <span className="font-bold text-violet">buscamos clientes,</span>
                <br />
                creamos contenido,
                <br />
                hacemos seguimiento
                <br />
                y cerramos negocios.
              </h2>

              {/* Destacado: el morado de la marca en bloque, con el texto en
                  blanco. Mismos dos pesos que el titular —regular de base y
                  negrita en la frase que carga el argumento—, así el bloque
                  resalta por el color y no por el tamaño. */}
              <p className="mt-9 max-w-sm rounded-2xl bg-violet px-5 py-4 text-sm leading-relaxed text-white md:text-base">
                El inventario no cambió.{" "}
                <span className="font-bold">Cambió quién llega primero al cliente</span> y con qué
                herramientas.
              </p>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[28px]">
                <Image
                  src="/img/industria-cambiando.webp"
                  alt="Brokers conversando alrededor de la mesa en un encuentro de Habi"
                  fill
                  /* Igual que en las tarjetas de Escenarios: con object-cover
                     la foto se recorta de lado, así que el ancho pintado es
                     1,18 veces el del contenedor. */
                  sizes="(max-width: 1024px) 106vw, 50vw"
                  style={{ filter: "url(#ind-dim)" }}
                  className="object-cover"
                />
                {/* Morado en la base para atar la foto a la paleta. Con la
                    foto a color y de luz cálida, 35% la teñía de lila: a 18%
                    ancla el pie de la imagen y deja la escena en su color. */}
                <div className="absolute inset-0 bg-gradient-to-t from-violet/18 to-violet/0 to-[45%]" />
              </div>
            </Reveal>
          </div>

          <ul className="mt-16 grid gap-8 md:mt-20 md:grid-cols-3">
            {notes.map((note, i) => (
              <Reveal as="li" key={note.title} delay={i * 0.08}>
                <div className="flex h-full flex-col gap-3 border-t-2 border-[var(--hair)] pt-5">
                  <Dot
                    color={i === 1 ? "var(--violet-soft)" : "var(--violet)"}
                    className="h-2.5 w-2.5 md:h-3 md:w-3"
                  />
                  <p className="text-lg font-semibold leading-tight tracking-tight md:text-xl">
                    {note.title}
                  </p>
                  <p className="text-base font-light leading-relaxed text-black/55">{note.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
