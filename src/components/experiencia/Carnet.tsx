"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  aBlob,
  cargarFuentes,
  cargarImagen,
  cargarRecursos,
  dibujar,
  DISENO,
  ENCUADRE_INICIAL,
  familiaDeFuente,
  type Encuadre,
  type Formato,
  type Recursos,
} from "@/lib/carnet";
import type { Vista } from "@/lib/experiencia";
import Dot from "@/components/Dot";
import {
  cargarImagenDeArchivo,
  claseCampo,
  clasesBoton,
  compartirArchivos,
  descargar,
  pedir,
  useMovil,
} from "./util";

/**
 * El editor del carnet. La persona escribe su nombre, sube su foto y la
 * acomoda; el carnet se redibuja con cada cambio. Al guardar se exportan los
 * dos formatos —publicación y historia— y se suben al servidor, y el que está
 * en pantalla se descarga o se comparte.
 */

type Props = { yo: Vista | null; alCambiar: (yo: Vista) => void };

const FORMATOS: { id: Formato; texto: string; nota: string }[] = [
  { id: "feed", texto: "Publicación", nota: "4:5 · LinkedIn e Instagram" },
  { id: "story", texto: "Historia", nota: "9:16 · Instagram y WhatsApp" },
];

export default function Carnet({ yo, alCambiar }: Props) {
  const [nombre, setNombre] = useState(yo?.nombre ?? "");
  const [apellido, setApellido] = useState(yo?.apellido ?? "");
  const [foto, setFoto] = useState<HTMLImageElement | null>(null);
  const [encuadre, setEncuadre] = useState<Encuadre>(ENCUADRE_INICIAL);
  const [formato, setFormato] = useState<Formato>("feed");
  const [recursos, setRecursos] = useState<Record<Formato, Recursos> | null>(null);
  const [familia, setFamilia] = useState("Urbanist, system-ui, sans-serif");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const movil = useMovil();

  const lienzo = useRef<HTMLCanvasElement>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const cuadro = useRef(0);
  const arrastre = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const fotoInicialCargada = useRef(false);

  // Recursos y tipografía se cargan una vez.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const fam = familiaDeFuente();
      await cargarFuentes(fam);
      const [feed, story] = await Promise.all([cargarRecursos("feed"), cargarRecursos("story")]);
      if (!vivo) return;
      setFamilia(fam);
      setRecursos({ feed, story });
    })().catch(() => setError("No pudimos cargar las piezas del carnet. Recarga la página."));
    return () => {
      vivo = false;
    };
  }, []);

  // Si conectó LinkedIn, su foto de perfil arranca puesta.
  useEffect(() => {
    const fotoId = yo?.linkedin?.fotoId;
    if (!fotoId || foto || fotoInicialCargada.current) return;
    fotoInicialCargada.current = true;
    cargarImagen(`/api/experiencia/archivo?f=${encodeURIComponent(fotoId)}`)
      .then((img) => setFoto((actual) => actual ?? img))
      .catch(() => null);
  }, [yo?.linkedin?.fotoId, foto]);

  // Redibujo con cada cambio, agrupado por cuadro de animación.
  useEffect(() => {
    if (!recursos || !lienzo.current) return;
    cancelAnimationFrame(cuadro.current);
    const c = lienzo.current;
    cuadro.current = requestAnimationFrame(() => {
      dibujar(c, { formato, nombre, apellido, foto, encuadre, recursos: recursos[formato], familia });
    });
    return () => cancelAnimationFrame(cuadro.current);
  }, [recursos, formato, nombre, apellido, foto, encuadre, familia]);

  const elegirFoto = useCallback(async (f: File | undefined) => {
    if (!f) return;
    setError(null);
    try {
      const img = await cargarImagenDeArchivo(f);
      setFoto(img);
      setEncuadre(ENCUADRE_INICIAL);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Arrastrar la foto dentro del marco.
  const alPresionar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!foto) return;
    arrastre.current = { x: e.clientX, y: e.clientY, dx: encuadre.dx, dy: encuadre.dy };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const alMover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = arrastre.current;
    if (!a) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const D = DISENO[formato];
    // Cuánto se mueve la foto por cada píxel de pantalla, en unidades del encuadre.
    const kx = (D.w / rect.width) / (D.foto.w * Math.max(0.2, encuadre.zoom - 0.9));
    const ky = (D.h / rect.height) / (D.foto.h * Math.max(0.2, encuadre.zoom - 0.9));
    setEncuadre((prev) => ({
      ...prev,
      dx: Math.max(-1, Math.min(1, a.dx + (e.clientX - a.x) * kx)),
      dy: Math.max(-1, Math.min(1, a.dy + (e.clientY - a.y) * ky)),
    }));
  };
  const alSoltar = () => {
    arrastre.current = null;
  };

  async function guardar(accion: "descargar" | "compartir") {
    if (!recursos || !lienzo.current) return;
    if (!foto) return setError("Sube tu foto para armar el carnet.");
    if (nombre.trim().length < 2) return setError("Escribe tu nombre.");
    setError(null);
    setAviso(null);
    setOcupado(true);
    try {
      // El formato en pantalla ya está dibujado; el otro se dibuja aparte.
      const visible = await aBlob(lienzo.current, 0.92);
      const nombreArchivo = `habi-next-carnet-${formato}.jpg`;

      // Compartir va antes que subir: el sistema solo abre la hoja de
      // compartir si pasa poco tiempo desde que la persona tocó el botón.
      let entregado = false;
      if (accion === "compartir") {
        const r = await compartirArchivos([new File([visible], nombreArchivo, { type: "image/jpeg" })], "Mi carnet de Habi Next Colombia");
        entregado = r === "compartido" || r === "cancelado";
        if (r === "no-soportado") descargar(visible, nombreArchivo);
      } else {
        descargar(visible, nombreArchivo);
        entregado = true;
      }

      const otro: Formato = formato === "feed" ? "story" : "feed";
      const aparte = document.createElement("canvas");
      dibujar(aparte, { formato: otro, nombre, apellido, foto, encuadre, recursos: recursos[otro], familia });
      const salidas: Record<Formato, Blob> = { [formato]: visible, [otro]: await aBlob(aparte, 0.92) } as Record<Formato, Blob>;

      let ultimo: Vista | undefined;
      for (const f of ["feed", "story"] as Formato[]) {
        const fd = new FormData();
        fd.append("imagen", salidas[f], `carnet-${f}.jpg`);
        fd.append("formato", f);
        fd.append("nombre", nombre.trim());
        fd.append("apellido", apellido.trim());
        const r = await pedir<{ ok: boolean; yo: Vista }>("/api/experiencia/carnet", { method: "POST", body: fd });
        ultimo = r.yo;
      }
      if (ultimo) alCambiar(ultimo);
      setAviso(
        entregado
          ? "Listo: tu carnet quedó guardado. Sigue con las misiones para compartirlo."
          : "Tu carnet quedó guardado. Abajo puedes compartirlo."
      );
    } catch (e) {
      setError((e as Error).message || "Algo falló al guardar. Inténtalo otra vez.");
    } finally {
      setOcupado(false);
    }
  }

  const D = DISENO[formato];

  return (
    <section id="carnet" className="relative scroll-mt-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
        {/* Vista previa */}
        <div className="lg:sticky lg:top-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {FORMATOS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormato(f.id)}
                aria-pressed={formato === f.id}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  formato === f.id
                    ? "bg-violet font-semibold text-white"
                    : "border border-white/15 text-white/60 hover:border-white/35 hover:text-white"
                }`}
              >
                {f.texto} <span className="hidden font-light opacity-70 sm:inline">· {f.nota}</span>
              </button>
            ))}
          </div>
          <div
            className="relative mx-auto overflow-hidden rounded-[22px] border border-white/10 bg-ink shadow-[0_40px_90px_-40px_rgba(128,46,246,0.55)]"
            style={{ maxWidth: formato === "feed" ? "34rem" : "26rem", aspectRatio: `${D.w} / ${D.h}` }}
          >
            <canvas
              ref={lienzo}
              width={D.w}
              height={D.h}
              onPointerDown={alPresionar}
              onPointerMove={alMover}
              onPointerUp={alSoltar}
              onPointerCancel={alSoltar}
              className={`block h-full w-full ${foto ? "cursor-grab active:cursor-grabbing" : ""}`}
              style={{ touchAction: foto ? "none" : "auto" }}
              aria-label="Vista previa de tu carnet"
            />
            {!recursos && !error ? (
              <div className="absolute inset-0 grid place-items-center bg-night/70 text-sm text-white/60">
                Preparando tu carnet…
              </div>
            ) : null}
          </div>
          {foto ? (
            <p className="mt-3 text-center text-xs font-light text-white/45">
              Arrastra la foto para acomodarla. El carnet sale en blanco y negro, como la pieza oficial.
            </p>
          ) : null}
        </div>

        {/* Formulario */}
        <div className="flex flex-col gap-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2.5">
              <span className="text-sm font-medium tracking-tight text-white/65">Nombre</span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={40}
                autoComplete="given-name"
                placeholder="Felipe"
                className={claseCampo}
              />
            </label>
            <label className="flex flex-col gap-2.5">
              <span className="text-sm font-medium tracking-tight text-white/65">Apellido</span>
              <input
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                maxLength={40}
                autoComplete="family-name"
                placeholder="Restrepo"
                className={claseCampo}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-medium tracking-tight text-white/65">Tu foto</span>
            <input
              ref={archivo}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => elegirFoto(e.target.files?.[0])}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => archivo.current?.click()} className={clasesBoton.borde}>
                {foto ? "Cambiar foto" : "Subir mi foto"}
              </button>
              <span className="text-sm font-light text-white/45">
                {foto ? "Se ve mejor de frente y con luz." : "Una foto tuya, de frente, con buena luz."}
              </span>
            </div>
          </div>

          {foto ? (
            <label className="flex flex-col gap-2.5">
              <span className="flex items-center justify-between text-sm font-medium tracking-tight text-white/65">
                Acercar
                <span className="text-xs font-light text-white/40">{Math.round(encuadre.zoom * 100)}%</span>
              </span>
              <input
                type="range"
                min={1}
                max={2.6}
                step={0.01}
                value={encuadre.zoom}
                onChange={(e) => setEncuadre((prev) => ({ ...prev, zoom: Number(e.target.value) }))}
                className="accent-violet"
              />
            </label>
          ) : null}

          {error ? (
            <p role="alert" className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-400/[0.08] px-5 py-4 text-base font-light text-red-200">
              <Dot color="rgb(252 165 165)" className="mt-2.5 h-1.5 w-1.5" />
              {error}
            </p>
          ) : null}
          {aviso ? (
            <p className="flex items-start gap-3 rounded-2xl border border-violet/40 bg-violet/10 px-5 py-4 text-base font-light">
              <Dot color="var(--violet-soft)" className="mt-2.5 h-1.5 w-1.5" />
              {aviso}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={ocupado || !recursos}
              onClick={() => guardar(movil ? "compartir" : "descargar")}
              className={clasesBoton.solido}
            >
              {ocupado ? "Guardando…" : movil ? "Guardar y compartir" : "Guardar y descargar"}
            </button>
            {movil ? (
              <button type="button" disabled={ocupado || !recursos} onClick={() => guardar("descargar")} className={clasesBoton.borde}>
                Solo descargar
              </button>
            ) : null}
          </div>
          <p className="text-sm font-light leading-relaxed text-white/45">
            Al guardar, el carnet queda en tu sesión y se usa en las misiones. Tu foto no se publica en
            ningún lado sin que tú le des el botón.
          </p>
        </div>
      </div>
    </section>
  );
}
