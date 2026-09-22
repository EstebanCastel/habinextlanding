"use client";

import type { ReactNode } from "react";
import { PARADAS, paradasDe, RUTAS, type Parada, type RutaId } from "@/config/experiencia";

/**
 * El plano ilustrado del recinto, en isométrico. Todo se dibuja a partir de
 * coordenadas del mundo (metros, más o menos) proyectadas a la pantalla, para
 * que el edificio, los stands, las tarimas y los árboles tengan volumen y se
 * ordenen solos de atrás hacia adelante. Los rótulos, los logos y los pines
 * van derechos, encima de todo, como en un mapa de festival.
 */

// ---------- proyección ----------

const ESCALA = 7;
const OX = 700;
const OY = 60;
const iso = (x: number, y: number, z = 0) => ({ sx: OX + (x - y) * 0.866 * ESCALA, sy: OY + (x + y) * 0.5 * ESCALA - z * ESCALA });
const pts = (lista: [number, number, number][]) => lista.map(([x, y, z]) => { const p = iso(x, y, z); return `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`; }).join(" ");

/** Oscurece un color hex un factor (0 = igual, 1 = negro). */
function sombra(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - f));
  const g = Math.round(((n >> 8) & 255) * (1 - f));
  const b = Math.round((n & 255) * (1 - f));
  return `rgb(${r},${g},${b})`;
}

/** Una losa plana en el suelo. */
function Losa({ x, y, w, d, color, borde }: { x: number; y: number; w: number; d: number; color: string; borde?: string }) {
  return <polygon points={pts([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]])} fill={color} stroke={borde} strokeWidth={borde ? 1.5 : 0} strokeLinejoin="round" />;
}

/** Una caja con volumen: tapa clara, cara izquierda media, cara derecha oscura. */
function Caja({ x, y, w, d, h, color, tapa, opacidad = 1 }: { x: number; y: number; w: number; d: number; h: number; color: string; tapa?: string; opacidad?: number }) {
  return (
    <g opacity={opacidad}>
      <polygon points={pts([[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, h], [x, y + d, h]])} fill={sombra(color, 0.16)} />
      <polygon points={pts([[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, h], [x + w, y, h]])} fill={sombra(color, 0.3)} />
      <polygon points={pts([[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]])} fill={tapa ?? color} />
    </g>
  );
}

function Arbol({ x, y, r = 1.3, color = "#3f9d5a" }: { x: number; y: number; r?: number; color?: string }) {
  const base = iso(x, y, 0);
  const copa = iso(x, y, r * 1.6);
  return (
    <g>
      <ellipse cx={base.sx + 2} cy={base.sy + 1} rx={r * ESCALA * 0.6} ry={r * ESCALA * 0.3} fill="rgba(20,60,30,0.22)" />
      <line x1={base.sx} y1={base.sy} x2={copa.sx} y2={copa.sy} stroke="#6b4b2a" strokeWidth={1.8} />
      <circle cx={copa.sx} cy={copa.sy} r={r * ESCALA * 0.7} fill={color} />
      <circle cx={copa.sx - r * 2} cy={copa.sy - r * 1.8} r={r * ESCALA * 0.32} fill="rgba(255,255,255,0.16)" />
    </g>
  );
}

function Persona({ x, y, color = "#3d1080" }: { x: number; y: number; color?: string }) {
  const p = iso(x, y, 1.9);
  return (
    <g>
      <ellipse cx={p.sx} cy={p.sy + 12} rx={4} ry={2} fill="rgba(0,0,0,0.2)" />
      <rect x={p.sx - 4} y={p.sy} width={8} height={10} rx={3} fill={color} />
      <circle cx={p.sx} cy={p.sy - 4} r={3.6} fill="#f3d3b8" />
    </g>
  );
}

function Carro({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <Caja x={x} y={y} w={4.2} d={2} h={1.1} color={color} />
      <Caja x={x + 0.9} y={y + 0.3} w={2.2} d={1.4} h={0.9} color={sombra(color, 0.35)} tapa="#c9d8f0" />
    </g>
  );
}

function Silla({ x, y, color = "#c4b1f5" }: { x: number; y: number; color?: string }) {
  return <Caja x={x} y={y} w={1.1} d={1.1} h={0.9} color={color} />;
}

function Portatil({ x, y, z }: { x: number; y: number; z: number }) {
  const p = iso(x, y, z);
  return (
    <g>
      <rect x={p.sx - 4} y={p.sy - 3} width={8} height={5} rx={1} fill="#0d0618" />
      <rect x={p.sx - 3} y={p.sy - 2.2} width={6} height={3} fill="#ba9dfa" />
    </g>
  );
}

/** Rótulo blanco con borde, como los de los mapas de festival. */
function Placa({ x, y, z = 0, texto, tono = "claro", tam = 11 }: { x: number; y: number; z?: number; texto: string; tono?: "claro" | "oscuro" | "morado"; tam?: number }) {
  const p = iso(x, y, z);
  const w = texto.length * (tam * 0.62) + 22;
  const fondo = tono === "claro" ? "#ffffff" : tono === "morado" ? "#802ef6" : "#0d0618";
  const color = tono === "claro" ? "#0d0618" : "#ffffff";
  return (
    <g>
      <rect x={p.sx - w / 2 + 2} y={p.sy - tam + 2} width={w} height={tam + 12} rx={6} fill="rgba(13,6,24,0.25)" />
      <rect x={p.sx - w / 2} y={p.sy - tam} width={w} height={tam + 12} rx={6} fill={fondo} stroke={tono === "claro" ? "#0d0618" : "none"} strokeWidth={1.5} />
      <text x={p.sx} y={p.sy + 3} textAnchor="middle" fill={color} fontSize={tam} fontWeight={800} letterSpacing={0.8}>
        {texto}
      </text>
    </g>
  );
}

function PlacaLogo({ x, y, z, parada, color, seleccionado }: { x: number; y: number; z: number; parada: Parada; color: string; seleccionado: boolean }) {
  const p = iso(x, y, z);
  const w = 98;
  const h = 30;
  return (
    <g>
      <line x1={p.sx} y1={p.sy + h / 2} x2={p.sx} y2={p.sy + h / 2 + (z - 4.4) * ESCALA} stroke="#0d0618" strokeWidth={2} />
      <rect x={p.sx - w / 2 + 2} y={p.sy - h / 2 + 3} width={w} height={h} rx={7} fill="rgba(13,6,24,0.3)" />
      <rect x={p.sx - w / 2} y={p.sy - h / 2} width={w} height={h} rx={7} fill={parada.fondo ?? "#ffffff"} stroke={seleccionado ? color : "#0d0618"} strokeWidth={seleccionado ? 3 : 1.5} />
      {parada.logo ? <image href={parada.logo} x={p.sx - w / 2 + 8} y={p.sy - h / 2 + 5} width={w - 16} height={h - 10} preserveAspectRatio="xMidYMid meet" /> : null}
    </g>
  );
}

// ---------- el mundo ----------

/** Dónde está cada parada en el mundo (esquina de su stand o centro del escenario). */
export const MUNDO: Record<string, { x: number; y: number }> = {
  "caja-social": { x: 13, y: 45 },
  wekall: { x: 42, y: 45 },
  auco: { x: 71, y: 45 },
  palomma: { x: 13, y: 58 },
  "banco-bogota": { x: 42, y: 58 },
  grapez: { x: 71, y: 58 },
  inspira: { x: 34, y: 27 },
  taller: { x: 82, y: 27 },
};

const ANCHO_STAND = 14;

/** El punto del pin de una parada, en el mundo: el frente del stand o el centro del escenario. */
function puntoDe(p: Parada): { x: number; y: number } {
  const m = MUNDO[p.id];
  return p.tipo === "stand" ? { x: m.x + ANCHO_STAND / 2, y: m.y + 8.8 } : m;
}

/** El punto del pin de una parada, en pantalla. */
export function pinDe(p: Parada): { sx: number; sy: number } {
  const q = puntoDe(p);
  return iso(q.x, q.y, 0);
}

/** El recorrido entre dos paradas, por el pasillo y por los huecos entre stands. */
function camino(a: Parada, b: Parada, ruta: RutaId): string {
  const pa = puntoDe(a);
  const pb = puntoDe(b);
  const pasillo = ruta === "morada" ? 39.3 : 41.3;
  const zona = (p: { y: number }) => (p.y < 38 ? "sala" : "hall");
  let lista: [number, number][];
  if (zona(pa) !== zona(pb)) lista = [[pa.x, pa.y], [pa.x, pasillo], [pb.x, pasillo], [pb.x, pb.y]];
  else if (pa.y === pb.y) lista = [[pa.x, pa.y], [pb.x, pb.y]];
  else {
    // Entre filas se camina por el hueco entre columnas de stands.
    const hueco = pa.x < pb.x ? pa.x + 14.5 : pa.x - 14.5;
    lista = [[pa.x, pa.y], [hueco, pa.y], [hueco, 56.2], [pb.x, 56.2], [pb.x, pb.y]];
  }
  return "M " + lista.map(([x, y]) => { const p = iso(x, y, 0.2); return `${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`; }).join(" L ");
}

/** Un stand: pared del fondo, mostrador con portátil, dos butacos, alguien atendiendo y el logo flotando. */
function Stand({ p, color, seleccionado, onClick }: { p: Parada; color: string; seleccionado: boolean; onClick: () => void }) {
  const m = MUNDO[p.id];
  return (
    <g onClick={onClick} className="cursor-pointer">
      <Losa x={m.x - 1} y={m.y - 1} w={ANCHO_STAND + 2} d={10} color="#e6ddfa" />
      <Caja x={m.x} y={m.y} w={ANCHO_STAND} d={1.1} h={4.6} color="#efe8fb" tapa="#ffffff" />
      <polygon points={pts([[m.x + 0.4, m.y + 1.1, 0.6], [m.x + ANCHO_STAND - 0.4, m.y + 1.1, 0.6], [m.x + ANCHO_STAND - 0.4, m.y + 1.1, 4.2], [m.x + 0.4, m.y + 1.1, 4.2]])} fill={color} opacity={0.18} />
      <Caja x={m.x + 2} y={m.y + 4} w={10} d={1.8} h={1.9} color="#f6f1ff" tapa="#ffffff" />
      <Portatil x={m.x + 4.2} y={m.y + 4.9} z={1.95} />
      <Portatil x={m.x + 9.2} y={m.y + 4.9} z={1.95} />
      <Caja x={m.x + 6.4} y={m.y + 4.5} w={1.8} d={0.8} h={0.1} color={color} />
      <Caja x={m.x + 2.6} y={m.y + 7} w={1} d={1} h={1.1} color={color} />
      <Caja x={m.x + 10.2} y={m.y + 7} w={1} d={1} h={1.1} color={color} />
      <Persona x={m.x + 7} y={m.y + 2.9} />
      <Persona x={m.x + 3.5} y={m.y + 8.5} color="#f2b134" />
      {/* La fila de atrás lleva el logo más alto, para que no se monte sobre la de adelante. */}
      <PlacaLogo x={m.x + ANCHO_STAND / 2} y={m.y} z={m.y < 50 ? 10.5 : 6.8} parada={p} color={color} seleccionado={seleccionado} />
    </g>
  );
}

function Tarima({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <Caja x={x} y={y} w={w} d={6} h={1} color="#5a1fb8" tapa="#802ef6" />
      <Caja x={x + 6} y={y + 0.3} w={w - 12} d={0.5} h={3.8} color="#0d0618" tapa="#1b0f2e" />
      <polygon points={pts([[x + 6.4, y + 0.8, 1.4], [x + w - 6.4, y + 0.8, 1.4], [x + w - 6.4, y + 0.8, 4.4], [x + 6.4, y + 0.8, 4.4]])} fill="#ba9dfa" opacity={0.9} />
      <Caja x={x + 0.6} y={y + 0.8} w={1.4} d={1.2} h={2.6} color="#0d0618" />
      <Caja x={x + w - 2} y={y + 0.8} w={1.4} d={1.2} h={2.6} color="#0d0618" />
      <Caja x={x + w - 8} y={y + 3.6} w={1} d={0.8} h={1.4} color="#0d0618" />
      <Persona x={x + w / 2} y={y + 3.8} color="#0d0618" />
    </g>
  );
}

function MesaTaller({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <Silla x={x + 0.6} y={y - 1.3} /><Silla x={x + 2.4} y={y - 1.3} /><Silla x={x + 4.2} y={y - 1.3} />
      <Caja x={x} y={y} w={6} d={2.6} h={1.5} color="#ede6fb" tapa="#ffffff" />
      <Portatil x={x + 1.6} y={y + 1.3} z={1.55} />
      <Portatil x={x + 4.2} y={y + 1.3} z={1.55} />
      <Silla x={x + 0.6} y={y + 2.9} /><Silla x={x + 2.4} y={y + 2.9} /><Silla x={x + 4.2} y={y + 2.9} />
    </g>
  );
}

function Sofa({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <Caja x={x} y={y} w={4.4} d={1.8} h={0.9} color="#5a1fb8" tapa="#802ef6" />
      <Caja x={x} y={y} w={4.4} d={0.5} h={1.7} color="#4b1a8b" tapa="#802ef6" />
    </g>
  );
}

function Sombrilla({ x, y }: { x: number; y: number }) {
  const b = iso(x, y, 0);
  const t = iso(x, y, 3.2);
  return (
    <g>
      <line x1={b.sx} y1={b.sy} x2={t.sx} y2={t.sy} stroke="#0d0618" strokeWidth={1.5} />
      <ellipse cx={t.sx} cy={t.sy} rx={13} ry={7} fill="#ba9dfa" stroke="#802ef6" strokeWidth={1.5} />
    </g>
  );
}

// ---------- el plano completo ----------

export type PlanoProps = {
  hechas: Record<string, unknown>;
  seleccion: string | null;
  visible: (ruta: RutaId) => boolean;
  proximas: Partial<Record<RutaId, Parada | undefined>>;
  juegoAbierto: boolean;
  alElegir: (id: string) => void;
};

const ARBOLES: [number, number, number, string][] = (() => {
  // Árboles repartidos con un generador fijo, para que el bosque salga igual siempre.
  let s = 20261020;
  const al = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const verdes = ["#2e8b57", "#3f9d5a", "#56b36b", "#347c4d", "#4caf6e", "#2b7a4a"];
  const lista: [number, number, number, string][] = [];
  const zonas: [number, number, number, number, number][] = [
    [-3, -3, 9, 104, 44], // franja izquierda
    [-3, -3, 118, 6, 40], // franja del fondo
    [44, 81, 46, 2.5, 12], // borde de la plaza
    [94, 80, 16, 16, 16], // jardín junto a la entrada
    [-3, 96.5, 116, 2.5, 22], // andén de la calle
    [109, 4, 3, 74, 16], // costado del edificio
    [40, 78, 5, 18, 6], // entre el parqueadero y la plaza
  ];
  for (const [x0, y0, w, d, n] of zonas) {
    for (let i = 0; i < n; i += 1) lista.push([x0 + al() * w, y0 + al() * d, 0.9 + al() * 0.9, verdes[Math.floor(al() * verdes.length)]]);
  }
  return lista;
})();

export default function Plano({ hechas, seleccion, visible, proximas, juegoAbierto, alElegir }: PlanoProps) {
  const rutaDe = (id: RutaId) => RUTAS.find((r) => r.id === id)!;
  const segmentos = RUTAS.flatMap((r) => {
    const ps = paradasDe(r.id);
    return ps.slice(0, -1).map((a, i) => {
      const b = ps[i + 1];
      const hecho = Boolean(hechas[b.id]) && Boolean(hechas[a.id]);
      const vivo = !hecho && (i === 0 ? true : Boolean(hechas[a.id])) && !hechas[b.id];
      return { id: `${a.id}-${b.id}`, ruta: r.id, d: camino(a, b, r.id), color: r.color, hecho, vivo };
    });
  });

  const arbolesAtras = ARBOLES.filter(([x, y]) => x + y < 60);
  const arbolesAdelante = ARBOLES.filter(([x, y]) => x + y >= 60);

  const filas: ReactNode[] = [];
  for (let f = 0; f < 5; f += 1) for (let c = 0; c < 8; c += 1) filas.push(<Silla key={`s${f}-${c}`} x={17.5 + c * 4.4} y={19 + f * 3.2} />);

  return (
    <svg viewBox="0 0 1480 900" role="img" aria-label="Mapa ilustrado del recinto con las dos rutas y sus paradas" className="block h-auto w-full">
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d0618" />
          <stop offset="1" stopColor="#1a0b30" />
        </linearGradient>
      </defs>
      <rect width="1480" height="900" fill="url(#cielo)" />

      {/* ---- terreno ---- */}
      <Losa x={-4} y={-4} w={128} d={112} color="#7cc46a" borde="rgba(0,0,0,0.18)" />
      {/* calles */}
      <Losa x={116} y={-4} w={8} d={112} color="#4a4a58" />
      <Losa x={-4} y={100} w={128} d={8} color="#4a4a58" />
      <polyline points={pts([[120, -4, 0.05], [120, 108, 0.05]])} fill="none" stroke="#f5f0ff" strokeWidth={2} strokeDasharray="10 12" />
      <polyline points={pts([[-4, 104, 0.05], [124, 104, 0.05]])} fill="none" stroke="#f5f0ff" strokeWidth={2} strokeDasharray="10 12" />
      {/* andenes */}
      <Losa x={112} y={-4} w={4} d={104} color="#d9d3e6" />
      <Losa x={-4} y={96} w={120} d={4} color="#d9d3e6" />
      {/* parqueadero */}
      <Losa x={6} y={78} w={34} d={17} color="#6b6b78" borde="rgba(255,255,255,0.35)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <polyline key={`pl${i}`} points={pts([[9 + i * 5.4, 80, 0.05], [9 + i * 5.4, 86.5, 0.05]])} fill="none" stroke="#f5f0ff" strokeWidth={1.5} />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <polyline key={`pl2${i}`} points={pts([[9 + i * 5.4, 88.5, 0.05], [9 + i * 5.4, 94, 0.05]])} fill="none" stroke="#f5f0ff" strokeWidth={1.5} />
      ))}
      {[["#e05a5a", 9.6, 81], ["#5aa0e0", 15, 81], ["#f2b134", 25.8, 81], ["#ffffff", 31.2, 81], ["#802ef6", 9.6, 89.5], ["#2e8b57", 20.4, 89.5], ["#e0e0e0", 31.2, 89.5]].map(([c, x, y]) => (
        <Carro key={`${x}-${y}`} x={x as number} y={y as number} color={c as string} />
      ))}
      {/* plaza de entrada */}
      <Losa x={44} y={80} w={48} d={16} color="#e9e2f7" borde="rgba(0,0,0,0.12)" />
      <Losa x={58} y={80} w={20} d={16} color="#dcd0f7" />
      {arbolesAtras.map(([x, y, r, c], i) => <Arbol key={`a${i}`} x={x} y={y} r={r} color={c} />)}

      {/* ---- el edificio, destapado ---- */}
      <Caja x={7} y={3} w={102} d={1} h={5.5} color="#ded3f7" tapa="#f1ebfc" />
      <Caja x={7} y={3} w={1} d={76} h={5.5} color="#ded3f7" tapa="#f1ebfc" />
      <Losa x={8} y={4} w={101} d={75} color="#f5f1fc" />
      {/* salas */}
      <Losa x={12} y={7} w={44} d={29} color="#efe8fb" borde="#d9ccfa" />
      <Losa x={60} y={7} w={44} d={29} color="#efe8fb" borde="#d9ccfa" />
      <Losa x={12} y={43} w={80} d={25} color="#faf7ff" borde="#d9ccfa" />
      <Losa x={94} y={43} w={12} d={10} color="#d9c6ff" borde="#c9b8f5" />
      <Losa x={94} y={55} w={12} d={12} color="#fff3e0" borde="#e8d5b8" />
      <Losa x={12} y={69} w={94} d={9} color="#f1ebfc" borde="#d9ccfa" />
      <Caja x={56} y={7} w={0.8} d={29} h={3} color="#e2d8f7" tapa="#ffffff" />
      <Caja x={12} y={37.5} w={94} d={0.6} h={2.4} color="#e2d8f7" tapa="#ffffff" opacidad={0.9} />
      <Caja x={12} y={68.2} w={94} d={0.6} h={2} color="#e2d8f7" tapa="#ffffff" opacidad={0.9} />

      {/* Escenario Inspira */}
      <Tarima x={15} y={8} w={38} />
      {filas}
      {/* Escenario Taller */}
      <Tarima x={63} y={8} w={38} />
      {[[63, 20], [77, 20], [91, 20], [63, 29], [77, 29], [91, 29]].map(([x, y]) => (
        <MesaTaller key={`m${x}-${y}`} x={x} y={y} />
      ))}
      {/* Hall: stands */}
      {PARADAS.filter((p) => p.tipo === "stand").map((p) => (
        <g key={p.id} opacity={visible(p.ruta) ? 1 : 0.35}>
          <Stand p={p} color={rutaDe(p.ruta).color} seleccionado={seleccion === p.id} onClick={() => alElegir(p.id)} />
        </g>
      ))}
      {/* punto de foto */}
      <Caja x={81} y={47} w={5} d={4} h={4.5} color="#3d1080" tapa="#4b1a8b" />
      <Persona x={83.5} y={53} color="#802ef6" />
      {/* zona VIP */}
      <Sofa x={95} y={45} />
      <Sofa x={100.5} y={45} />
      <Caja x={98} y={48.6} w={2.4} d={2.4} h={0.9} color="#e6ddfa" tapa="#ffffff" />
      <Persona x={102} y={50.5} color="#802ef6" />
      {/* café */}
      <Caja x={95} y={57} w={8} d={1.6} h={1.7} color="#8b5a2b" tapa="#c58b4a" />
      <Sombrilla x={97} y={62.5} />
      <Sombrilla x={103} y={64.5} />
      <Caja x={100} y={61.5} w={1.8} d={1.8} h={1} color="#e6ddfa" tapa="#ffffff" />
      <Persona x={99} y={60} />
      {/* vestíbulo: acreditación y baños */}
      {[16, 24, 32].map((x) => (
        <g key={`d${x}`}>
          <Silla x={x + 2} y={69.6} />
          <Caja x={x} y={71} w={5} d={1.5} h={1.5} color="#ede6fb" tapa="#ffffff" />
          <Portatil x={x + 2.5} y={71.7} z={1.55} />
        </g>
      ))}
      <Persona x={18} y={74.5} color="#f2b134" />
      <Persona x={26} y={74.5} color="#f2b134" />
      <Persona x={34} y={74.8} color="#0d0618" />
      <Caja x={96} y={70} w={8} d={5} h={3.2} color="#e2d8f7" tapa="#ffffff" />
      {/* entrada, en la fachada */}
      <Caja x={56} y={78} w={16} d={1.4} h={6.5} color="#5a1fb8" tapa="#802ef6" />
      <polygon points={pts([[58, 79.5, 0], [70, 79.5, 0], [70, 79.5, 5], [58, 79.5, 5]])} fill="#0d0618" opacity={0.85} />
      <Persona x={60} y={83} color="#0d0618" />
      <Persona x={66} y={85} color="#802ef6" />
      <Persona x={63} y={88} color="#3d1080" />
      <Persona x={72} y={86} color="#f2b134" />
      {/* plantas del hall y del pasillo */}
      {[[13, 40.5], [60, 40.5], [91, 40.5], [13, 66], [91, 66], [50, 76], [88, 76]].map(([x, y]) => (
        <Arbol key={`pl${x}-${y}`} x={x} y={y} r={0.9} color="#56b36b" />
      ))}
      {[[30, 40], [52, 40.5], [70, 39.6], [96, 61], [46, 84], [52, 88], [80, 84], [86, 90], [38, 74], [78, 72]].map(([x, y], i) => (
        <Persona key={`g${i}`} x={x} y={y} color={["#3d1080", "#802ef6", "#0d0618", "#f2b134"][i % 4]} />
      ))}
      {[[47, 83], [89, 83], [47, 94], [89, 94], [64, 95]].map(([x, y]) => (
        <g key={`mata${x}-${y}`}>
          <Caja x={x} y={y} w={2.2} d={2.2} h={0.8} color="#c9b8f5" tapa="#e6ddfa" />
          <Arbol x={x + 1.1} y={y + 1.1} r={0.7} color="#56b36b" />
        </g>
      ))}
      {arbolesAdelante.map(([x, y, r, c], i) => <Arbol key={`b${i}`} x={x} y={y} r={r} color={c} />)}

      {/* ---- rutas ---- */}
      {segmentos.map((s) => (
        <g key={s.id} opacity={visible(s.ruta) ? 1 : 0.12}>
          <path d={s.d} fill="none" stroke="#ffffff" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
          <path d={s.d} fill="none" stroke={s.color} strokeWidth={s.hecho ? 7 : 6} strokeOpacity={s.hecho ? 1 : s.vivo ? 0.95 : 0.5} strokeLinecap="round" strokeLinejoin="round" className={s.vivo ? "ruta-viva" : undefined} />
        </g>
      ))}

      {/* ---- pines ---- */}
      {PARADAS.map((p) => {
        const hecha = Boolean(hechas[p.id]);
        const { sx, sy } = pinDe(p);
        const color = rutaDe(p.ruta).color;
        const esProxima = proximas[p.ruta]?.id === p.id;
        return (
          <g key={p.id} role="button" tabIndex={0} aria-label={`${p.nombre}, parada ${p.orden} de la ${rutaDe(p.ruta).nombre}${hecha ? ", hecha" : ""}`} onClick={() => alElegir(p.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") alElegir(p.id); }} opacity={visible(p.ruta) ? 1 : 0.25} className="cursor-pointer focus:outline-none">
            {esProxima && juegoAbierto && visible(p.ruta) ? <circle cx={sx} cy={sy} r={20} fill={color} className="pin-pulso" /> : null}
            <ellipse cx={sx} cy={sy + 4} rx={16} ry={7} fill="rgba(13,6,24,0.35)" />
            <circle cx={sx} cy={sy - 6} r={seleccion === p.id ? 21 : 18} fill={hecha ? color : "#ffffff"} stroke={color} strokeWidth={4} />
            <text x={sx} y={sy} textAnchor="middle" fill={hecha ? "#fff" : color} fontSize={hecha ? 18 : 15} fontWeight={800}>{hecha ? "✓" : p.orden}</text>
          </g>
        );
      })}

      {/* ---- rótulos ---- */}
      <Placa x={34} y={8} z={11.5} texto="Escenario Inspira" />
      <Placa x={82} y={8} z={11.5} texto="Escenario Taller" />
      <Placa x={100} y={43} z={5} texto="Zona VIP" tam={10} />
      <Placa x={100} y={55} z={5.5} texto="Café" tam={10} />
      <Placa x={24} y={69.5} z={5} texto="Acreditación" tam={10} />
      <Placa x={100} y={70} z={6} texto="Baños" tam={10} />
      <Placa x={64} y={78} z={10} texto="Entrada" tono="morado" />
      <Placa x={23} y={95} z={1.5} texto="Parqueadero" tam={10} />
      <Placa x={83.5} y={47} z={8.5} texto="Punto de foto" tam={10} />
      <Placa x={68} y={80} z={1} texto="Plaza" tam={10} />
      {/* calles */}
      {(() => { const p = iso(120, 40, 0.1); return <text x={p.sx} y={p.sy} transform={`rotate(30 ${p.sx} ${p.sy})`} textAnchor="middle" fill="#ffffff" fontSize={16} fontWeight={800} letterSpacing={2}>AV. CARRERA 68</text>; })()}
      {(() => { const p = iso(50, 104, 0.1); return <text x={p.sx} y={p.sy} transform={`rotate(-30 ${p.sx} ${p.sy})`} textAnchor="middle" fill="#ffffff" fontSize={16} fontWeight={800} letterSpacing={2}>CALLE 49A</text>; })()}
      {/* título y leyenda */}
      <g>
        <rect x={24} y={24} width={470} height={54} rx={12} fill="rgba(255,255,255,0.92)" stroke="#0d0618" strokeWidth={1.5} />
        <text x={40} y={46} fill="#0d0618" fontSize={15} fontWeight={800} letterSpacing={0.5}>Centro de Convenciones Compensar Av. 68</text>
        <text x={40} y={66} fill="#5b4b73" fontSize={12} fontWeight={500}>Habi Next Colombia · martes 20 de octubre · Bogotá</text>
      </g>
      <g>
        <rect x={24} y={90} width={300} height={34} rx={10} fill="rgba(255,255,255,0.92)" stroke="#0d0618" strokeWidth={1.5} />
        {RUTAS.map((r, i) => (
          <g key={r.id} transform={`translate(${40 + i * 145} 107)`}>
            <rect x={0} y={-4} width={30} height={8} rx={4} fill={r.color} />
            <text x={38} y={4} fill="#0d0618" fontSize={12} fontWeight={700}>{r.nombre}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
