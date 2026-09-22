"use client";

import { useMemo, useRef, useState } from "react";
import Dot from "@/components/Dot";
import { PARADAS, paradasDe, RECINTO, RUTAS, type Fase, type Parada, type RutaId } from "@/config/experiencia";
import type { Vista } from "@/lib/experiencia";
import Plano from "./Plano";
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
    <div className="flex flex-col gap-5">
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

        {/* El plano ocupa todo el ancho; en el celular se desliza de lado. */}
        <div className="overflow-x-auto rounded-[26px] border border-white/12 shadow-[0_40px_90px_-40px_rgba(128,46,246,0.5)]">
          <div className="min-w-[960px]">
          <Plano
            hechas={hechas}
            seleccion={seleccion}
            visible={visible}
            proximas={proximaDe}
            juegoAbierto={juegoAbierto}
            alElegir={(id) => setSeleccion(id)}
          />
          </div>
        </div>
        <p className="-mt-2 text-xs font-light text-white/40 lg:hidden">Desliza el mapa hacia los lados para verlo completo.</p>

      {/* La parada elegida y las dos rutas */}
      <aside className="grid gap-4 lg:grid-cols-3 lg:items-start">
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
              Cerrar
            </button>
          </div>
        ) : (
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
        )}
        {RUTAS.map((r) => (
          <ListaRuta key={r.id} ruta={r.id} />
        ))}
      </aside>
    </div>
  );
}
