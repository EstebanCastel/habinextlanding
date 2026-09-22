"use client";

import { useMemo, useRef, useState } from "react";
import Dot from "@/components/Dot";
import { PARADAS, paradasDe, RECINTO, RUTAS, type Fase, type Parada, type RutaId } from "@/config/experiencia";
import type { Vista } from "@/lib/experiencia";
import { clasesBoton, pedir, reducirImagen } from "./util";

/**
 * El mapa del tesoro: el plano del recinto con las dos rutas y sus paradas.
 *
 * Cada parada se cierra con una foto del stand tomada desde el celular y, si
 * el teléfono la da, la ubicación, que el servidor compara con el recinto.
 * Las rutas se dibujan sobre el plano: lo recorrido queda sólido, el tramo
 * que sigue «camina», y lo que falta se ve tenue.
 */

type Props = { yo: Vista | null; fase: Fase; alCambiar: (yo: Vista) => void };

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" });

const colorDe = (ruta: RutaId) => RUTAS.find((r) => r.id === ruta)!.color;

function ubicacion(): Promise<{ lat: number; lng: number; precision: number } | null> {
  return new Promise((resolver) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolver(null);
    const listo = (v: { lat: number; lng: number; precision: number } | null) => resolver(v);
    const reloj = setTimeout(() => listo(null), 9000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(reloj);
        listo({ lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy });
      },
      () => {
        clearTimeout(reloj);
        listo(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  });
}

/** Dónde está el pin de una parada: sobre el stand, o en el centro del escenario. */
const pin = (p: Parada) => ({ x: p.x, y: p.tipo === "stand" ? p.y - 30 : p.y });

/**
 * El trazado entre dos paradas. Nada de diagonales cruzando el plano: las
 * rutas caminan como se camina en el recinto, por el pasillo que separa los
 * escenarios del hall. Cada ruta usa su propio carril del pasillo para no
 * montarse una sobre la otra.
 */
function camino(a: Parada, b: Parada, ruta: RutaId): string {
  const A = pin(a);
  const B = pin(b);
  const pasillo = ruta === "morada" ? 318 : 334;
  const zona = (p: Parada) => (p.y < 320 ? "sala" : "hall");
  if (zona(a) !== zona(b)) {
    return `M ${A.x} ${A.y} L ${A.x} ${pasillo} L ${B.x} ${pasillo} L ${B.x} ${B.y}`;
  }
  if (A.y === B.y) return `M ${A.x} ${A.y} L ${B.x} ${B.y}`;
  // Entre las dos filas del hall se pasa por el hueco entre columnas de
  // stands y por el pasillo que separa las filas, sin cruzar ningún stand.
  const hueco = A.x < B.x ? A.x + 125 : A.x - 125;
  const entreFilas = 512;
  return `M ${A.x} ${A.y} L ${hueco} ${A.y} L ${hueco} ${entreFilas} L ${B.x} ${entreFilas} L ${B.x} ${B.y}`;
}

function Sala({ x, y, w, h, nombre, sub, abajo }: { x: number; y: number; w: number; h: number; nombre: string; sub?: string; abajo?: boolean }) {
  // En el hall el rótulo va pequeño y en la esquina: el centro es de los pines.
  const yTitulo = abajo ? y + 24 : y + 34;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={26} fill="#150a26" stroke="rgba(186,157,250,0.35)" strokeWidth={2} />
      <text x={abajo ? x + w - 26 : x + w / 2} y={yTitulo} textAnchor={abajo ? "end" : "middle"} fill="#ba9dfa" fontSize={abajo ? 11 : 13} fontWeight={700} letterSpacing={3}>
        {nombre.toUpperCase()}
      </text>
      {sub && !abajo ? (
        <text x={x + w / 2} y={y + 54} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={12} fontWeight={300}>
          {sub}
        </text>
      ) : null}
    </g>
  );
}

export default function Mapa({ yo, fase, alCambiar }: Props) {
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; malo?: boolean } | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  const hechas = useMemo(() => yo?.mapa.paradas ?? {}, [yo]);
  const rutasHechas = useMemo(() => yo?.mapa.rutas ?? {}, [yo]);
  const juegoAbierto = fase === "evento";
  const parada = PARADAS.find((p) => p.id === seleccion) ?? null;

  // El tramo que sigue en cada ruta, para animarlo y para sugerir la próxima parada.
  const proximaDe = useMemo(() => {
    const m: Partial<Record<RutaId, Parada | undefined>> = {};
    for (const r of RUTAS) m[r.id] = paradasDe(r.id).find((p) => !hechas[p.id]);
    return m;
  }, [hechas]);

  async function checkIn(f: File | undefined) {
    if (!f || !parada) return;
    setOcupado(true);
    setAviso(null);
    try {
      const [foto, geo] = await Promise.all([reducirImagen(f, 1600, 0.84), ubicacion()]);
      const fd = new FormData();
      fd.append("parada", parada.id);
      fd.append("foto", foto, "stand.jpg");
      if (geo) {
        fd.append("lat", String(geo.lat));
        fd.append("lng", String(geo.lng));
        fd.append("precision", String(Math.round(geo.precision)));
      }
      const r = await pedir<{ ok: boolean; yo: Vista }>("/api/experiencia/parada", { method: "POST", body: fd });
      alCambiar(r.yo);
      const ruta = RUTAS.find((x) => x.id === parada.ruta)!;
      const cerroRuta = Boolean(r.yo.mapa.rutas[ruta.id]) && !rutasHechas[ruta.id];
      setAviso({
        texto: cerroRuta
          ? `¡${parada.nombre} lista y ${ruta.nombre} completa! +${parada.puntos} y +${ruta.bono} de bono.`
          : `¡${parada.nombre} lista! +${parada.puntos} puntos.${geo ? "" : " Sin ubicación: la foto quedó como prueba."}`,
      });
      const siguiente = paradasDe(parada.ruta).find((p) => !r.yo.mapa.paradas[p.id]);
      if (siguiente) setSeleccion(siguiente.id);
    } catch (e) {
      setAviso({ texto: (e as Error).message, malo: true });
    } finally {
      setOcupado(false);
      if (archivo.current) archivo.current.value = "";
    }
  }

  const segmentos = RUTAS.flatMap((r) => {
    const ps = paradasDe(r.id);
    return ps.slice(0, -1).map((a, i) => {
      const b = ps[i + 1];
      const hecho = Boolean(hechas[b.id]) && Boolean(hechas[a.id]);
      const vivo = !hecho && (i === 0 ? true : Boolean(hechas[a.id])) && !hechas[b.id];
      return { id: `${a.id}-${b.id}`, d: camino(a, b, r.id), color: r.color, hecho, vivo };
    });
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <div>
        {!juegoAbierto ? (
          <p className="mb-4 flex items-start gap-3 rounded-2xl border border-violet/40 bg-violet/10 px-5 py-4 text-sm font-light leading-relaxed">
            <Dot color="var(--violet-soft)" className="mt-2 h-1.5 w-1.5" />
            El mapa se juega el 20 de octubre en {RECINTO.nombre}. Explóralo desde ya: toca cada parada para ver qué te
            espera.
          </p>
        ) : null}

        <div className="overflow-hidden rounded-[26px] border border-white/12 bg-night shadow-[0_40px_90px_-40px_rgba(128,46,246,0.5)]">
          <svg viewBox="0 0 1000 700" role="img" aria-label="Plano del recinto con las dos rutas y sus paradas" className="block h-auto w-full">
            <defs>
              <pattern id="puntitos" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1.6" fill="rgba(128,46,246,0.45)" />
              </pattern>
              <linearGradient id="fondoMapa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0d0618" />
                <stop offset="1" stopColor="#050208" />
              </linearGradient>
            </defs>
            <rect width="1000" height="700" fill="url(#fondoMapa)" />
            <rect width="1000" height="700" fill="url(#puntitos)" />

            {/* Salones */}
            <Sala x={70} y={60} w={380} h={240} nombre="Escenario Inspira" sub="Charlas y conferencias" />
            <rect x={140} y={244} width={240} height={26} rx={8} fill="rgba(128,46,246,0.6)" />
            <text x={260} y={262} textAnchor="middle" fill="#fff" fontSize={11} letterSpacing={2}>TARIMA</text>

            <Sala x={550} y={60} w={380} h={240} nombre="Escenario Taller" sub="Manos a la obra" />
            <rect x={620} y={244} width={240} height={26} rx={8} fill="rgba(128,46,246,0.6)" />
            <text x={740} y={262} textAnchor="middle" fill="#fff" fontSize={11} letterSpacing={2}>TARIMA</text>

            <text x={500} y={330} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={12} letterSpacing={3}>PASILLO</text>

            <Sala x={70} y={350} w={860} h={270} nombre="Hall de marcas · stands de los aliados" abajo />

            {/* Entrada y acreditación */}
            <rect x={430} y={642} width={140} height={44} rx={14} fill="#802ef6" />
            <text x={500} y={670} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={700} letterSpacing={3}>ENTRADA</text>
            <rect x={100} y={640} width={220} height={46} rx={14} fill="#150a26" stroke="rgba(186,157,250,0.35)" strokeWidth={2} />
            <text x={210} y={669} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={12} letterSpacing={2}>ACREDITACIÓN</text>
            <rect x={680} y={640} width={220} height={46} rx={14} fill="#150a26" stroke="rgba(186,157,250,0.35)" strokeWidth={2} />
            <text x={790} y={669} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={12} letterSpacing={2}>ZONA VIP · CAFÉ</text>

            {/* Stands: la marca, en claro, para que el logo se lea */}
            {PARADAS.filter((p) => p.tipo === "stand").map((p) => (
              <g key={`stand-${p.id}`} onClick={() => setSeleccion(p.id)} className="cursor-pointer">
                <rect x={p.x - 88} y={p.y - 8} width={176} height={62} rx={14} fill={p.fondo ?? (seleccion === p.id ? "#ffffff" : "rgba(255,255,255,0.92)")} stroke={colorDe(p.ruta)} strokeWidth={seleccion === p.id ? 4 : 0} />
                {p.logo ? <image href={p.logo} x={p.x - 74} y={p.y - 2} width={148} height={38} preserveAspectRatio="xMidYMid meet" /> : null}
                <text x={p.x} y={p.y + 47} textAnchor="middle" fill={p.fondo ? "rgba(255,255,255,0.7)" : "#3a2f4a"} fontSize={10} fontWeight={700} letterSpacing={1.2}>
                  {p.nombre.toUpperCase()}
                </text>
              </g>
            ))}

            {/* Rutas */}
            {segmentos.map((s) => (
              <path
                key={s.id}
                d={s.d}
                fill="none"
                stroke={s.color}
                strokeWidth={s.hecho ? 6 : 4}
                strokeOpacity={s.hecho ? 0.95 : s.vivo ? 0.9 : 0.3}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={s.vivo ? "ruta-viva" : undefined}
              />
            ))}

            {/* Pines */}
            {PARADAS.map((p) => {
              const hecha = Boolean(hechas[p.id]);
              const cy = pin(p).y;
              const color = colorDe(p.ruta);
              const esProxima = proximaDe[p.ruta]?.id === p.id;
              return (
                <g
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${p.nombre}, parada ${p.orden} de la ${RUTAS.find((r) => r.id === p.ruta)!.nombre}${hecha ? ", hecha" : ""}`}
                  onClick={() => setSeleccion(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSeleccion(p.id);
                  }}
                  className="cursor-pointer focus:outline-none"
                >
                  {esProxima && juegoAbierto ? <circle cx={p.x} cy={cy} r={24} fill={color} className="pin-pulso" /> : null}
                  <circle cx={p.x} cy={cy} r={seleccion === p.id ? 26 : 22} fill={hecha ? color : "#0d0618"} stroke={color} strokeWidth={4} />
                  <text x={p.x} y={cy + 6} textAnchor="middle" fill="#fff" fontSize={hecha ? 20 : 17} fontWeight={800}>
                    {hecha ? "✓" : p.orden}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Las dos rutas */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {RUTAS.map((r) => {
            const ps = paradasDe(r.id);
            const n = ps.filter((p) => hechas[p.id]).length;
            const completa = Boolean(rutasHechas[r.id]);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSeleccion((proximaDe[r.id] ?? ps[0]).id)}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-base font-semibold tracking-tight">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: r.color }} />
                    {r.nombre}
                  </span>
                  <span className="text-sm tabular-nums text-white/60">
                    {n}/{ps.length} paradas
                  </span>
                </div>
                <p className="mt-1 text-sm font-light text-white/50">{r.resumen}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${(n / ps.length) * 100}%`, background: r.color }} />
                </div>
                <p className="mt-2 text-xs text-white/45">
                  {completa ? `Ruta completa · bono +${r.bono} cobrado` : `Completa la ruta y suma +${r.bono} de bono`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* La parada elegida */}
      <aside className="rounded-[26px] border border-white/12 bg-ink p-6 lg:sticky lg:top-6">
        {!parada ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">Cómo se juega</p>
            <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-tight">Dos rutas, ocho paradas.</h3>
            <ol className="mt-4 flex flex-col gap-3 text-base font-light leading-relaxed text-white/70">
              <li className="flex gap-3"><span className="font-semibold text-violet-soft">1.</span> Toca una parada del mapa para ver qué te espera ahí.</li>
              <li className="flex gap-3"><span className="font-semibold text-violet-soft">2.</span> Cuando estés en el stand, tómale una foto con el logo visible y súbela.</li>
              <li className="flex gap-3"><span className="font-semibold text-violet-soft">3.</span> Cada parada suma {PARADAS[0].puntos} puntos; cerrar una ruta completa suma {RUTAS[0].bono} más.</li>
            </ol>
            <p className="mt-5 text-sm font-light leading-relaxed text-white/45">
              Te pediremos la ubicación del celular para confirmar que estás en {RECINTO.nombre}. Si el GPS no ayuda bajo
              techo, la foto igual cuenta.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: colorDe(parada.ruta) }}>
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: colorDe(parada.ruta) }} />
                  {RUTAS.find((r) => r.id === parada.ruta)!.nombre} · parada {parada.orden}
                </p>
                <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-tight">{parada.nombre}</h3>
              </div>
              <span className="shrink-0 text-right">
                <span className="block text-2xl font-bold tabular-nums tracking-tight text-violet-soft">+{parada.puntos}</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">puntos</span>
              </span>
            </div>

            {parada.logo ? (
              <div className="mt-4 flex h-24 items-center justify-center rounded-2xl px-6" style={{ background: parada.fondo ?? "#ffffff" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={parada.logo} alt={parada.marca} className="max-h-14 w-auto max-w-full object-contain" />
              </div>
            ) : null}

            <p className="mt-4 text-base font-light leading-relaxed text-white/70">{parada.reto}</p>
            {parada.sitio ? (
              <a href={parada.sitio} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-white/45 underline underline-offset-4 hover:text-white">
                Conoce a {parada.marca}
              </a>
            ) : null}

            {aviso ? (
              <p className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-light leading-relaxed ${aviso.malo ? "border-red-400/30 bg-red-400/[0.08] text-red-200" : "border-violet/40 bg-violet/10"}`}>
                <Dot color={aviso.malo ? "rgb(252 165 165)" : "var(--violet-soft)"} className="mt-2 h-1.5 w-1.5" />
                {aviso.texto}
              </p>
            ) : null}

            {hechas[parada.id] ? (
              <div className="mt-5">
                <p className="text-sm font-semibold text-violet-soft">Parada hecha a las {fecha(hechas[parada.id].en)}</p>
                {hechas[parada.id].distanciaM !== undefined ? (
                  <p className="text-xs text-white/40">A {hechas[parada.id].distanciaM} m del punto del recinto.</p>
                ) : null}
                <div className="mt-3 aspect-[4/3] overflow-hidden rounded-2xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/experiencia/archivo?f=${encodeURIComponent(hechas[parada.id].fotoId)}`} alt={`Tu foto en ${parada.nombre}`} className="h-full w-full object-cover" />
                </div>
              </div>
            ) : !juegoAbierto ? (
              <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-light text-white/55">
                Esta parada se abre el 20 de octubre, en el recinto.
              </p>
            ) : !yo ? (
              <a href={`/experiencia?entrar=${encodeURIComponent("/experiencia/mapa")}`} className={`${clasesBoton.solido} mt-5`}>
                Entrar para hacer check-in
              </a>
            ) : (
              <div className="mt-5 flex flex-col gap-3">
                <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={(e) => checkIn(e.target.files?.[0])} />
                <button type="button" disabled={ocupado} onClick={() => archivo.current?.click()} className={clasesBoton.solido}>
                  {ocupado ? "Guardando…" : "Tomar la foto del stand"}
                </button>
                <p className="text-xs font-light leading-relaxed text-white/40">
                  Se abre la cámara. Al subir la foto te pedimos la ubicación para confirmar que estás en el recinto.
                </p>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
