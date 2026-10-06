"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  aBlob,
  cargarFuentes,
  cargarImagen,
  cargarRecursos,
  dibujar,
  dibujarReverso,
  DISENO,
  ENCUADRE_INICIAL,
  familiaDeFuente,
  type Encuadre,
  type Formato,
  type Recursos,
} from "@/lib/carnet";
import type { Vista } from "@/lib/experiencia";
import type { MisionId } from "@/config/experiencia";
import Dot from "@/components/Dot";
import { BotonRed } from "./Redes";
import type { EntradaVista } from "./entrada";
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
 * dos formatos —publicación e historia— y se suben al servidor, y el que está
 * en pantalla se descarga o se comparte.
 *
 * El carnet es una carta con dos caras: al frente la pieza que se publica y
 * atrás la entrada, con el QR de Luma. La carta flota, se inclina con el
 * mouse y un destello la recorre cada tanto, para que se vea viva; el giro
 * se dispara con el botón o desde «Ver mi QR» arriba.
 */

type Props = {
  yo: Vista | null;
  alCambiar: (yo: Vista) => void;
  alPublicar: (m: MisionId) => void;
  /** La entrada de la persona, para el reverso. */
  entrada: EntradaVista | null;
  motivo: string;
  /** Sube cada vez que, desde arriba, alguien pide ver el QR: la carta se gira sola. */
  pedidoQr?: number;
  /** Lo que va debajo de la nota de guardar: los distintivos de la billetera. */
  pie?: ReactNode;
};

const FORMATOS: { id: Formato; texto: string; nota: string }[] = [
  { id: "feed", texto: "Publicación", nota: "4:5 · LinkedIn e Instagram" },
  { id: "story", texto: "Historia", nota: "9:16 · Instagram y WhatsApp" },
];

export default function Carnet({ yo, alCambiar, alPublicar, entrada, motivo, pedidoQr = 0, pie }: Props) {
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
  const [volteado, setVolteado] = useState(false);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);
  const movil = useMovil();

  // El pedido llega desde «Tu entrada»: se gira al QR sin buscar el botón.
  const [pedidoVisto, setPedidoVisto] = useState(pedidoQr);
  if (pedidoQr !== pedidoVisto) {
    setPedidoVisto(pedidoQr);
    if (pedidoQr > 0) setVolteado(true);
  }

  const lienzo = useRef<HTMLCanvasElement>(null);
  const reverso = useRef<HTMLCanvasElement>(null);
  const escena = useRef<HTMLDivElement>(null);
  const carta = useRef<HTMLDivElement>(null);
  const brillo = useRef<HTMLDivElement>(null);
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

  // El QR de Luma se rasteriza una vez; nivel de corrección alto porque se
  // lee de una pantalla, a veces con brillo y con la mano temblando en fila.
  useEffect(() => {
    const qr = entrada?.qr;
    if (!qr) return;
    let vivo = true;
    QRCode.toDataURL(qr, { errorCorrectionLevel: "H", margin: 0, width: 720, color: { dark: "#07040dff", light: "#ffffffff" } })
      .then((url) => cargarImagen(url))
      .then((img) => {
        if (vivo) setQrImg(img);
      })
      .catch(() => null);
    return () => {
      vivo = false;
    };
  }, [entrada?.qr]);

  // Redibujo del frente con cada cambio, agrupado por cuadro de animación.
  useEffect(() => {
    if (!recursos || !lienzo.current) return;
    cancelAnimationFrame(cuadro.current);
    const c = lienzo.current;
    cuadro.current = requestAnimationFrame(() => {
      dibujar(c, { formato, nombre, apellido, foto, encuadre, recursos: recursos[formato], familia });
    });
    return () => cancelAnimationFrame(cuadro.current);
  }, [recursos, formato, nombre, apellido, foto, encuadre, familia]);

  // El reverso cambia menos: nombre, formato y la entrada.
  const tier = entrada?.tier ?? yo?.registro?.tier ?? "general";
  useEffect(() => {
    if (!recursos || !reverso.current) return;
    dibujarReverso(reverso.current, {
      formato,
      nombre,
      apellido,
      tier,
      qr: entrada?.qr ? qrImg : null,
      correo: entrada?.correo,
      cedula: entrada?.cedula,
      aviso: motivo || entrada?.motivo || undefined,
      recursos: recursos[formato],
      familia,
    });
  }, [recursos, formato, nombre, apellido, tier, entrada, qrImg, motivo, familia]);

  // --- la carta viva: flotación, destello y giro ---
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(carta.current, { y: -8, rotateZ: 0.4, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.fromTo(
          brillo.current,
          { xPercent: -140, opacity: 0 },
          { xPercent: 140, opacity: 1, duration: 1.5, ease: "power1.inOut", repeat: -1, repeatDelay: 4 }
        );
      });
      return () => mm.revert();
    },
    { scope: escena }
  );

  useEffect(() => {
    if (!carta.current) return;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(carta.current, { rotateY: volteado ? 180 : 0, duration: reducido ? 0 : 0.85, ease: "power3.inOut" });
  }, [volteado]);

  const seguirMouse = (e: React.MouseEvent) => {
    if (!escena.current || !carta.current || arrastre.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = escena.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(carta.current, { rotateX: -py * 8, rotateY: (volteado ? 180 : 0) + px * 10, duration: 0.5, ease: "power2.out" });
  };
  const soltarMouse = () => {
    if (!carta.current) return;
    gsap.to(carta.current, { rotateX: 0, rotateY: volteado ? 180 : 0, duration: 0.7, ease: "power3.out" });
  };

  const elegirFoto = useCallback(async (f: File | undefined) => {
    if (!f) return;
    setError(null);
    try {
      const img = await cargarImagenDeArchivo(f);
      setFoto(img);
      setEncuadre(ENCUADRE_INICIAL);
      setVolteado(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Arrastrar la foto dentro del marco.
  const alPresionar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!foto || volteado) return;
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

  async function guardarQr() {
    if (!reverso.current) return;
    const blob = await aBlob(reverso.current, 0.92);
    const archivoQr = new File([blob], "habi-next-entrada.jpg", { type: "image/jpeg" });
    const r = await compartirArchivos([archivoQr], "Mi entrada a Habi Next Colombia");
    if (r === "no-soportado") descargar(blob, "habi-next-entrada.jpg");
  }

  const D = DISENO[formato];
  const hayQr = Boolean(entrada?.qr);

  return (
    <section id="carnet" className="relative scroll-mt-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
        {/* Vista previa: la carta con sus dos caras */}
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
            ref={escena}
            className="relative mx-auto select-none"
            style={{ maxWidth: formato === "feed" ? "34rem" : "26rem", perspective: "1600px" }}
            onMouseMove={seguirMouse}
            onMouseLeave={soltarMouse}
          >
            <div
              ref={carta}
              className="relative w-full"
              style={{ transformStyle: "preserve-3d", aspectRatio: `${D.w} / ${D.h}` }}
            >
              {/* Frente */}
              <div
                className="absolute inset-0 overflow-hidden rounded-[22px] border border-white/10 bg-ink shadow-[0_40px_90px_-40px_rgba(128,46,246,0.55)]"
                style={{ backfaceVisibility: "hidden" }}
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
                <div
                  ref={brillo}
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  style={{ transform: "skewX(-14deg)" }}
                />
                {!recursos && !error ? (
                  <div className="absolute inset-0 grid place-items-center bg-night/70 text-sm text-white/60">Preparando tu carnet…</div>
                ) : null}
              </div>
              {/* Reverso: la entrada */}
              <button
                type="button"
                onClick={() => setVolteado(false)}
                aria-label="Volver al frente del carnet"
                className="absolute inset-0 overflow-hidden rounded-[22px] border border-white/10 bg-ink shadow-[0_40px_90px_-40px_rgba(128,46,246,0.55)]"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <canvas ref={reverso} className="block h-full w-full" aria-label="Tu entrada con el código QR" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => setVolteado((v) => !v)} className={clasesBoton.borde} aria-pressed={volteado}>
              {volteado ? "Ver el frente" : hayQr ? "Ver mi QR de entrada" : "Ver el reverso"}
            </button>
            {volteado && hayQr ? (
              <button type="button" onClick={guardarQr} className={clasesBoton.suave}>
                Guardar el QR como imagen
              </button>
            ) : null}
          </div>
          <p className="mt-3 text-center text-xs font-light text-white/45">
            {volteado
              ? hayQr
                ? "Este es el QR que leen en la puerta. Toca la carta para volver al frente."
                : "Atrás va tu entrada: el QR aparece cuando esté confirmada."
              : foto
                ? "Arrastra la foto para acomodarla. El carnet sale en blanco y negro, como la pieza oficial."
                : "Al frente, tu carnet; atrás, tu entrada con el QR."}
          </p>
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
            <input ref={archivo} type="file" accept="image/*" hidden onChange={(e) => elegirFoto(e.target.files?.[0])} />
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
          {yo?.carnet ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm font-medium tracking-tight text-white/70">Tu carnet ya está listo. Publícalo:</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <BotonRed red="linkedin" onClick={() => alPublicar("linkedin_voy")}>
                  Publicar en LinkedIn
                </BotonRed>
                <BotonRed red="instagram" onClick={() => alPublicar("instagram_voy")}>
                  Publicar en Instagram
                </BotonRed>
              </div>
            </div>
          ) : null}
          <p className="text-sm font-light leading-relaxed text-white/45">
            Al guardar, el carnet queda en tu sesión y se usa en las misiones. Tu foto no se publica en
            ningún lado sin que tú le des el botón.
          </p>

          {pie ? (
            <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
              <p className="text-sm font-medium tracking-tight text-white/70">Tu entrada en el teléfono</p>
              {pie}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
