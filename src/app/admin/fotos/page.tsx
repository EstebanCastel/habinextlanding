import type { Metadata } from "next";
import { PARADAS } from "@/config/experiencia";
import { todos } from "@/lib/experiencia";
import { haySesion } from "@/lib/sesion";

/**
 * Todas las fotos que sube la gente, en un sitio y descargables.
 *
 * El día del evento se suben cientos: los stands del mapa, los retratos del
 * estudio, las capturas de quien publicó. Hasta ahora quedaban guardadas y
 * solo se veían de a una, entrando al expediente de cada persona. Acá están
 * todas, con quién la subió y de qué parada es, para que el equipo las baje
 * y las use.
 *
 * Son enlaces a `/api/admin/experiencia/foto`, que ya comprueba la sesión:
 * el store es privado y las fotos no tienen URL pública.
 */

export const metadata: Metadata = {
  title: "Fotos · Habi Next",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NOMBRE_CLASE: Record<string, string> = {
  foto: "Foto del evento",
  parada: "Parada del mapa",
  prueba: "Prueba de publicación",
  perfil: "Foto de perfil",
  frase: "Pieza generada",
};

export default async function Fotos({
  searchParams,
}: {
  searchParams: Promise<{ clase?: string }>;
}) {
  if (!(await haySesion())) return null;
  const { clase } = await searchParams;

  const gente = await todos().catch(() => []);
  const paradas = new Map(PARADAS.map((p) => [p.id, p.nombre]));

  const todasLasFotos = gente
    .flatMap((p) =>
      p.fotos.map((f) => ({
        ...f,
        de: f.de,
        quien: `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || p.email || p.id,
        correo: p.email ?? "",
        participante: p.id,
      }))
    )
    // La más reciente primero: el día del evento lo que interesa es lo que
    // acaba de entrar, no lo de la semana pasada.
    .sort((a, b) => b.subidaEn.localeCompare(a.subidaEn));

  const fotos = clase ? todasLasFotos.filter((f) => f.clase === clase) : todasLasFotos;
  const porClase = todasLasFotos.reduce<Record<string, number>>((acc, f) => {
    acc[f.clase] = (acc[f.clase] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Fotos de la experiencia</h2>
          <p className="mt-1 text-sm font-light text-white/50">
            {todasLasFotos.length} en total, de {gente.filter((p) => p.fotos.length).length} personas. Toca
            una para abrirla en grande y descargarla.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href="/admin/fotos"
          className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
            !clase ? "border-violet bg-violet text-white" : "border-white/15 text-white/60 hover:text-white"
          }`}
        >
          Todas · {todasLasFotos.length}
        </a>
        {Object.entries(porClase)
          .sort((a, b) => b[1] - a[1])
          .map(([c, n]) => (
            <a
              key={c}
              href={`/admin/fotos?clase=${c}`}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                clase === c ? "border-violet bg-violet text-white" : "border-white/15 text-white/60 hover:text-white"
              }`}
            >
              {NOMBRE_CLASE[c] ?? c} · {n}
            </a>
          ))}
      </div>

      {fotos.length === 0 ? (
        <p className="mt-10 text-base font-light text-white/45">
          Todavía no hay fotos de ese tipo. Aparecen acá en cuanto alguien suba la primera.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {fotos.map((f) => {
            const url = `/api/admin/experiencia/foto?id=${encodeURIComponent(f.participante)}&f=${encodeURIComponent(f.id)}`;
            return (
              <li key={`${f.participante}-${f.id}`} className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03]">
                <a href={url} target="_blank" rel="noreferrer" className="block">
                  {/* Sin next/image: son privadas y pasan por la API con sesión. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${NOMBRE_CLASE[f.clase] ?? f.clase} de ${f.quien}`}
                    loading="lazy"
                    className="aspect-square w-full bg-night object-cover"
                  />
                </a>
                <div className="p-3">
                  <p className="truncate text-xs font-semibold text-white/85">{f.quien}</p>
                  <p className="mt-0.5 truncate text-[11px] font-light text-white/40">
                    {f.de ? (paradas.get(f.de) ?? f.de) : (NOMBRE_CLASE[f.clase] ?? f.clase)}
                  </p>
                  <p className="mt-1 text-[11px] tabular-nums text-white/30">
                    {new Date(f.subidaEn).toLocaleString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <a
                    href={url}
                    download
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-soft hover:underline"
                  >
                    Descargar
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
