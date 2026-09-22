"use client";

import { useMemo, useRef, useState } from "react";
import Dot from "@/components/Dot";
import { PARADAS, paradasDe, RECINTO, RUTAS, type Fase, type Parada, type RutaId } from "@/config/experiencia";
import type { Vista } from "@/lib/experiencia";
import { clasesBoton, pedir, reducirImagen } from "./util";

/**
 * El mapa del tesoro: el plano ilustrado del recinto, al estilo de los mapas
 * de festival. Dos escenarios con tarima, pantalla y sillas; el hall con los
 * stands de los aliados, su logo, su mostrador y sus portátiles; la
 * acreditación, la entrada, la zona VIP con sus sofás, el café y los baños.
 *
 * Encima van las dos rutas, cada una con su color y sus paradas numeradas.
 * Cada parada se cierra con una foto tomada desde el celular y, si el teléfono
 * la da, la ubicación, que el servidor compara con el recinto.
 */

type Props = { yo: Vista | null; fase: Fase; alCambiar: (yo: Vista) => void };
type Filtro = RutaId | "ambas";

const fecha = (iso: string) => new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" });
const rutaDe = (id: RutaId) => RUTAS.find((r) => r.id === id)!;

function ubicacion(): Promise<{ lat: number; lng: number; precision: number } | null> {
  return new Promise((resolver) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolver(null);
    const reloj = setTimeout(() => resolver(null), 9000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(reloj);
        resolver({ lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy });
      },
      () => {
        clearTimeout(reloj);
        resolver(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  });
}

/** Dónde está el pin: al frente del stand (sobre la pared del logo) o en el escenario. */
const pin = (p: Parada) => ({ x: p.x, y: p.tipo === "stand" ? p.y - 14 : p.y });

/**
 * Cómo se camina de una parada a otra: por el pasillo entre los escenarios y
 * el hall, y entre las filas de stands por el hueco que las separa. Cada ruta
 * tiene su carril para que no se monten.
 */
function camino(a: Parada, b: Parada, ruta: RutaId): string {
  const A = pin(a);
  const B = pin(b);
  const pasillo = ruta === "morada" ? 378 : 402;
  const zona = (p: Parada) => (p.y < 360 ? "sala" : "hall");
  if (zona(a) !== zona(b)) return `M ${A.x} ${A.y} L ${A.x} ${pasillo} L ${B.x} ${pasillo} L ${B.x} ${B.y}`;
  if (A.y === B.y) return `M ${A.x} ${A.y} L ${B.x} ${B.y}`;
  const hueco = A.x < B.x ? A.x + 150 : A.x - 150;
  const entreFilas = 585;
  return `M ${A.x} ${A.y} L ${hueco} ${A.y} L ${hueco} ${entreFilas} L ${B.x} ${entreFilas} L ${B.x} ${B.y}`;
}

// ---------- las piezas del plano ----------

const COLOR = {
  base: "#efe8fb",
  piso: "#ffffff",
  borde: "#c9b8f5",
  sombra: "rgba(61,16,128,0.14)",
  tinta: "#0d0618",
  violeta: "#802ef6",
  violetaHondo: "#3d1080",
  suave: "#ba9dfa",
  silla: "#d9ccfa",
  sillaBorde: "#a98ef0",
  verde: "#6fcf97",
  verdeHondo: "#3aa76d",
  madera: "#b08968",
};

function Placa({ x, y, texto, ancla = "middle", tono = "oscuro" }: { x: number; y: number; texto: string; ancla?: "start" | "middle" | "end"; tono?: "oscuro" | "morado" }) {
  const w = texto.length * 7.6 + 26;
  const x0 = ancla === "start" ? x : ancla === "end" ? x - w : x - w / 2;
  return (
    <g>
      <rect x={x0} y={y - 13} width={w} height={24} rx={8} fill={tono === "morado" ? COLOR.violeta : COLOR.tinta} />
      <text x={x0 + w / 2} y={y + 4} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700} letterSpacing={1.6}>
        {texto.toUpperCase()}
      </text>
    </g>
  );
}

function Piso({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x + 4} y={y + 7} width={w} height={h} rx={22} fill={COLOR.sombra} />
      <rect x={x} y={y} width={w} height={h} rx={22} fill={COLOR.piso} stroke={COLOR.borde} strokeWidth={2} />
    </g>
  );
}

function Tarima({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={54} rx={10} fill={COLOR.violetaHondo} />
      <rect x={x} y={y} width={w} height={46} rx={10} fill={COLOR.violeta} />
      {/* pantalla */}
      <rect x={x + w / 2 - 90} y={y + 8} width={180} height={28} rx={4} fill={COLOR.tinta} />
      <text x={x + w / 2} y={y + 27} textAnchor="middle" fill={COLOR.suave} fontSize={11} fontWeight={800} letterSpacing={3}>
        HABI NEXT
      </text>
      {/* parlantes */}
      <rect x={x + 8} y={y + 6} width={16} height={34} rx={3} fill={COLOR.tinta} />
      <rect x={x + w - 24} y={y + 6} width={16} height={34} rx={3} fill={COLOR.tinta} />
      {/* atril */}
      <rect x={x + w - 70} y={y + 30} width={18} height={12} rx={3} fill={COLOR.tinta} />
    </g>
  );
}

function Sillas({ x, y, filas, porFila, paso = 27 }: { x: number; y: number; filas: number; porFila: number; paso?: number }) {
  const sillas: React.ReactNode[] = [];
  for (let f = 0; f < filas; f += 1) {
    for (let i = 0; i < porFila; i += 1) {
      sillas.push(
        <g key={`${f}-${i}`}>
          <rect x={x + i * paso} y={y + f * 26} width={16} height={14} rx={4} fill={COLOR.silla} stroke={COLOR.sillaBorde} strokeWidth={1} />
          <rect x={x + i * paso} y={y + f * 26 - 3} width={16} height={4} rx={2} fill={COLOR.sillaBorde} />
        </g>
      );
    }
  }
  return <g>{sillas}</g>;
}

function Portatil({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={22} height={13} rx={2} fill={COLOR.tinta} />
      <rect x={x + 2} y={y + 2} width={18} height={8} rx={1} fill={COLOR.suave} />
      <rect x={x - 2} y={y + 13} width={26} height={4} rx={1} fill="#4b1a8b" />
    </g>
  );
}

function MesaTaller({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 45} y={y - 20} width={90} height={40} rx={8} fill={COLOR.piso} stroke={COLOR.sillaBorde} strokeWidth={1.5} />
      <Portatil x={x - 34} y={y - 8} />
      <Portatil x={x + 12} y={y - 8} />
      {[-30, -8, 14].map((dx) => (
        <rect key={`a${dx}`} x={x + dx} y={y - 36} width={14} height={11} rx={3} fill={COLOR.silla} stroke={COLOR.sillaBorde} />
      ))}
      {[-30, -8, 14].map((dx) => (
        <rect key={`b${dx}`} x={x + dx} y={y + 25} width={14} height={11} rx={3} fill={COLOR.silla} stroke={COLOR.sillaBorde} />
      ))}
    </g>
  );
}

function Planta({ x, y, tam = 1 }: { x: number; y: number; tam?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${tam})`}>
      <rect x={-9} y={6} width={18} height={12} rx={3} fill={COLOR.madera} />
      <circle cx={0} cy={0} r={13} fill={COLOR.verde} />
      <circle cx={-7} cy={-6} r={8} fill={COLOR.verdeHondo} />
      <circle cx={7} cy={-4} r={7} fill={COLOR.verdeHondo} opacity={0.8} />
    </g>
  );
}

function Sofa({ x, y, w = 70 }: { x: number; y: number; w?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={30} rx={9} fill={COLOR.violeta} />
      <rect x={x + 6} y={y + 6} width={w / 2 - 8} height={18} rx={5} fill={COLOR.suave} />
      <rect x={x + w / 2 + 2} y={y + 6} width={w / 2 - 8} height={18} rx={5} fill={COLOR.suave} />
    </g>
  );
}

function Taza({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={12} height={11} rx={3} fill="#fff" stroke={COLOR.tinta} strokeWidth={1.5} />
      <path d={`M ${x + 12} ${y + 3} q 6 2 0 6`} fill="none" stroke={COLOR.tinta} strokeWidth={1.5} />
      <path d={`M ${x + 4} ${y - 4} q 2 -3 0 -5 M ${x + 8} ${y - 4} q 2 -3 0 -5`} fill="none" stroke={COLOR.tinta} strokeWidth={1} opacity={0.6} />
    </g>
  );
}

function Escritorio({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 40} y={y - 14} width={80} height={28} rx={6} fill={COLOR.piso} stroke={COLOR.sillaBorde} strokeWidth={1.5} />
      <Portatil x={x - 11} y={y - 7} />
      <rect x={x - 8} y={y + 20} width={16} height={12} rx={4} fill={COLOR.silla} stroke={COLOR.sillaBorde} />
    </g>
  );
}

function Persona({ x, y, color = COLOR.violetaHondo }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={5} fill={color} />
      <rect x={x - 6} y={y + 5} width={12} height={9} rx={4} fill={color} />
    </g>
  );
}

/** Un stand: pared con el logo, mostrador con portátil y dos butacos al frente. */
function Stand({ p, color, seleccionado, onClick }: { p: Parada; color: string; seleccionado: boolean; onClick: () => void }) {
  const { x, y } = p;
  return (
    <g onClick={onClick} className="cursor-pointer">
      {/* sombra y pared del fondo con el logo */}
      <rect x={x - 96} y={y + 4} width={200} height={50} rx={10} fill={COLOR.sombra} />
      <rect x={x - 100} y={y} width={200} height={50} rx={10} fill={p.fondo ?? "#ffffff"} stroke={seleccionado ? color : COLOR.borde} strokeWidth={seleccionado ? 4 : 2} />
      {p.logo ? <image href={p.logo} x={x - 84} y={y + 7} width={168} height={36} preserveAspectRatio="xMidYMid meet" /> : null}
      {/* mostrador */}
      <rect x={x - 70} y={y + 62} width={140} height={22} rx={6} fill="#f6f1ff" stroke={COLOR.sillaBorde} strokeWidth={1.5} />
      <Portatil x={x - 40} y={y + 66} />
      <rect x={x + 14} y={y + 66} width={34} height={13} rx={2} fill={COLOR.suave} opacity={0.7} />
      {/* butacos y gente */}
      <circle cx={x - 40} cy={y + 100} r={6} fill={color} />
      <circle cx={x + 40} cy={y + 100} r={6} fill={color} />
      <Persona x={x + 4} y={y + 94} />
      <text x={x} y={y + 124} textAnchor="middle" fill={COLOR.tinta} fontSize={10.5} fontWeight={700} letterSpacing={1.2}>
        {p.nombre.toUpperCase()}
      </text>
    </g>
  );
}

// ---------- el mapa ----------

export default function Mapa({ yo, fase, alCambiar }: Props) {
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("ambas");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; malo?: boolean } | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  const hechas = useMemo(() => yo?.mapa.paradas ?? {}, [yo]);
  const rutasHechas = useMemo(() => yo?.mapa.rutas ?? {}, [yo]);
  const juegoAbierto = fase === "evento";
  const parada = PARADAS.find((p) => p.id === seleccion) ?? null;
  const visible = (ruta: RutaId) => filtro === "ambas" || filtro === ruta;

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
      const ruta = rutaDe(parada.ruta);
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
      return { id: `${a.id}-${b.id}`, ruta: r.id, d: camino(a, b, r.id), color: r.color, hecho, vivo };
    });
  });

  const ListaRuta = ({ ruta }: { ruta: RutaId }) => {
    const r = rutaDe(ruta);
    const ps = paradasDe(ruta);
    const n = ps.filter((p) => hechas[p.id]).length;
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: r.color }} />
            {r.nombre}
          </span>
          <span className="text-sm tabular-nums text-white/60">
            {n}/{ps.length}
          </span>
        </div>
        <p className="mt-1 text-sm font-light text-white/50">{r.resumen}</p>
        <ol className="mt-3 flex flex-col gap-1.5">
          {ps.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSeleccion(p.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/5 ${seleccion === p.id ? "bg-white/[0.06]" : ""}`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold" style={{ background: hechas[p.id] ? r.color : "transparent", border: `2px solid ${r.color}`, color: hechas[p.id] ? "#fff" : r.color }}>
                  {hechas[p.id] ? "✓" : p.orden}
                </span>
                <span className={hechas[p.id] ? "text-white/50 line-through" : "text-white/85"}>{p.nombre}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-white/45">{rutasHechas[ruta] ? `Ruta completa · bono +${r.bono} cobrado` : `Ruta completa: +${r.bono} de bono`}</p>
      </div>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <div>
        {!juegoAbierto ? (
          <p className="mb-4 flex items-start gap-3 rounded-2xl border border-violet/40 bg-violet/10 px-5 py-4 text-sm font-light leading-relaxed">
            <Dot color="var(--violet-soft)" className="mt-2 h-1.5 w-1.5" />
            El mapa se juega el 20 de octubre en {RECINTO.nombre}. Explóralo desde ya: toca cada parada para ver qué te espera.
          </p>
        ) : null}

        {/* Qué ruta se ve */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs uppercase tracking-wider text-white/40">Ver</span>
          {(["ambas", "morada", "dorada"] as Filtro[]).map((f) => {
            const activo = filtro === f;
            const color = f === "ambas" ? "var(--violet-soft)" : rutaDe(f).color;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${activo ? "bg-white text-night font-semibold" : "border border-white/15 text-white/70 hover:border-white/35"}`}
              >
                {f !== "ambas" ? <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} /> : null}
                {f === "ambas" ? "Las dos rutas" : rutaDe(f).nombre}
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-[26px] border border-white/12 shadow-[0_40px_90px_-40px_rgba(128,46,246,0.5)]">
          <svg viewBox="0 0 1200 900" role="img" aria-label="Plano ilustrado del recinto con las dos rutas y sus paradas" className="block h-auto w-full">
            <defs>
              <pattern id="rejilla" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="15" cy="15" r="1.2" fill="rgba(128,46,246,0.18)" />
              </pattern>
            </defs>
            <rect width="1200" height="900" fill={COLOR.base} />
            <rect width="1200" height="900" fill="url(#rejilla)" />

            {/* ---- Escenario Inspira ---- */}
            <Piso x={60} y={60} w={500} h={300} />
            <Tarima x={120} y={84} w={380} />
            <Sillas x={132} y={178} filas={6} porFila={14} />
            <Planta x={90} y={330} />
            <Planta x={530} y={330} />
            <Placa x={310} y={72} texto="Escenario Inspira" />

            {/* ---- Escenario Taller ---- */}
            <Piso x={640} y={60} w={500} h={300} />
            <Tarima x={700} y={84} w={380} />
            {[760, 890, 1020].map((cx) => (
              <MesaTaller key={`t1-${cx}`} x={cx} y={222} />
            ))}
            {[760, 890, 1020].map((cx) => (
              <MesaTaller key={`t2-${cx}`} x={cx} y={306} />
            ))}
            <Placa x={890} y={72} texto="Escenario Taller" />

            {/* ---- Pasillo ---- */}
            <Planta x={600} y={392} tam={1.1} />
            <Placa x={600} y={372} texto="Pasillo" tono="morado" />

            {/* ---- Hall de marcas ---- */}
            <Piso x={60} y={420} w={1080} h={345} />
            <Placa x={1110} y={440} texto="Hall de marcas" ancla="end" />
            {PARADAS.filter((p) => p.tipo === "stand").map((p) => (
              <g key={p.id} opacity={visible(p.ruta) ? 1 : 0.35}>
                <Stand p={p} color={rutaDe(p.ruta).color} seleccionado={seleccion === p.id} onClick={() => setSeleccion(p.id)} />
              </g>
            ))}
            {/* punto de foto del carnet */}
            <g>
              <rect x={1000} y={540} width={110} height={120} rx={14} fill={COLOR.violetaHondo} />
              <rect x={1012} y={554} width={86} height={62} rx={8} fill={COLOR.tinta} />
              <circle cx={1055} cy={585} r={14} fill="none" stroke={COLOR.suave} strokeWidth={3} />
              <circle cx={1055} cy={585} r={5} fill={COLOR.suave} />
              <text x={1055} y={640} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={700} letterSpacing={1.4}>
                PUNTO DE FOTO
              </text>
              <Persona x={1055} y={682} color={COLOR.violeta} />
            </g>
            <Planta x={90} y={745} />
            <Planta x={660} y={745} />
            <Planta x={1115} y={745} />

            {/* ---- Zona de abajo: acreditación, entrada, VIP, café, baños ---- */}
            <Piso x={60} y={785} w={400} h={72} />
            <Escritorio x={130} y={815} />
            <Escritorio x={250} y={815} />
            <Escritorio x={370} y={815} />
            <Placa x={260} y={795} texto="Acreditación" />

            {/* entrada */}
            <rect x={520} y={789} width={160} height={70} rx={14} fill={COLOR.violeta} />
            <rect x={556} y={805} width={88} height={54} rx={6} fill={COLOR.violetaHondo} />
            <path d="M 600 859 L 600 831 M 590 841 L 600 831 L 610 841" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <Placa x={600} y={797} texto="Entrada" />

            {/* zona VIP */}
            <Piso x={740} y={785} w={230} h={72} />
            <Sofa x={760} y={815} w={70} />
            <Sofa x={880} y={815} w={70} />
            <circle cx={855} cy={830} r={12} fill={COLOR.piso} stroke={COLOR.sillaBorde} strokeWidth={1.5} />
            <Placa x={855} y={795} texto="Zona VIP" />

            {/* café */}
            <Piso x={985} y={785} w={95} h={72} />
            <rect x={997} y={815} width={70} height={16} rx={4} fill="#f6f1ff" stroke={COLOR.sillaBorde} strokeWidth={1.5} />
            <Taza x={1010} y={837} />
            <Taza x={1036} y={837} />
            <Placa x={1032} y={795} texto="Café" />

            {/* baños */}
            <Piso x={1095} y={785} w={45} h={72} />
            <text x={1117} y={829} textAnchor="middle" fill={COLOR.tinta} fontSize={12} fontWeight={800}>
              WC
            </text>

            {/* ---- Rutas ---- */}
            {segmentos.map((s) => (
              <g key={s.id} opacity={visible(s.ruta) ? 1 : 0.12}>
                <path d={s.d} fill="none" stroke="#ffffff" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
                <path
                  d={s.d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.hecho ? 7 : 6}
                  strokeOpacity={s.hecho ? 1 : s.vivo ? 0.95 : 0.45}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={s.vivo ? "ruta-viva" : undefined}
                />
              </g>
            ))}

            {/* ---- Pines ---- */}
            {PARADAS.map((p) => {
              const hecha = Boolean(hechas[p.id]);
              const { x: cx, y: cy } = pin(p);
              const color = rutaDe(p.ruta).color;
              const esProxima = proximaDe[p.ruta]?.id === p.id;
              return (
                <g
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${p.nombre}, parada ${p.orden} de la ${rutaDe(p.ruta).nombre}${hecha ? ", hecha" : ""}`}
                  onClick={() => setSeleccion(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSeleccion(p.id);
                  }}
                  opacity={visible(p.ruta) ? 1 : 0.25}
                  className="cursor-pointer focus:outline-none"
                >
                  {esProxima && juegoAbierto && visible(p.ruta) ? <circle cx={cx} cy={cy} r={20} fill={color} className="pin-pulso" /> : null}
                  <circle cx={cx} cy={cy + 3} r={19} fill="rgba(13,6,24,0.25)" />
                  <circle cx={cx} cy={cy} r={seleccion === p.id ? 21 : 18} fill={hecha ? color : "#ffffff"} stroke={color} strokeWidth={4} />
                  <text x={cx} y={cy + 6} textAnchor="middle" fill={hecha ? "#fff" : color} fontSize={hecha ? 18 : 15} fontWeight={800}>
                    {hecha ? "✓" : p.orden}
                  </text>
                </g>
              );
            })}

            {/* leyenda */}
            <g>
              <rect x={60} y={16} width={520} height={30} rx={10} fill="rgba(255,255,255,0.85)" stroke={COLOR.borde} />
              {RUTAS.map((r, i) => (
                <g key={r.id} transform={`translate(${78 + i * 250} 31)`}>
                  <rect x={0} y={-4} width={34} height={8} rx={4} fill={r.color} />
                  <text x={44} y={4} fill={COLOR.tinta} fontSize={12} fontWeight={700}>
                    {r.nombre}
                  </text>
                  <text x={44 + r.nombre.length * 7.2 + 8} y={4} fill="#5b4b73" fontSize={11}>
                    · {paradasDe(r.id).length} paradas
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>

      {/* La parada elegida o las dos rutas */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
        {parada ? (
          <div className="rounded-[26px] border border-white/12 bg-ink p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: rutaDe(parada.ruta).color }}>
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: rutaDe(parada.ruta).color }} />
                  {rutaDe(parada.ruta).nombre} · parada {parada.orden} de {paradasDe(parada.ruta).length}
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
                {hechas[parada.id].distanciaM !== undefined ? <p className="text-xs text-white/40">A {hechas[parada.id].distanciaM} m del punto del recinto.</p> : null}
                <div className="mt-3 aspect-[4/3] overflow-hidden rounded-2xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/experiencia/archivo?f=${encodeURIComponent(hechas[parada.id].fotoId)}`} alt={`Tu foto en ${parada.nombre}`} className="h-full w-full object-cover" />
                </div>
              </div>
            ) : !juegoAbierto ? (
              <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-light text-white/55">Esta parada se abre el 20 de octubre, en el recinto.</p>
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
                <p className="text-xs font-light leading-relaxed text-white/40">Se abre la cámara. Al subir la foto te pedimos la ubicación para confirmar que estás en el recinto.</p>
              </div>
            )}
            <button type="button" onClick={() => setSeleccion(null)} className="mt-4 text-sm text-white/45 underline underline-offset-4 hover:text-white">
              Ver las dos rutas
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-[26px] border border-white/12 bg-ink p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">Cómo se juega</p>
              <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-tight">Dos rutas, ocho paradas.</h3>
              <p className="mt-3 text-base font-light leading-relaxed text-white/70">
                Sigue una ruta en orden o mézclalas. En cada parada, una foto del stand con el logo visible; cada parada suma {PARADAS[0].puntos} y cada ruta completa, {RUTAS[0].bono} más.
              </p>
              <p className="mt-3 text-sm font-light leading-relaxed text-white/45">
                Te pediremos la ubicación del celular para confirmar que estás en {RECINTO.nombre}. Si el GPS falla bajo techo, la foto igual cuenta.
              </p>
            </div>
            {RUTAS.map((r) => (
              <ListaRuta key={r.id} ruta={r.id} />
            ))}
          </>
        )}
      </aside>
    </div>
  );
}
