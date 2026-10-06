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
  pedidoQr = 0,
}: {
  yo: Vista | null;
  foto: HTMLImageElement | null;
  encuadre: Encuadre;
  nombre: string;
  apellido: string;
  entrada: EntradaVista | null;
  motivo: string;
  cargando: boolean;
  /** Sube cada vez que, desde arriba, alguien pide ver el QR: la carta se gira sola. */
  pedidoQr?: number;
}) {
  const [volteada, setVolteada] = useState(false);
  // El pedido llega desde «Tu entrada», arriba de la página: se gira al QR
  // sin que la persona tenga que encontrar el botón de la carta. Es el patrón
  // de React para reaccionar a una prop que cambia: se guarda la última vista
  // y se ajusta el estado durante el render, sin efecto de por medio.
  const [pedidoVisto, setPedidoVisto] = useState(pedidoQr);
  if (pedidoQr !== pedidoVisto) {
    setPedidoVisto(pedidoQr);
    if (pedidoQr > 0) setVolteada(true);
  }

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

      {!cargando && !hayQr ? (
        <p className="max-w-sm text-center text-sm font-light text-white/50">
          {motivo || "Tu QR aparece aquí cuando tu entrada esté confirmada."}
        </p>
      ) : null}
    </div>
  );
}
