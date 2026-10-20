"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * El lector de la puerta.
 *
 * Un solo lector para las tres entradas: lo que decide qué es cada quien es
 * el servidor, no quien escanea. Eso es todo el punto — antes había que saber
 * de antemano si la persona era General, VIP o del equipo para abrir la
 * herramienta correcta, y en una fila eso no funciona.
 *
 * Está escrito para una mano, de pie, con sol encima y a veces sin señal:
 *
 * - El veredicto ocupa media pantalla y se distingue por color antes de leerse.
 * - Vibra distinto según el resultado: una vez si entra, tres si algo pasa.
 * - Sigue escaneando solo; nadie tiene que tocar nada entre persona y persona.
 * - El mismo QR seguido no se manda dos veces: la cámara ve treinta cuadros
 *   por segundo y sin esa pausa cada persona dispararía treinta peticiones.
 *
 * Para leer el código usa `BarcodeDetector` cuando el teléfono lo trae, que es
 * del sistema y mucho más rápido; si no, carga jsQR desde nuestro propio
 * dominio. Esa carga dinámica la permite `strict-dynamic` en la política de
 * seguridad: el script que la dispara ya viene firmado con nonce.
 */

import { bajarPaquete, paqueteGuardado, validar, vaciarCola, cola, type Modo, type Tipo, type Veredicto } from "./offline";

const ROTULO: Record<Tipo, string> = { general: "General", vip: "VIP", equipo: "Equipo Habi" };

/** Cada resultado tiene su color y su frase: se reconoce antes de leerse. */
const CARA: Record<
  Veredicto["estado"],
  { fondo: string; borde: string; texto: string; titulo: string; vibra: number[] }
> = {
  entra: { fondo: "bg-emerald-500", borde: "border-emerald-300", texto: "text-emerald-950", titulo: "Adelante", vibra: [90] },
  repetido: { fondo: "bg-amber-400", borde: "border-amber-200", texto: "text-amber-950", titulo: "Ya había entrado", vibra: [70, 60, 70] },
  desconocido: { fondo: "bg-rose-500", borde: "border-rose-300", texto: "text-rose-50", titulo: "No está en la lista", vibra: [120, 70, 120] },
  "no-es-vip": { fondo: "bg-rose-500", borde: "border-rose-300", texto: "text-rose-50", titulo: "No tiene almuerzo", vibra: [120, 70, 120] },
  // Pasa igual: hay puestos de sobra y el turno es para repartir la sala, no
  // para dejar a nadie afuera. El ámbar es para el restaurante, no un «no».
  "sin-turno": { fondo: "bg-amber-400", borde: "border-amber-200", texto: "text-amber-950", titulo: "Adelante · sin turno", vibra: [90] },
  "fuera-de-turno": { fondo: "bg-amber-400", borde: "border-amber-200", texto: "text-amber-950", titulo: "No es su turno", vibra: [70, 60, 70] },
  "pase-equivocado": { fondo: "bg-amber-400", borde: "border-amber-200", texto: "text-amber-950", titulo: "Ese no es el pase", vibra: [70, 60, 70] },
  "sin-reserva": { fondo: "bg-rose-500", borde: "border-rose-300", texto: "text-rose-50", titulo: "Sin reserva", vibra: [120, 70, 120] },
};

/** Carga jsQR una sola vez, y solo si el teléfono no trae lector propio. */
let jsqrCargando: Promise<unknown> | null = null;
function cargarJsQr(): Promise<unknown> {
  if (jsqrCargando) return jsqrCargando;
  jsqrCargando = new Promise((listo, falla) => {
    const s = document.createElement("script");
    s.src = "/js/jsqr.js";
    s.onload = () => listo((window as unknown as { jsQR?: unknown }).jsQR);
    s.onerror = () => falla(new Error("no se pudo cargar el lector"));
    document.head.appendChild(s);
  });
  return jsqrCargando;
}

type DetectorQr = { detect: (f: CanvasImageSource) => Promise<{ rawValue: string }[]> };

export default function Lector({
  modo,
  por,
  alValidar,
  alCerrar,
}: {
  modo: Modo;
  por: string;
  alValidar: (v: Veredicto) => void;
  alCerrar: () => void;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const lienzo = useRef<HTMLCanvasElement | null>(null);
  const cuadro = useRef(0);
  const ultimo = useRef<{ texto: string; en: number }>({ texto: "", en: 0 });
  const ocupado = useRef(false);

  const [fallo, setFallo] = useState<string | null>(null);
  const [veredicto, setVeredicto] = useState<Veredicto | null>(null);
  const [listo, setListo] = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const [bajadoEn, setBajadoEn] = useState<string | null>(null);

  /**
   * Decide. El servidor manda; si no contesta en tres segundos, decide el
   * teléfono con el padrón que bajó y la marca queda en cola.
   */
  const mandar = useCallback(
    async (texto: string) => {
      if (ocupado.current) return;
      // El mismo código dentro de tres segundos es la misma persona todavía
      // frente a la cámara, no una segunda lectura.
      const ahora = Date.now();
      if (ultimo.current.texto === texto && ahora - ultimo.current.en < 3000) return;
      ultimo.current = { texto, en: ahora };
      ocupado.current = true;
      try {
        const v = await validar(texto, modo, por);
        setVeredicto(v);
        alValidar(v);
        setPendientes(cola().length);
        const cara = CARA[v.estado];
        if (cara && typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(cara.vibra);
        }
      } finally {
        ocupado.current = false;
      }
    },
    [modo, por, alValidar]
  );

  // El padrón en el bolsillo: se baja al abrir el lector y se refresca cada
  // cinco minutos mientras haya señal. Lo pendiente se intenta mandar en cada
  // vuelta y además en cuanto el navegador avisa que volvió la red.
  useEffect(() => {
    let vivo = true;
    const sincronizar = async () => {
      if (!vivo) return;
      const p = await bajarPaquete();
      if (!vivo) return;
      if (p) setBajadoEn(p.bajadoEn);
      const salieron = await vaciarCola();
      if (!vivo) return;
      if (salieron) setPendientes(cola().length);
    };
    // Fuera del cuerpo del efecto: leer el almacén del navegador y pintar en
    // el mismo tick encadena renders y React lo marca.
    const arranque = setTimeout(() => {
      if (!vivo) return;
      const guardado = paqueteGuardado();
      if (guardado) setBajadoEn(guardado.bajadoEn);
      setPendientes(cola().length);
      void sincronizar();
    }, 0);
    const id = setInterval(sincronizar, 5 * 60_000);
    window.addEventListener("online", sincronizar);
    return () => {
      vivo = false;
      clearTimeout(arranque);
      clearInterval(id);
      window.removeEventListener("online", sincronizar);
    };
  }, []);

  useEffect(() => {
    let vivo = true;
    let flujo: MediaStream | null = null;
    let detector: DetectorQr | null = null;
    let jsqr: ((d: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null;

    (async () => {
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!vivo || !video.current) return;
        video.current.srcObject = flujo;
        await video.current.play();

        const Nativo = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => DetectorQr })
          .BarcodeDetector;
        if (Nativo) {
          detector = new Nativo({ formats: ["qr_code"] });
        } else {
          jsqr = (await cargarJsQr()) as typeof jsqr;
        }
        if (!vivo) return;
        setListo(true);

        const mirar = async () => {
          if (!vivo) return;
          const v = video.current;
          if (v && v.readyState === v.HAVE_ENOUGH_DATA) {
            try {
              if (detector) {
                const hallados = await detector.detect(v);
                if (hallados[0]?.rawValue) await mandar(hallados[0].rawValue);
              } else if (jsqr && lienzo.current) {
                const c = lienzo.current;
                // Se mira a la mitad de la resolución: un QR impreso o en
                // pantalla se lee de sobra y así el teléfono no se calienta.
                const w = (c.width = Math.min(640, v.videoWidth || 640));
                const h = (c.height = Math.round(w * ((v.videoHeight || 480) / (v.videoWidth || 640))));
                const ctx = c.getContext("2d", { willReadFrequently: true });
                if (ctx) {
                  ctx.drawImage(v, 0, 0, w, h);
                  const d = ctx.getImageData(0, 0, w, h);
                  const hallado = jsqr(d.data, w, h);
                  if (hallado?.data) await mandar(hallado.data);
                }
              }
            } catch {
              // un cuadro ilegible no es un error: se mira el siguiente
            }
          }
          cuadro.current = requestAnimationFrame(mirar);
        };
        cuadro.current = requestAnimationFrame(mirar);
      } catch (e) {
        if (!vivo) return;
        const msg = (e as Error).name === "NotAllowedError"
          ? "Hay que darle permiso a la cámara. Ábrelo en Chrome o Safari y acepta."
          : "No se pudo abrir la cámara en este aparato.";
        setFallo(msg);
      }
    })();

    return () => {
      vivo = false;
      cancelAnimationFrame(cuadro.current);
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, [mandar]);

  const cara = veredicto ? CARA[veredicto.estado] : null;
  const a = veredicto?.asistente;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        <canvas ref={lienzo} className="hidden" />

        {/* El estado del padrón que lleva el teléfono. Solo aparece cuando hay
            algo que decir: sin padrón bajado el lector no sirve si se cae la
            señal, y con marcas en cola alguien tiene que saber que faltan por
            mandar antes de cerrar la jornada. */}
        {!bajadoEn || pendientes ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-4">
            <p
              className={`mx-auto w-fit rounded-full px-4 py-1.5 text-center text-xs font-semibold backdrop-blur ${
                pendientes ? "bg-amber-400/90 text-amber-950" : "bg-rose-500/90 text-white"
              }`}
            >
              {pendientes
                ? `${pendientes} ${pendientes === 1 ? "marca sin mandar" : "marcas sin mandar"} · salen solas al volver la señal`
                : "Sin padrón bajado · conéctate una vez antes de abrir la puerta"}
            </p>
          </div>
        ) : null}

        {/* La mira: dice dónde poner el código sin tapar la imagen. */}
        {!veredicto && !fallo ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-64 w-64 max-w-[70vw]">
              {[
                "left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl",
                "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl",
                "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl",
                "right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl",
              ].map((c) => (
                <span key={c} className={`absolute h-10 w-10 border-white/90 ${c}`} />
              ))}
            </div>
          </div>
        ) : null}

        {fallo ? (
          <div className="absolute inset-0 flex items-center justify-center bg-night/95 p-8 text-center">
            <p className="max-w-sm text-lg font-light leading-relaxed text-white/85">{fallo}</p>
          </div>
        ) : null}

        {!listo && !fallo ? (
          <p className="absolute inset-x-0 bottom-8 text-center text-sm font-light text-white/60">
            Abriendo la cámara…
          </p>
        ) : null}

        {/* El veredicto, encima de todo y del tamaño que se lee de lejos. */}
        {veredicto && cara ? (
          <button
            type="button"
            onClick={() => setVeredicto(null)}
            className={`absolute inset-x-0 bottom-0 top-auto w-full border-t-4 px-6 py-7 text-left ${cara.fondo} ${cara.borde} ${cara.texto}`}
          >
            <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">{cara.titulo}</p>
            {a ? (
              <>
                <p className="mt-2 text-xl font-semibold leading-tight">{a.nombre}</p>
                <p className="mt-0.5 text-sm font-medium opacity-80">
                  {ROTULO[a.tipo]}
                  {a.cargo ? ` · ${a.cargo}` : ""} · {a.correo}
                </p>
              </>
            ) : null}
            {veredicto.turno ? (
              <p className="mt-2 text-base font-bold">
                Almuerzo {veredicto.turno.desde} a {veredicto.turno.hasta}
              </p>
            ) : null}
            {veredicto.previa ? (
              <p className="mt-2 text-sm font-medium opacity-80">
                Entró a las {new Date(veredicto.previa.en).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
              </p>
            ) : null}
            {veredicto.detalle ? <p className="mt-2 text-sm font-medium opacity-85">{veredicto.detalle}</p> : null}
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider opacity-60">Toca para seguir</p>
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-4 bg-night px-5 py-4">
        <p className="text-sm font-medium text-white/70">
          {modo === "almuerzo" ? "Almuerzo VIP" : modo === "taller" ? "Salón Taller" : "Entrada"}
        </p>
        <button
          type="button"
          onClick={alCerrar}
          className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
