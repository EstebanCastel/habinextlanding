import type { Metadata } from "next";
import Image from "next/image";
import Entrar from "@/components/admin/Entrar";
import Refresco from "@/components/tablero/Refresco";
import { EVENT } from "@/config/event";
import { haySesion } from "@/lib/sesion";
import { armarTablero, hora, type Tablero } from "@/lib/tablero";

/**
 * El tablero de cierre: cómo salió el día, en una pantalla.
 *
 * Está detrás de la misma puerta del panel de operación porque son respuestas
 * de personas con nombre propio. Y no se cachea nunca: el único error que de
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

function Cuerpo({ t }: { t: Tablero }) {
  const { nps } = t;
  const u = t.uso?.dentro;
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
    <div className="relative z-[3] mx-auto w-full max-w-5xl px-5 pb-20 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <Image src="/img/habi-next-logo.svg" alt={EVENT.fullName} width={780} height={260} priority className="h-8 w-auto" />
        <span className="text-[12px] font-bold text-white/40">
          Actualizado {hora(t.armadoEn)}
        </span>
      </header>

      {/* El NPS es el titular: es el número que todo el mundo va a repetir. */}
      <section className="mt-12">
        <Eyebrow>Cómo salió el día · 20 de octubre</Eyebrow>
        <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="enc-numero select-none" aria-hidden="true">NPS</p>
          <p className="pb-2 text-[72px] font-black leading-none tracking-[-0.06em] tabular-nums sm:text-[96px]" style={{ color: nps.nps >= 50 ? VERDE : nps.nps >= 0 ? AMBAR : ROJO }}>
            {nps.nps > 0 ? "+" : ""}{nps.nps}
          </p>
        </div>
        <p className="mt-1 text-[17px] font-light leading-snug text-white/60">
          Sobre <b className="font-extrabold text-white">{t.n}</b> {t.n === 1 ? "respuesta" : "respuestas"}, con nota
          promedio de <b className="font-extrabold text-white tabular-nums">{t.notaPromedio.toFixed(2)}</b> sobre 10.
        </p>

        <div className="tb-tira mt-5 h-4">
          <span style={{ flexBasis: `${pct(nps.promotores, nps.n)}%`, background: VERDE }} />
          <span style={{ flexBasis: `${pct(nps.pasivos, nps.n)}%`, background: AMBAR }} />
          <span style={{ flexBasis: `${pct(nps.detractores, nps.n)}%`, background: ROJO }} />
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-3">
          {[
            { n: nps.promotores, t: "Promotores", s: "9 y 10", c: VERDE },
            { n: nps.pasivos, t: "Pasivos", s: "7 y 8", c: AMBAR },
            { n: nps.detractores, t: "Detractores", s: "0 a 6", c: ROJO },
          ].map((x) => (
            <li key={x.t} className="tb-tarjeta px-4 py-3">
              <p className="text-[30px] font-black leading-none tabular-nums" style={{ color: x.c }}>{x.n}</p>
              <p className="mt-1.5 text-[13px] font-bold text-white">{x.t}</p>
              <p className="text-[11px] font-light text-white/35">{x.s}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {/* Calificación por parte: acá se ve qué jaló el NPS para abajo. */}
        <section className="tb-tarjeta p-6">
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
        <section className="tb-tarjeta p-6">
          <Eyebrow>Qué hicieron en la app</Eyebrow>
          {u ? (
            <>
              <p className="mt-2 text-[15px] font-light leading-snug text-white/50">
                De <b className="font-extrabold text-white tabular-nums">{u.total}</b> personas con el QR leído en la
                puerta que además abrieron la app.
              </p>
              <ul className="mt-5 space-y-4">
                {usos.map((x) => (
                  <Fila
                    key={x.nombre}
                    nombre={x.nombre}
                    pista={x.pista}
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
        <section className="tb-tarjeta p-6">
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

        {/* La plata del año entrante: vuelve, paga y cuánto aguantó el día. */}
        <section className="tb-tarjeta space-y-6 p-6">
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
  if (!(await haySesion())) return <Entrar />;
  const t = await armarTablero();

  return (
    <main className="relative min-h-[100svh] overflow-x-clip bg-night">
      <div className="enc-fondo" aria-hidden="true">
        <div className="enc-orbe" />
        <div className="enc-grano" />
      </div>
      <Refresco />
      <Cuerpo t={t} />
    </main>
  );
}
