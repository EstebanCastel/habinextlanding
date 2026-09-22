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

export function cargarImagenDeArchivo(archivo: Blob): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolver(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error("No pudimos leer esa imagen."));
    };
    img.src = url;
  });
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
