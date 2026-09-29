"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { gsap, useGSAP } from "@/lib/gsap";
import { cargarFuentes, familiaDeFuente, type Encuadre } from "@/lib/carnet";
import {
  CRED,
  cargarRecursosCredencial,
  dibujarFrente,
  dibujarReverso,
  type RecursosCredencial,
  type Tier,
} from "@/lib/credencial";
import { aBlob } from "@/lib/carnet";
import type { Vista } from "@/lib/experiencia";
import { clasesBoton, compartirArchivos, descargar } from "./util";
import type { EntradaVista } from "./entrada";

/**
 * La credencial del evento, con sus dos caras y el giro entre ellas.
 *
 * La carta flota sola —una inclinación lenta, el brillo que la recorre— para
 * que se vea viva sin que nadie la toque: es la pieza que la gente muestra en
 * pantalla y la que termina en una historia de Instagram. El giro se dispara
 * al tocar la tarjeta o el botón, y la cara de atrás no existe hasta que hay
 * entrada emitida: dibujar un QR falso sería peor que no dibujar nada.
 */
export default function Credencial({
  yo,
  foto,
  encuadre,
  nombre,
  apellido,
  entrada,
  motivo,
  cargando,
}: {
  yo: Vista | null;
  foto: HTMLImageElement | null;
  encuadre: Encuadre;
  nombre: string;
  apellido: string;
  entrada: EntradaVista | null;
  motivo: string;
  cargando: boolean;
}) {
  const [volteada, setVolteada] = useState(false);

  const frente = useRef<HTMLCanvasElement>(null);
  const reverso = useRef<HTMLCanvasElement>(null);
  const carta = useRef<HTMLDivElement>(null);
  const escena = useRef<HTMLDivElement>(null);
  const brillo = useRef<HTMLDivElement>(null);
  const recursos = useRef<RecursosCredencial | null>(null);
  const qrImg = useRef<HTMLImageElement | null>(null);

  const tier: Tier = entrada?.tier ?? (yo?.registro?.tier as Tier) ?? "general";

  // --- dibujo de las dos caras ---
  useEffect(() => {
    let vivo = true;
    (async () => {
      const familia = familiaDeFuente();
      await cargarFuentes(familia);
      recursos.current ??= await cargarRecursosCredencial();
      if (!vivo || !recursos.current) return;

      if (frente.current) {
        dibujarFrente(frente.current, {
          tier,
          nombre,
          apellido,
          foto,
          encuadre,
          recursos: recursos.current,
          familia,
        });
      }

      if (entrada?.qr && !qrImg.current) {
        // Nivel de corrección alto: la credencial se lee de una pantalla, a
        // veces con brillo y con la mano temblando en una fila.
        const url = await QRCode.toDataURL(entrada.qr, {
          errorCorrectionLevel: "H",
          margin: 0,
          width: 720,
          color: { dark: "#07040dff", light: "#ffffffff" },
        }).catch(() => null);
        if (url) {
          const img = new Image();
          await new Promise((r) => {
            img.onload = r;
            img.onerror = r;
            img.src = url;
          });
          qrImg.current = img;
        }
      }

      if (reverso.current && vivo) {
        dibujarReverso(reverso.current, {
          tier,
          nombre,
          apellido,
          qr: entrada?.qr ? qrImg.current : null,
          correo: entrada?.correo,
          cedula: entrada?.cedula,
          recursos: recursos.current,
          familia,
          aviso: motivo || undefined,
        });
      }
    })();
    return () => {
      vivo = false;
    };
  }, [tier, nombre, apellido, foto, encuadre, entrada, motivo]);

  // --- la carta viva: flotación, inclinación con el mouse y brillo ---
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(carta.current, {
          y: -10,
          rotateZ: 0.6,
          duration: 3.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
        // El destello recorre la cara cada tanto, como el plástico real bajo una luz.
        gsap.fromTo(
          brillo.current,
          { xPercent: -140, opacity: 0 },
          { xPercent: 140, opacity: 1, duration: 1.5, ease: "power1.inOut", repeat: -1, repeatDelay: 3.6 }
        );
      });
      return () => mm.revert();
    },
    { scope: escena }
  );

  // El giro: 3D real, no un cambio de imagen.
  useEffect(() => {
    if (!carta.current) return;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(carta.current, {
      rotateY: volteada ? 180 : 0,
      duration: reducido ? 0 : 0.85,
      ease: "power3.inOut",
    });
  }, [volteada]);

  const seguirMouse = (e: React.MouseEvent) => {
    if (!escena.current || !carta.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = escena.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(carta.current, { rotateX: -py * 12, rotateY: (volteada ? 180 : 0) + px * 14, duration: 0.5, ease: "power2.out" });
  };

  const soltarMouse = () => {
    if (!carta.current) return;
    gsap.to(carta.current, { rotateX: 0, rotateY: volteada ? 180 : 0, duration: 0.7, ease: "power3.out" });
  };

  const guardar = async (cara: "frente" | "reverso") => {
    const canvas = cara === "frente" ? frente.current : reverso.current;
    if (!canvas) return;
    const blob = await aBlob(canvas);
    const archivo = new File([blob], `credencial-habinext-${cara}.jpg`, { type: "image/jpeg" });
    const r = await compartirArchivos([archivo], "Mi credencial de Habi Next Colombia");
    if (r === "no-soportado") descargar(blob, `credencial-habinext-${cara}.jpg`);
  };

  const hayQr = Boolean(entrada?.qr);

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        ref={escena}
        className="w-full max-w-[340px] select-none"
        style={{ perspective: "1400px" }}
        onMouseMove={seguirMouse}
        onMouseLeave={soltarMouse}
      >
        <button
          type="button"
          onClick={() => setVolteada((v) => !v)}
          aria-label={volteada ? "Ver el frente de tu credencial" : "Ver el QR de tu entrada"}
          className="block w-full cursor-pointer"
        >
          <div
            ref={carta}
            className="relative w-full"
            style={{ transformStyle: "preserve-3d", aspectRatio: `${CRED.w} / ${CRED.h}` }}
          >
            {/* Frente */}
            <div className="absolute inset-0 overflow-hidden rounded-[26px] shadow-[0_40px_80px_-30px_rgba(128,46,246,0.65)]" style={{ backfaceVisibility: "hidden" }}>
              <canvas ref={frente} className="h-full w-full" />
              <div ref={brillo} className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/18 to-transparent" style={{ transform: "skewX(-14deg)" }} />
            </div>
            {/* Reverso */}
            <div
              className="absolute inset-0 overflow-hidden rounded-[26px] shadow-[0_40px_80px_-30px_rgba(128,46,246,0.65)]"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <canvas ref={reverso} className="h-full w-full" />
            </div>
          </div>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => setVolteada((v) => !v)} className={clasesBoton.borde}>
          {volteada ? "Ver el frente" : "Ver el QR de entrada"}
        </button>
        <button type="button" onClick={() => guardar(volteada ? "reverso" : "frente")} className={clasesBoton.borde}>
          Guardar esta cara
        </button>
      </div>

      <Wallet token={entrada?.token} listo={hayQr} />

      {!cargando && !hayQr ? (
        <p className="max-w-sm text-center text-sm font-light text-white/50">
          {motivo || "Tu QR aparece aquí cuando tu entrada esté confirmada."}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Los dos botones de billetera. Apple y Google firman el pase con
 * credenciales que hoy no están puestas; mientras tanto el endpoint responde
 * qué falta y el botón lo dice en vez de fallar en silencio.
 */
function Wallet({ token, listo }: { token?: string; listo: boolean }) {
  const [nota, setNota] = useState("");
  const [ocupado, setOcupado] = useState<"apple" | "google" | null>(null);

  const guardar = async (destino: "apple" | "google") => {
    if (!listo || !token) {
      setNota("Tu pase para la billetera se activa cuando tu entrada esté confirmada.");
      return;
    }
    setOcupado(destino);
    setNota("");
    try {
      const r = await fetch(`/api/entrada/${destino}?t=${encodeURIComponent(token)}`, { headers: { Accept: "application/json" } });
      if (destino === "google") {
        const d = (await r.json().catch(() => null)) as { url?: string; error?: string } | null;
        if (d?.url) window.location.href = d.url;
        else setNota(d?.error ?? "No pudimos generar el pase.");
        return;
      }
      if (r.headers.get("content-type")?.includes("application/vnd.apple.pkpass")) {
        const blob = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "habinext.pkpass";
        a.click();
        URL.revokeObjectURL(a.href);
        return;
      }
      const d = (await r.json().catch(() => null)) as { error?: string } | null;
      setNota(d?.error ?? "No pudimos generar el pase.");
    } catch {
      setNota("No pudimos generar el pase.");
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => guardar("apple")}
          disabled={ocupado !== null}
          className={`inline-flex items-center gap-2.5 rounded-full border px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
            listo ? "border-white/15 bg-white/[0.06] hover:border-white/30" : "border-white/10 bg-white/[0.03] text-white/45"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M16.36 12.73c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.61-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.87.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.2-2.48-.03-.01-2.3-.89-2.33-3.5zM14.2 5.9c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.56 1.31-.56.65-1.05 1.69-.92 2.69.97.07 1.96-.49 2.58-1.22z" />
          </svg>
          Apple Wallet
        </button>
        <button
          type="button"
          onClick={() => guardar("google")}
          disabled={ocupado !== null}
          className={`inline-flex items-center gap-2.5 rounded-full border px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
            listo ? "border-white/15 bg-white/[0.06] hover:border-white/30" : "border-white/10 bg-white/[0.03] text-white/45"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path fill="#4285F4" d="M21.6 12.23c0-.7-.06-1.37-.18-2.02H12v3.82h5.38a4.6 4.6 0 01-2 3.02v2.5h3.24c1.89-1.74 2.98-4.3 2.98-7.32z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0012 22z" />
            <path fill="#FBBC05" d="M6.41 13.89a6 6 0 010-3.78V7.52H3.06a10 10 0 000 8.96l3.35-2.59z" />
            <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.95 2.98 14.7 2 12 2a10 10 0 00-8.94 5.52l3.35 2.59C7.2 7.75 9.4 5.98 12 5.98z" />
          </svg>
          Google Wallet
        </button>
      </div>
      <p className="text-center text-xs font-light text-white/35">
        {listo ? "Guarda tu entrada en el teléfono" : "Se activa cuando tu entrada esté confirmada"}
      </p>
      {nota ? <p className="max-w-sm text-center text-xs font-light text-violet-soft">{nota}</p> : null}
    </div>
  );
}
