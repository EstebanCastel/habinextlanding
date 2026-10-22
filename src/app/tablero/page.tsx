import type { Metadata } from "next";
import Image from "next/image";
import Refresco from "@/components/tablero/Refresco";
import { EVENT } from "@/config/event";
import { haySesion } from "@/lib/sesion";
import { armarTablero, hora, type Tablero } from "@/lib/tablero";
import type { Agrupado } from "@/config/temas";

/**
 * El tablero de cierre: cómo salió el día, en una pantalla.
 *
 * Abierto, sin clave: acá solo hay agregados. Ni un nombre, ni un correo, ni
 * una sola respuesta de texto —que es donde la gente escribe cosas que dijo
 * para nosotros y no para una pantalla pública—. Lo que se ve es cuánta gente
 * calificó qué, y eso se comparte sin exponer a nadie.
 *
 * Fuera de los buscadores igual, y sin caché nunca: el único error que de
 * verdad importa acá es que alguien decida con el número de hace una hora.
 */

export const metadata: Metadata = {
  title: `Cómo salió · ${EVENT.fullName}`,
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VERDE = "#2ee6a6";
const AMBAR = "#ffb347";
const ROJO = "#ff5c7a";
const VIOLETA = "#802ef6";

const pct = (n: number, de: number) => (de > 0 ? Math.round((n / de) * 100) : 0);

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-violet-soft">{children}</p>
  );
}

/** Una fila con su barra. El valor va al lado, no encima: se lee de un vistazo. */
function Fila({
  nombre,
  pista,
  valor,
  parte,
  color = VIOLETA,
}: {
  nombre: string;
  pista?: string;
  valor: string;
  parte: number;
  color?: string;
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[14px] font-bold text-white">{nombre}</span>
        <span className="flex-none text-[14px] font-extrabold tabular-nums" style={{ color }}>
          {valor}
        </span>
      </div>
      <div className="tb-barra mt-1.5">
        <i style={{ "--p": Math.max(0, Math.min(1, parte)), "--c": color } as React.CSSProperties} />
      </div>
      {pista ? <p className="mt-1 text-[11px] font-light text-white/35">{pista}</p> : null}
    </li>
  );
}

/**
 * Una nota de 1 a 5 en cinco bloques.
 *
 * Con una barra corrida todas las partes del día se veían iguales: entre 3,98
 * y 4,90 hay apenas un 18% de barra. En bloques, esa misma diferencia es un
 * bloque entero y se ve desde el otro lado del salón.
 */
function Bloques({ valor, color }: { valor: number; color: string }) {
  return (
    <span className="flex gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => {
        const lleno = Math.max(0, Math.min(1, valor - (n - 1)));
        return (
          <span key={n} className="tb-barra h-2.5 flex-1">
            <i style={{ "--p": lleno, "--c": color } as React.CSSProperties} />
          </span>
        );
      })}
    </span>
  );
}

/** Tres pedazos en una sola tira, con su leyenda debajo. */
function Reparto({
  titulo,
  datos,
}: {
  titulo: string;
  datos: { etiqueta: string; n: number; color: string }[];
}) {
  const total = datos.reduce((a, d) => a + d.n, 0) || 1;
  return (
    <div>
      <p className="text-[13px] font-bold text-white">{titulo}</p>
      <div className="tb-tira mt-2">
        {datos.map((d) => (
          <span key={d.etiqueta} style={{ flexBasis: `${(d.n / total) * 100}%`, background: d.color }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {datos.map((d) => (
          <li key={d.etiqueta} className="flex items-center gap-1.5 text-[12px] font-medium text-white/55">
            <span className="size-2 rounded-full" style={{ background: d.color }} aria-hidden="true" />
            {d.etiqueta}
            <b className="font-extrabold tabular-nums text-white">{d.n}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Un tema de las respuestas abiertas.
 *
 * Las citas van dentro de un `<details>`: en el celular, diez temas con cuatro
 * citas cada uno son una pared de texto que nadie lee. Cerrado se ve el mapa
 * completo de un vistazo; abierto, lo que de verdad escribió la gente.
 */
function Fila0({ g, tope, color, conClave }: { g: Agrupado; tope: number; color: string; conClave: boolean }) {
  return (
    <li className="border-t border-white/8 pt-3.5 first:border-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-[15px] font-bold leading-tight text-white">{g.tema.nombre}</span>
        <span className="flex-none text-[15px] font-extrabold tabular-nums" style={{ color }}>{g.n}</span>
      </div>
      <div className="tb-barra mt-1.5">
        <i style={{ "--p": g.n / tope, "--c": color } as React.CSSProperties} />
      </div>
      <p className="mt-1.5 text-[12px] font-light leading-snug text-white/40">{g.tema.pista}</p>
      {conClave && g.citas.length ? (
        <details className="group mt-2">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[12px] font-bold text-violet-soft [&::-webkit-details-marker]:hidden">
            Lo que escribieron
            <svg viewBox="0 0 24 24" className="size-3.5 transition-transform group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </summary>
          <ul className="mt-2 space-y-2">
            {g.citas.map((c, i) => (
              <li key={i} className="rounded-xl bg-white/[0.04] px-3 py-2.5 text-[13px] font-light leading-relaxed text-white/70">
                <span className="mr-1.5 font-extrabold tabular-nums" style={{ color: c.nps >= 9 ? VERDE : c.nps >= 7 ? AMBAR : ROJO }}>
                  {c.nps}
                </span>
                {c.texto.trim()}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

function Cuerpo({ t, conClave }: { t: Tablero; conClave: boolean }) {
  const { nps, cortes: c } = t;
  const u = t.uso?.dentro;
  const l = t.uso?.luma;
  const puerta = t.uso?.puerta ?? c.puerta;
  const flojo = t.partes.at(-1);

  const usos = u
    ? [
        { nombre: "Hicieron su carnet", n: u.carnet },
        { nombre: "Reservaron taller", n: u.talleres },
        { nombre: "Marcaron charlas", n: u.agenda, pista: `${u.agendaTotal.toLocaleString("es-CO")} «me interesa»` },
        { nombre: "Publicaron en redes", n: u.publicaron, pista: `${u.publicaciones} publicaciones` },
        { nombre: "Escogieron turno de almuerzo", n: u.almuerzo },
        { nombre: "Conectaron LinkedIn", n: u.linkedin },
        { nombre: "Recorrieron el mapa", n: u.paradas, pista: `${u.paradasTotal} paradas` },
        { nombre: "Subieron fotos", n: u.conFoto, pista: `${u.fotosEvento} fotos` },
      ]
    : [];

  return (
    <div className="relative z-[3] mx-auto w-full max-w-5xl px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-20 md:px-8">
      <header className="flex items-center justify-between gap-4">
        <Image src="/img/habi-next-logo.svg" alt={EVENT.fullName} width={780} height={260} priority className="h-8 w-auto" />
        <span className="text-[12px] font-bold text-white/40">
          Actualizado {hora(t.armadoEn)}
        </span>
      </header>

      {t.fallos.length ? (
        <p className="mt-6 rounded-2xl border border-[#ff5c7a]/40 bg-[#ff5c7a]/10 px-5 py-4 text-[14px] font-bold leading-relaxed text-[#ff5c7a]">
          No pude leer los datos, así que los ceros de abajo no son reales:
          <br />
          <span className="font-mono text-[12px] font-normal">{t.fallos.join(" · ")}</span>
        </p>
      ) : null}

      {/* El NPS es el titular: es el número que todo el mundo va a repetir. */}
      <section className="mt-8 sm:mt-12">
        <Eyebrow>Cómo salió el día · 20 de octubre</Eyebrow>
        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1 sm:mt-4 sm:gap-x-6">
          <p className="enc-numero select-none text-[64px] leading-[0.8] sm:text-[clamp(82px,26vw,136px)]" aria-hidden="true">NPS</p>
          <p className="pb-1 text-[60px] font-black leading-none tracking-[-0.06em] tabular-nums sm:pb-2 sm:text-[96px]" style={{ color: nps.nps >= 50 ? VERDE : nps.nps >= 0 ? AMBAR : ROJO }}>
            {nps.nps > 0 ? "+" : ""}{nps.nps}
          </p>
        </div>
        <p className="mt-1 text-[16px] font-light leading-snug text-white/60 sm:text-[17px]">
          Sobre <b className="font-extrabold text-white">{t.n}</b> {t.n === 1 ? "respuesta" : "respuestas"}, con nota
          promedio de <b className="font-extrabold text-white tabular-nums">{t.notaPromedio.toFixed(2)}</b> sobre 10.
        </p>

        <div className="tb-tira mt-5 h-4">
          <span style={{ flexBasis: `${pct(nps.promotores, nps.n)}%`, background: VERDE }} />
          <span style={{ flexBasis: `${pct(nps.pasivos, nps.n)}%`, background: AMBAR }} />
          <span style={{ flexBasis: `${pct(nps.detractores, nps.n)}%`, background: ROJO }} />
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { n: nps.promotores, t: "Promotores", s: "9 y 10", c: VERDE },
            { n: nps.pasivos, t: "Pasivos", s: "7 y 8", c: AMBAR },
            { n: nps.detractores, t: "Detractores", s: "0 a 6", c: ROJO },
          ].map((x) => (
            <li key={x.t} className="tb-tarjeta px-3 py-3 sm:px-4">
              <p className="text-[26px] font-black leading-none tabular-nums sm:text-[30px]" style={{ color: x.c }}>{x.n}</p>
              <p className="mt-1.5 text-[13px] font-bold text-white">{x.t}</p>
              <p className="text-[11px] font-light text-white/35">{x.s}</p>
            </li>
          ))}
        </ul>

        {/* Quién contestó: el enlace salió a los 852 de Luma, no solo a quien vino. */}
        <div className="tb-tarjeta mt-4 p-5 sm:mt-5 sm:p-6">
          <Eyebrow>Y si solo cuentas a los que vinieron</Eyebrow>
          <p className="mt-2 text-[15px] font-light leading-snug text-white/50">
            El enlace salió a las {(852).toLocaleString("es-CO")} personas de Luma, vinieran o no, y las anónimas no se
            pueden cruzar con la puerta. Así se reparte:
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { t: "Con QR leído", s: "Estuvieron, sin duda", d: c.confirmados, destacar: true },
              { t: "Sin QR leído", s: "La puerta no los registró", d: c.sinQr, destacar: false },
              { t: "Anónimas", s: "No se sabe quién", d: c.anonimas, destacar: false },
            ].map((x) => (
              <li
                key={x.t}
                className={`rounded-[18px] border px-4 py-3.5 ${
                  x.destacar ? "border-violet/50 bg-violet/10" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <p className="flex items-baseline gap-2">
                  <span className="text-[26px] font-black leading-none tabular-nums text-white">{x.d.n}</span>
                  <span
                    className="text-[15px] font-extrabold tabular-nums"
                    style={{ color: x.d.n === 0 ? "rgba(255,255,255,.3)" : x.d.nps >= 50 ? VERDE : x.d.nps >= 0 ? AMBAR : ROJO }}
                  >
                    {x.d.n === 0 ? "—" : `NPS ${x.d.nps > 0 ? "+" : ""}${x.d.nps}`}
                  </span>
                </p>
                <p className="mt-1.5 text-[13px] font-bold text-white">{x.t}</p>
                <p className="text-[11px] font-light text-white/35">{x.s}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] font-light leading-relaxed text-white/45">
            El número que vale para presumir es el de la izquierda:{" "}
            <b className="font-extrabold text-white">
              NPS {c.confirmados.nps > 0 ? "+" : ""}{c.confirmados.nps}
            </b>{" "}
            entre quienes de verdad estuvieron. Todo lo demás en esta página mezcla los tres grupos.
          </p>
        </div>
      </section>

      {/* El embudo del día. Sin el techo de Luma, «478 carnets» no dice si es
          mucho o poco; con él se ve que es el 60% de todo el que se registró. */}
      {u && l ? (
        <section className="tb-tarjeta mt-8 p-5 sm:mt-10 sm:p-6">
          <Eyebrow>Cuánta gente, de principio a fin</Eyebrow>
          <ul className="mt-5 space-y-4">
            {[
              { n: l.aprobados, t: "Aprobados en Luma", s: `General ${l.general} · VIP ${l.vip}`, c: VIOLETA },
              { n: puerta, t: "Entraron con QR leído", s: `${pct(puerta, l.aprobados)}% de los aprobados`, c: VERDE },
              { n: u.total, t: "Además abrieron la app", s: `${pct(u.total, puerta)}% de los que entraron`, c: "#ba9dfa" },
            ].map((x) => (
              <li key={x.t}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-[15px] font-bold leading-tight text-white">{x.t}</span>
                  <span className="flex-none text-[22px] font-black tabular-nums" style={{ color: x.c }}>{x.n}</span>
                </div>
                <div className="tb-barra mt-1.5">
                  <i style={{ "--p": x.n / l.aprobados, "--c": x.c } as React.CSSProperties} />
                </div>
                <p className="mt-1.5 text-[12px] font-light text-white/40">{x.s}</p>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-white/8 pt-4 text-[12px] font-light leading-relaxed text-white/35">
            Quedaron <b className="font-extrabold text-white/70">{l.pendientes}</b> sin aprobar y{" "}
            <b className="font-extrabold text-white/70">{l.rechazados}</b> rechazados en Luma, que no cuentan en
            ninguna cifra de esta página. La puerta subcontó: varias personas entraron sin que les leyeran el código.
          </p>
        </section>
      ) : null}

      <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 lg:grid-cols-2">
        {/* Calificación por parte: acá se ve qué jaló el NPS para abajo. */}
        <section className="tb-tarjeta p-5 sm:p-6">
          <Eyebrow>Cada parte del día</Eyebrow>
          <p className="mt-2 text-[15px] font-light leading-snug text-white/50">
            Promedio sobre 5.{" "}
            {flojo ? (
              <>
                Lo más flojo es <b className="font-bold text-white">{flojo.nombre.toLowerCase()}</b>, con{" "}
                <b className="font-extrabold tabular-nums" style={{ color: AMBAR }}>{flojo.promedio.toFixed(2)}</b>.
              </>
            ) : null}
          </p>
          <ul className="mt-5 space-y-4">
            {t.partes.map((p) => {
              const color = p.promedio >= 4.5 ? VERDE : p.promedio >= 4 ? VIOLETA : AMBAR;
              return (
                <li key={p.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[14px] font-bold text-white">{p.nombre}</span>
                    <span className="flex-none text-[14px] font-extrabold tabular-nums" style={{ color }}>
                      {p.promedio.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <Bloques valor={p.promedio} color={color} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Uso de la app, solo de quien entró de verdad por la puerta. */}
        <section className="tb-tarjeta p-5 sm:p-6">
          <Eyebrow>Qué hicieron en la app</Eyebrow>
          {u ? (
            <>
              <p className="mt-2 text-[15px] font-light leading-snug text-white/50">
                Solo gente que vino: <b className="font-extrabold text-white tabular-nums">{u.total}</b> personas con el
                QR leído en la puerta que además abrieron la app
                {l ? (
                  <>
                    , de <b className="font-extrabold text-white tabular-nums">{l.aprobados}</b> aprobadas en Luma y{" "}
                    <b className="font-extrabold text-white tabular-nums">{puerta}</b> que entraron
                  </>
                ) : null}
                . Esta tarjeta no mezcla a nadie más.
              </p>
              <ul className="mt-5 space-y-4">
                {usos.map((x) => (
                  <Fila
                    key={x.nombre}
                    nombre={x.nombre}
                    pista={[x.pista, l ? `${pct(x.n, l.aprobados)}% de los ${l.aprobados} registrados` : null]
                      .filter(Boolean)
                      .join(" · ")}
                    valor={`${x.n} · ${pct(x.n, u.total)}%`}
                    parte={x.n / u.total}
                    color={pct(x.n, u.total) >= 50 ? VERDE : pct(x.n, u.total) >= 25 ? VIOLETA : AMBAR}
                  />
                ))}
              </ul>
              <p className="mt-5 text-[11px] font-light text-white/30">
                Se recalcula aparte · {hora(t.uso!.armadoEn)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-[15px] font-light text-white/40">Todavía sin calcular.</p>
          )}
        </section>

        {/* Las charlas: esto es lo que decide la agenda del año entrante. */}
        <section className="tb-tarjeta p-5 sm:p-6">
          <Eyebrow>Las charlas que sirvieron</Eyebrow>
          <p className="mt-2 text-[15px] font-light leading-snug text-white/50">
            Cada quien escoge todas las que quiera. Esto arma la agenda del año entrante.
          </p>
          {t.charlas.length ? (
            <ol className="mt-5 space-y-3.5">
              {t.charlas.slice(0, 10).map((c, i) => (
                <li key={c.id} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 grid size-7 flex-none place-items-center rounded-[9px] text-[12px] font-black tabular-nums"
                    style={i === 0 ? { background: VIOLETA, color: "#fff" } : { background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.55)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[14px] font-bold text-white">{c.titulo}</span>
                      <span className="flex-none text-[14px] font-extrabold tabular-nums text-violet-soft">{c.votos}</span>
                    </span>
                    <span className="tb-barra mt-1.5 block">
                      <i style={{ "--p": c.votos / t.charlas[0].votos, "--c": i === 0 ? VIOLETA : "rgba(186,157,250,.55)" } as React.CSSProperties} />
                    </span>
                    <span className="mt-1 block truncate text-[11px] font-light text-white/35">
                      {c.desde ? `${c.desde} · ` : ""}{c.salon}{c.ponente ? ` · ${c.ponente}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-[15px] font-light text-white/40">Todavía sin votos.</p>
          )}
        </section>

        {/* Lo que escribieron, agrupado. Es lo único que dice QUÉ hacer. */}
        <section className="tb-tarjeta p-5 sm:p-6">
          <Eyebrow>Qué hay que arreglar</Eyebrow>
          <p className="mt-2 text-[15px] font-light leading-snug text-white/50">
            De {t.cualitativo.cambiar.total} que escribieron en «¿qué cambiarías?», agrupadas por lo que repitieron.
            Una respuesta puede contar en varios temas.
          </p>
          {t.cualitativo.cambiar.temas.length ? (
            <ul className="mt-5 space-y-3.5">
              {t.cualitativo.cambiar.temas.map((g, i) => (
                <Fila0
                  key={g.tema.id}
                  g={g}
                  tope={t.cualitativo.cambiar.temas[0].n}
                  color={i === 0 ? ROJO : i < 3 ? AMBAR : VIOLETA}
                  conClave={conClave}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[15px] font-light text-white/40">Todavía sin respuestas.</p>
          )}
          <p className="mt-5 border-t border-white/8 pt-4 text-[12px] font-light leading-relaxed text-white/35">
            <b className="font-extrabold text-white/70">{t.cualitativo.cambiar.sinQueja}</b> contestaron que no
            cambiarían nada · {t.cualitativo.cambiar.sinClasificar} dijeron algo que no entra en ningún tema
          </p>
        </section>

        <section className="tb-tarjeta p-5 sm:p-6">
          <Eyebrow>Qué se llevan</Eyebrow>
          <p className="mt-2 text-[15px] font-light leading-snug text-white/50">
            De {t.cualitativo.aplicar.total} que contestaron «¿qué vas a aplicar esta semana?». Esto mide si el día
            sirvió, no si gustó.
          </p>
          {t.cualitativo.aplicar.temas.length ? (
            <ul className="mt-5 space-y-3.5">
              {t.cualitativo.aplicar.temas.map((g, i) => (
                <Fila0
                  key={g.tema.id}
                  g={g}
                  tope={t.cualitativo.aplicar.temas[0].n}
                  color={i === 0 ? VERDE : VIOLETA}
                  conClave={conClave}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[15px] font-light text-white/40">Todavía sin respuestas.</p>
          )}
          <p className="mt-5 border-t border-white/8 pt-4 text-[12px] font-light leading-relaxed text-white/35">
            {t.cualitativo.aplicar.sinClasificar} respondieron algo que no entra en ningún tema
          </p>
        </section>

        {/* La plata del año entrante: vuelve, paga y cuánto aguantó el día. */}
        <section className="tb-tarjeta space-y-6 p-5 sm:p-6">
          <div>
            <Eyebrow>El año entrante</Eyebrow>
            <p className="mt-2 text-[15px] font-light leading-snug text-white/50">
              Si vuelven, si pagarían y si el día se sintió largo.
            </p>
          </div>
          <Reparto
            titulo="¿Vuelves?"
            datos={[
              { etiqueta: "Sí", n: t.vuelve.si ?? 0, color: VERDE },
              { etiqueta: "Tal vez", n: t.vuelve.talvez ?? 0, color: AMBAR },
              { etiqueta: "No", n: t.vuelve.no ?? 0, color: ROJO },
            ]}
          />
          <Reparto
            titulo="¿Pagarías la entrada?"
            datos={[
              { etiqueta: "Sí", n: t.pagaria.si ?? 0, color: VERDE },
              { etiqueta: "Depende del precio", n: t.pagaria.depende ?? 0, color: AMBAR },
              { etiqueta: "No", n: t.pagaria.no ?? 0, color: ROJO },
            ]}
          />
          <Reparto
            titulo="La duración del día"
            datos={[
              { etiqueta: "Justa", n: t.duracion.justa ?? 0, color: VERDE },
              { etiqueta: "Larga", n: t.duracion.larga ?? 0, color: AMBAR },
              { etiqueta: "Corta", n: t.duracion.corta ?? 0, color: VIOLETA },
            ]}
          />
          <div className="border-t border-white/8 pt-5">
            <Reparto
              titulo="Por dónde contestaron"
              datos={[
                { etiqueta: "Desde la app", n: (t.via.app ?? 0) + (t.via["app-anonimo"] ?? 0), color: VIOLETA },
                { etiqueta: "Por el enlace", n: t.via.enlace ?? 0, color: "#ba9dfa" },
                { etiqueta: "Anónimas", n: t.via.anonimo ?? 0, color: "rgba(255,255,255,.35)" },
              ]}
            />
          </div>
        </section>
      </div>

      <p className="mt-10 text-center text-[12px] font-light text-white/30">
        Se actualiza solo cada minuto · {EVENT.fullName} · Centro de Convenciones Av. 68
      </p>
    </div>
  );
}

export default async function TableroPagina() {
  // Los números son públicos; lo que la gente escribió con su nombre al lado
  // no. Las citas solo aparecen con la sesión del panel abierta.
  const [t, conClave] = await Promise.all([armarTablero(), haySesion()]);

  return (
    <main className="relative min-h-[100svh] overflow-x-clip bg-night">
      <div className="enc-fondo" aria-hidden="true">
        <div className="enc-orbe" />
        <div className="enc-grano" />
      </div>
      <Refresco />
      <Cuerpo t={t} conClave={conClave} />
    </main>
  );
}
