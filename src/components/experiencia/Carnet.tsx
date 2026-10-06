"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  aBlob,
  ASTERISCO_PUNTOS,
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
import Dot from "@/components/Dot";
import Publicar from "./Publicar";
import Wallet, { AvisoBilletera, notaBilletera, useAparato } from "./Wallet";
import type { EntradaVista } from "./entrada";
import { cargarImagenDeArchivo, claseCampo, clasesBoton, compartirArchivos, descargar, pedir, useMovil } from "./util";

/**
 * El carnet: una carta con dos caras y un formulario.
 *
 * Al frente la pieza que se publica, con los dos asteriscos vivos encima
 * del lienzo; atrás la entrada con el QR de Luma. La carta flota, se inclina
 * con el mouse y un destello la recorre cada tanto. Quien ya guardó su
 * carnet lo ve tal cual lo dejó, también desde otro aparato: la imagen
 * guardada se trae del servidor hasta que suba otra foto.
 *
 * Un solo botón para guardar. Al guardar, el carnet se sube en sus dos
 * formatos y se entrega al teléfono (hoja de compartir en el celular,
 * descarga en el computador); y aparece el bloque para publicarlo.
 */

type Props = {
  yo: Vista | null;
  alCambiar: (yo: Vista) => void;
  entrada: EntradaVista | null;
  motivo: string;
  billetera: { apple: boolean; google: boolean };
  li?: string;
  auto?: string;
};

const FORMATOS: { id: Formato; texto: string; nota: string }[] = [
  { id: "feed", texto: "Publicación", nota: "4:5 · LinkedIn e Instagram" },
  { id: "story", texto: "Historia", nota: "9:16 · Instagram y WhatsApp" },
];

export default function Carnet({ yo, alCambiar, entrada, motivo, billetera, li, auto }: Props) {
  const [nombre, setNombre] = useState(yo?.nombre ?? "");
  const [apellido, setApellido] = useState(yo?.apellido ?? "");
  const [foto, setFoto] = useState<HTMLImageElement | null>(null);
  const [encuadre, setEncuadre] = useState<Encuadre>(ENCUADRE_INICIAL);
  const [formato, setFormato] = useState<Formato>("feed");
  const [recursos, setRecursos] = useState<Record<Formato, Recursos> | null>(null);
  const [familia, setFamilia] = useState("Urbanist, system-ui, sans-serif");
  const [guardado, setGuardado] = useState<Partial<Record<Formato, HTMLImageElement>>>({});
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volteado, setVolteado] = useState(false);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);
  const movil = useMovil();

  const lienzo = useRef<HTMLCanvasElement>(null);
  const reverso = useRef<HTMLCanvasElement>(null);
  const escena = useRef<HTMLDivElement>(null);
  const carta = useRef<HTMLDivElement>(null);
  const brillo = useRef<HTMLDivElement>(null);
  const astBlanco = useRef<SVGSVGElement>(null);
  const astMorado = useRef<SVGSVGElement>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const camara = useRef<HTMLInputElement>(null);
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

  // El carnet ya guardado, para verlo igual desde cualquier aparato.
  useEffect(() => {
    const formatos = yo?.carnet?.formatos ?? [];
    if (!formatos.length) return;
    let vivo = true;
    Promise.all(
      formatos.map((f) =>
        cargarImagen(`/api/experiencia/archivo?f=carnet:${f}&v=${encodeURIComponent(yo?.carnet?.renderizadoEn ?? "")}`)
          .then((img) => [f, img] as const)
          .catch(() => null)
      )
    ).then((pares) => {
      if (!vivo) return;
      const listo: Partial<Record<Formato, HTMLImageElement>> = {};
      for (const par of pares) if (par) listo[par[0]] = par[1];
      setGuardado(listo);
    });
    return () => {
      vivo = false;
    };
  }, [yo?.carnet?.formatos, yo?.carnet?.renderizadoEn]);

  // Si conectó LinkedIn y no tiene carnet, su foto de perfil arranca puesta.
  useEffect(() => {
    const fotoId = yo?.linkedin?.fotoId;
    if (!fotoId || foto || yo?.carnet || fotoInicialCargada.current) return;
    fotoInicialCargada.current = true;
    cargarImagen(`/api/experiencia/archivo?f=${encodeURIComponent(fotoId)}`)
      .then((img) => setFoto((actual) => actual ?? img))
      .catch(() => null);
  }, [yo?.linkedin?.fotoId, yo?.carnet, foto]);

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

  // Sin foto nueva, se muestra el carnet guardado tal cual; con foto, el vivo.
  const mostrandoGuardado = !foto && Boolean(guardado[formato]);

  // Redibujo del frente con cada cambio, agrupado por cuadro de animación.
  useEffect(() => {
    if (!recursos || !lienzo.current) return;
    cancelAnimationFrame(cuadro.current);
    const c = lienzo.current;
    cuadro.current = requestAnimationFrame(() => {
      const listo = guardado[formato];
      if (!foto && listo) {
        const D = DISENO[formato];
        c.width = D.w;
        c.height = D.h;
        c.getContext("2d")!.drawImage(listo, 0, 0, D.w, D.h);
        return;
      }
      dibujar(c, { formato, nombre, apellido, foto, encuadre, recursos: recursos[formato], familia, sinAsteriscos: true });
    });
    return () => cancelAnimationFrame(cuadro.current);
  }, [recursos, formato, nombre, apellido, foto, encuadre, familia, guardado]);

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

  // --- la carta viva: flotación, destello, giro y los asteriscos girando ---
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
        // Los asteriscos son dos ruedas: al entrar en pantalla arrancan
        // rápido, frenan y se quedan girando despacio, cada una hacia un
        // lado. No existen mientras se muestra el carnet guardado (ya van
        // pintados en la imagen).
        if (astBlanco.current && astMorado.current) {
          const rueda = (el: SVGSVGElement, sentido: 1 | -1, lento: number) =>
            gsap
              .timeline({ scrollTrigger: { trigger: escena.current, start: "top 90%", once: true } })
              .fromTo(el, { rotate: 0 }, { rotate: 900 * sentido, duration: 2.6, ease: "power3.out", transformOrigin: "50% 50%" })
              .to(el, { rotate: `+=${360 * sentido}`, duration: lento, ease: "none", repeat: -1, transformOrigin: "50% 50%" });
          rueda(astBlanco.current, 1, 42);
          rueda(astMorado.current, -1, 58);
        }
      });
      return () => mm.revert();
    },
    { scope: escena, dependencies: [mostrandoGuardado] }
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
    setAviso(null);
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

  /** Entrega una imagen al teléfono o al computador: hoja de compartir o descarga. */
  async function entregar(blob: Blob, nombreArchivo: string, titulo: string): Promise<boolean> {
    if (movil) {
      const r = await compartirArchivos([new File([blob], nombreArchivo, { type: "image/jpeg" })], titulo);
      if (r !== "no-soportado") return r === "compartido";
    }
    descargar(blob, nombreArchivo);
    return true;
  }

  async function guardar() {
    if (!recursos) return;
    setError(null);
    setAviso(null);

    // Ya guardado y sin cambios: solo se vuelve a entregar al teléfono.
    if (mostrandoGuardado) {
      const listo = guardado[formato]!;
      const c = document.createElement("canvas");
      c.width = listo.naturalWidth;
      c.height = listo.naturalHeight;
      c.getContext("2d")!.drawImage(listo, 0, 0);
      await entregar(await aBlob(c, 0.92), `habi-next-carnet-${formato}.jpg`, "Mi carnet de Habi Next Colombia");
      return;
    }

    if (!foto) return setError("Toma o sube tu foto para armar el carnet.");
    if (nombre.trim().length < 2) return setError("Escribe tu nombre.");
    setOcupado(true);
    try {
      // Las dos piezas finales, con los asteriscos pintados.
      const salidas = {} as Record<Formato, Blob>;
      for (const f of ["feed", "story"] as Formato[]) {
        const aparte = document.createElement("canvas");
        dibujar(aparte, { formato: f, nombre, apellido, foto, encuadre, recursos: recursos[f], familia });
        salidas[f] = await aBlob(aparte, 0.92);
      }

      // Primero al teléfono: la hoja de compartir solo abre si pasa poco
      // tiempo desde que la persona tocó el botón.
      const entregado = await entregar(salidas[formato], `habi-next-carnet-${formato}.jpg`, "Mi carnet de Habi Next Colombia");

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
      setAviso(entregado ? "Listo: tu carnet quedó guardado. Ahora publícalo." : "Tu carnet quedó guardado. Ahora publícalo.");
    } catch (e) {
      setError((e as Error).message || "Algo falló al guardar. Inténtalo otra vez.");
    } finally {
      setOcupado(false);
    }
  }

  async function guardarQr() {
    if (!reverso.current) return;
    const blob = await aBlob(reverso.current, 0.92);
    await entregar(blob, "habi-next-entrada.jpg", "Mi entrada a Habi Next Colombia");
  }

  const D = DISENO[formato];
  const A = D.asteriscos;
  const hayQr = Boolean(entrada?.qr) && entrada?.etapa !== "rechazado";
  const aparato = useAparato();
  const faltaBilletera = !(aparato === "android" ? billetera.google : aparato === "apple" ? billetera.apple : billetera.apple && billetera.google);
  const pista = volteado
    ? hayQr
      ? "Este es el QR que leen en la puerta. Toca la carta para volver al frente."
      : "Atrás va tu entrada: el QR aparece cuando esté confirmada."
    : !hayQr || faltaBilletera
      ? notaBilletera(hayQr, billetera, aparato)
      : foto
        ? "Arrastra la foto para acomodarla. El carnet sale en blanco y negro, como la pieza oficial."
        : "Al frente, tu carnet; atrás, tu entrada con el QR.";
  const posicion = (cx: number) => ({
    left: `${((cx - A.tam / 2) / D.w) * 100}%`,
    top: `${((A.y - A.tam / 2) / D.h) * 100}%`,
    width: `${(A.tam / D.w) * 100}%`,
  });

  return (
    <section id="carnet" className="relative scroll-mt-24">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
        {/* La carta con sus dos caras. En celular va compacta para que el
            formulario quede a la mano; en pantalla ancha, grande y fija. */}
        <div className="lg:sticky lg:top-16">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
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
            className={`relative mx-auto select-none ${formato === "feed" ? "max-w-[21rem] sm:max-w-[26rem] lg:max-w-[34rem]" : "max-w-[15rem] sm:max-w-[19rem] lg:max-w-[26rem]"}`}
            style={{ perspective: "1600px" }}
            onMouseMove={seguirMouse}
            onMouseLeave={soltarMouse}
          >
            <div ref={carta} className="relative w-full" style={{ transformStyle: "preserve-3d", aspectRatio: `${D.w} / ${D.h}` }}>
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
                {/* Los dos asteriscos, vivos. El guardado ya los trae pintados. */}
                {!mostrandoGuardado ? (
                  <>
                    <span aria-hidden="true" className="pointer-events-none absolute aspect-square" style={posicion(A.blanco)}>
                      <svg ref={astBlanco} viewBox="0 0 152.4 152.47" className="block h-full w-full overflow-visible">
                        <polygon points={ASTERISCO_PUNTOS} fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinejoin="miter" />
                      </svg>
                    </span>
                    <span aria-hidden="true" className="pointer-events-none absolute aspect-square" style={posicion(A.morado)}>
                      <svg ref={astMorado} viewBox="0 0 152.4 152.47" className="block h-full w-full overflow-visible">
                        <defs>
                          <linearGradient id="carnet-ast-morado" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor="#802ef6" />
                            <stop offset="1" stopColor="#4b1a8b" />
                          </linearGradient>
                        </defs>
                        <polygon points={ASTERISCO_PUNTOS} fill="url(#carnet-ast-morado)" />
                      </svg>
                    </span>
                  </>
                ) : null}
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

          {/* Ver el QR y llevarlo al teléfono, juntos: es lo que la gente
              busca el día del evento. Solo la billetera del aparato; las dos
              cuando no se sabe cuál es. */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => setVolteado((v) => !v)} className={`${clasesBoton.borde} !py-3`} aria-pressed={volteado}>
              {volteado ? "Ver el frente" : hayQr ? "Ver mi QR de entrada" : "Ver el reverso"}
            </button>
            <Wallet token={entrada?.token} listo={hayQr} disponible={billetera} tier={tier} segunAparato conNota={false} />
            {volteado && hayQr ? (
              <button type="button" onClick={guardarQr} className={clasesBoton.suave}>
                Guardar el QR como imagen
              </button>
            ) : null}
          </div>
          <p className="mt-3 text-center text-xs font-light text-white/45">{pista}</p>
          <div className="mt-3 empty:hidden">
            <AvisoBilletera />
          </div>
        </div>

        {/* Formulario */}
        <div className="flex flex-col gap-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2.5">
              <span className="text-sm font-medium tracking-tight text-white/65">Nombre</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} autoComplete="given-name" placeholder="Felipe" className={claseCampo} />
            </label>
            <label className="flex flex-col gap-2.5">
              <span className="text-sm font-medium tracking-tight text-white/65">Apellido</span>
              <input value={apellido} onChange={(e) => setApellido(e.target.value)} maxLength={40} autoComplete="family-name" placeholder="Restrepo" className={claseCampo} />
            </label>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-medium tracking-tight text-white/65">Tu foto</span>
            {/* `capture="user"` abre la cámara frontal en el celular; en el
                computador el navegador lo ignora y abre el selector de archivos. */}
            <input ref={camara} type="file" accept="image/*" capture="user" hidden onChange={(e) => elegirFoto(e.target.files?.[0])} />
            <input ref={archivo} type="file" accept="image/*" hidden onChange={(e) => elegirFoto(e.target.files?.[0])} />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => camara.current?.click()} className={clasesBoton.borde}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 8.5A2.5 2.5 0 016.5 6h1.2l1.1-1.6A1 1 0 019.6 4h4.8a1 1 0 01.8.4L16.3 6h1.2A2.5 2.5 0 0120 8.5v8a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5v-8z" strokeLinejoin="round" />
                  <circle cx="12" cy="12.5" r="3.2" />
                </svg>
                {foto || mostrandoGuardado ? "Tomarme otra" : "Tomarme una foto"}
              </button>
              <button type="button" onClick={() => archivo.current?.click()} className={clasesBoton.borde}>
                {foto || mostrandoGuardado ? "Cambiar por otra" : "Subir una foto"}
              </button>
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

          <div>
            <button type="button" disabled={ocupado || !recursos} onClick={guardar} className={`${clasesBoton.solido} w-full sm:w-auto`}>
              {ocupado ? "Guardando…" : mostrandoGuardado ? (movil ? "Guardar en mi teléfono" : "Descargar mi carnet") : "Guardar carnet"}
            </button>
            {!mostrandoGuardado && !yo?.carnet ? (
              <p className="mt-2 text-xs font-light text-white/45">
                {movil ? "Se abre la hoja para guardarlo en tus fotos y queda listo para publicar." : "Se descarga y queda listo para publicar."}
              </p>
            ) : null}
          </div>

          {yo?.carnet ? <Publicar yo={yo} tier={tier} li={li} auto={auto} alCambiar={alCambiar} /> : null}
        </div>
      </div>
    </section>
  );
}
