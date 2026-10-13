"use client";

/** Lo que las pantallas de la experiencia comparten: pedir, reducir, compartir, copiar. */

import { useSyncExternalStore } from "react";
import type { Vista } from "@/lib/experiencia";

export class ErrorDePeticion extends Error {
  status: number;
  constructor(mensaje: string, status: number) {
    super(mensaje);
    this.status = status;
  }
}

export async function pedir<T = { ok: boolean; yo?: Vista }>(url: string, init?: RequestInit): Promise<T> {
  // Siempre se pide JSON: sin esta cabecera, un endpoint que también atiende
  // formularios sin JavaScript responde con una redirección a la página.
  const cabeceras = new Headers(init?.headers);
  if (!cabeceras.has("Accept")) cabeceras.set("Accept", "application/json");
  const res = await fetch(url, { credentials: "same-origin", ...init, headers: cabeceras });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) {
    throw new ErrorDePeticion(data?.error || `Algo falló (${res.status}).`, res.status);
  }
  return data;
}

export function pedirJson<T = { ok: boolean; yo?: Vista }>(url: string, cuerpo: unknown): Promise<T> {
  return pedir<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

/**
 * Una foto que el navegador no decodifica. Casi siempre es HEIC, el formato
 * con el que graba el iPhone: Safari lo abre, Chrome y Android no.
 */
async function esHeic(archivo: Blob): Promise<boolean> {
  const cabeza = new Uint8Array(await archivo.slice(0, 16).arrayBuffer());
  const marca = String.fromCharCode(...cabeza.slice(4, 12));
  return marca.startsWith("ftyp") && /heic|heix|hevc|mif1|msf1/.test(marca.slice(4));
}

function leerComoImagen(archivo: Blob): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolver(img);
    };
    img.onerror = async () => {
      URL.revokeObjectURL(url);
      rechazar(
        new Error(
          (await esHeic(archivo).catch(() => false))
            ? "Esa foto está en formato HEIC, el del iPhone, y este navegador no lo abre. Tómate una con el botón de la cámara o guárdala como JPG."
            : "No pudimos leer esa imagen. Prueba con otra, en JPG o PNG."
        )
      );
    };
    img.src = url;
  });
}

/**
 * La foto, lista para dibujar. Si viene enorme se reduce antes: una foto de
 * 48 megapíxeles hace que iOS dibuje el lienzo en blanco, sin dar error, y la
 * persona termina con un carnet sin cara y sin saber por qué.
 */
const LADO_MAXIMO = 3000;

export async function cargarImagenDeArchivo(archivo: Blob): Promise<HTMLImageElement> {
  const img = await leerComoImagen(archivo);
  const lado = Math.max(img.naturalWidth, img.naturalHeight);
  if (!lado || lado <= LADO_MAXIMO) return img;
  const k = LADO_MAXIMO / lado;
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  const ctx = c.getContext("2d");
  if (!ctx) return img;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.92));
  return blob ? leerComoImagen(blob).catch(() => img) : img;
}

/** Deja anotado en la bitácora de la persona lo que se le rompió. */
export function avisarFallo(paso: "foto" | "carnet" | "piezas", detalle?: string): void {
  void fetch("/api/experiencia/fallo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paso, detalle }),
    keepalive: true,
  }).catch(() => null);
}

/**
 * Reduce una foto antes de subirla. Una foto de celular pesa entre 3 y 10 MB;
 * a 1800 píxeles de lado y JPG queda por debajo de 1 MB sin que se note en
 * una publicación.
 */
export async function reducirImagen(archivo: File, maximo = 1800, calidad = 0.86): Promise<Blob> {
  const img = await cargarImagenDeArchivo(archivo);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const k = Math.min(1, maximo / Math.max(iw, ih));
  const c = document.createElement("canvas");
  c.width = Math.round(iw * k);
  c.height = Math.round(ih * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((resolver, rechazar) => {
    c.toBlob((b) => (b ? resolver(b) : rechazar(new Error("No pudimos procesar la foto."))), "image/jpeg", calidad);
  });
}

export function esMovil(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

const nada = () => () => {};

/**
 * Si estamos en un celular. En el servidor se asume que no; el navegador
 * corrige apenas monta, sin desfase de hidratación.
 */
export function useMovil(): boolean {
  return useSyncExternalStore(nada, esMovil, () => false);
}

export function puedeCompartirArchivos(archivos: File[]): boolean {
  if (typeof navigator === "undefined" || !("share" in navigator)) return false;
  const n = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  return typeof n.canShare === "function" && n.canShare({ files: archivos });
}

export type ResultadoCompartir = "compartido" | "cancelado" | "no-soportado";

export async function compartirArchivos(archivos: File[], texto?: string): Promise<ResultadoCompartir> {
  if (!puedeCompartirArchivos(archivos)) return "no-soportado";
  try {
    // Instagram ignora el texto; se manda igual para las redes que sí lo leen.
    await navigator.share({ files: archivos, ...(texto ? { text: texto } : {}) });
    return "compartido";
  } catch (error) {
    if ((error as Error).name === "AbortError") return "cancelado";
    return "no-soportado";
  }
}

export function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

export async function blobDe(url: string): Promise<Blob> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error("No pudimos traer la imagen.");
  return res.blob();
}

export const clasesBoton = {
  solido:
    "inline-flex items-center justify-center gap-2 rounded-full bg-violet px-7 py-3.5 text-base font-semibold tracking-tight text-white shadow-[0_18px_44px_-14px_rgba(128,46,246,0.9)] transition-colors hover:bg-violet-press disabled:cursor-not-allowed disabled:opacity-50",
  borde:
    "inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-base font-medium tracking-tight text-white transition-colors hover:border-white/45 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50",
  claro:
    "inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold tracking-tight text-night transition-colors hover:bg-lavender disabled:cursor-not-allowed disabled:opacity-50",
  suave:
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:text-white disabled:opacity-50",
};

export const claseCampo =
  "w-full rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-4 text-lg text-white placeholder:text-white/25 transition-colors focus:border-violet-soft/70 focus:bg-white/[0.07] focus:outline-none";
