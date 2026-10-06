"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Los distintivos oficiales de Apple Wallet y Google Wallet, para guardar la
 * entrada en el teléfono.
 *
 * Son enlaces de verdad y no botones con `fetch`: en iPhone, Safari solo abre
 * la hoja «Agregar a Wallet» cuando NAVEGA a la URL del `.pkpass`; bajarlo
 * como blob y simular un `<a download>` lo deja tirado en Archivos. Para
 * Google, el endpoint redirige al enlace de guardar. Como es navegación, un
 * error no puede volver como JSON: el endpoint reenvía a la credencial con
 * `?billetera=<código>` y `AvisoBilletera` lo traduce a una frase (`MENSAJES`).
 *
 * El de Google es su SVG oficial es-419 sin tocar; sus lineamientos piden no
 * recolorearlo, no deformarlo, alto mínimo de 48 px y aire alrededor. El de
 * Apple está dibujado con las proporciones del badge oficial, porque Apple no
 * deja bajarlo sin aceptar su licencia con cuenta. Los dos van a la misma
 * altura para que queden parejos.
 */

type Destino = "apple" | "google";
type Tier = "general" | "vip";

/**
 * Lo que `/api/entrada/[destino]` manda en `?billetera=` cuando, en una
 * navegación, no pudo entregar el pase. Un código que no esté acá se lee como
 * `fallo`.
 */
const MENSAJES: Record<string, string> = {
  "sin-sesion": "Entra con tu correo para guardar tu entrada en el teléfono.",
  ajena: "Esa entrada no es tuya: entra con el correo con el que compraste.",
  "sin-entrada": "Todavía no encontramos una entrada a tu nombre. Si ya compraste, entra con el mismo correo.",
  "sin-qr": "Tu entrada todavía no tiene QR. Vuelve cuando esté confirmada.",
  "apple-falta": "Apple Wallet todavía no está disponible. Mientras tanto, guarda la cara del QR como imagen.",
  "google-falta": "Google Wallet todavía no está disponible. Mientras tanto, guarda la cara del QR como imagen.",
  fallo: "No pudimos armar tu pase. Inténtalo de nuevo en un momento.",
};

const nada = () => () => {};

/**
 * En qué familia de aparato estamos, para poner primero la billetera que la
 * persona de verdad tiene. En el servidor no se sabe; el navegador corrige al
 * montar, sin desfase de hidratación.
 */
function familia(): "apple" | "android" | "otro" {
  if (typeof navigator === "undefined") return "otro";
  const ua = navigator.userAgent;
  // iPadOS se presenta como «Macintosh»; da igual, también es Apple.
  if (/iPhone|iPad|iPod|Macintosh/i.test(ua) || /^(Mac|iP)/.test(navigator.platform ?? "")) return "apple";
  if (/Android/i.test(ua)) return "android";
  return "otro";
}

/**
 * El código con el que volvió el endpoint. Se lee al montar, se quita de la
 * barra —para que no sobreviva a un enlace copiado— y se guarda en la entrada
 * del historial: así aguanta el doble montaje de desarrollo (misma entrada)
 * y desaparece al navegar a otra página (entrada nueva). Se conserva el
 * estado que ya tenía el historial porque el router de Next guarda ahí lo
 * suyo. No va en un estado de React dentro del efecto porque la regla
 * `set-state-in-effect` lo prohíbe: es una mini tienda externa.
 */
let codigoLlegada = "";
const oyentes = new Set<() => void>();
const suscribirCodigo = (avisar: () => void) => {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
};
const leerCodigo = () => codigoLlegada;

function recogerCodigo() {
  const url = new URL(window.location.href);
  const codigo = url.searchParams.get("billetera");
  const estado = (window.history.state ?? {}) as Record<string, unknown>;
  if (codigo !== null) {
    url.searchParams.delete("billetera");
    window.history.replaceState({ ...estado, billetera: codigo }, "", url);
  }
  const vigente = codigo ?? (typeof estado.billetera === "string" ? estado.billetera : "");
  if (vigente === codigoLlegada) return;
  codigoLlegada = vigente;
  oyentes.forEach((avisar) => avisar());
}

/** La frase que explica por qué el pase no llegó. Va donde la persona aterriza, haya entrada o no. */
export function AvisoBilletera() {
  const codigo = useSyncExternalStore(suscribirCodigo, leerCodigo, () => "");
  useEffect(() => {
    recogerCodigo();
  }, []);
  if (!codigo) return null;
  return (
    <p role="status" className="rounded-2xl border border-violet/40 bg-violet/10 px-4 py-3 text-sm font-light text-white/85">
      {MENSAJES[codigo] ?? MENSAJES.fallo}
    </p>
  );
}

const etiquetaTier = (t: Tier) => (t === "vip" ? "VIP" : "General");

/** La familia del aparato, estable entre servidor y navegador. */
export function useAparato(): "apple" | "android" | "otro" {
  return useSyncExternalStore(nada, familia, () => "otro");
}

/** La frase que acompaña a los distintivos según lo que falte. */
export function notaBilletera(listo: boolean, disponible: { apple: boolean; google: boolean }, aparato: "apple" | "android" | "otro"): string {
  if (!listo) return "Se activa cuando tu entrada esté confirmada.";
  const faltaApple = !disponible.apple && aparato !== "android";
  const faltaGoogle = !disponible.google && aparato !== "apple";
  if (faltaApple && faltaGoogle) return "Guardarla en Apple Wallet y Google Wallet estará disponible muy pronto.";
  if (faltaApple) return "Apple Wallet estará disponible muy pronto.";
  if (faltaGoogle) return "Google Wallet estará disponible muy pronto.";
  return "El QR del pase es el mismo que leen en la puerta.";
}

export default function Wallet({
  token,
  listo,
  disponible,
  tier,
  alinear = "centro",
  segunAparato = false,
  conNota = true,
}: {
  token?: string;
  listo: boolean;
  disponible: { apple: boolean; google: boolean };
  tier: Tier;
  /** Centrado bajo una pieza, o pegado a la izquierda dentro de un formulario. */
  alinear?: "centro" | "inicio";
  /** Solo el distintivo del aparato: Apple en iPhone/Mac, Google en Android; los dos si no se sabe. */
  segunAparato?: boolean;
  conNota?: boolean;
}) {
  const aparato = useAparato();

  const todos: Destino[] = aparato === "android" ? ["google", "apple"] : ["apple", "google"];
  const orden: Destino[] = segunAparato && aparato !== "otro" ? [aparato === "android" ? "google" : "apple"] : todos;
  const conQr = listo && Boolean(token);
  const nota = notaBilletera(conQr, disponible, segunAparato ? aparato : "otro");

  const alInicio = alinear === "inicio";
  return (
    <div className={`flex flex-col gap-3 ${alInicio ? "items-start" : "items-center"}`}>
      <div className={`flex flex-wrap items-center gap-3 ${alInicio ? "" : "justify-center"}`}>
        {orden.map((destino) => (
          <Distintivo
            key={destino}
            destino={destino}
            tier={tier}
            href={conQr && disponible[destino] && token ? `/api/entrada/${destino}?t=${encodeURIComponent(token)}` : null}
          />
        ))}
      </div>
      {conNota ? <p className={`max-w-sm text-xs font-light text-white/55 ${alInicio ? "" : "text-center"}`}>{nota}</p> : null}
    </div>
  );
}

const BADGES: Record<Destino, { src: string; nombre: string; ancho: number; forma: string }> = {
  // 160×44 y 239×55 en su viewBox; a 48 px de alto dan estos anchos.
  apple: { src: "/img/wallet/apple-wallet.svg", nombre: "Apple Wallet", ancho: 175, forma: "rounded-[8px]" },
  google: { src: "/img/wallet/google-wallet.svg", nombre: "Google Wallet", ancho: 209, forma: "rounded-full" },
};

/**
 * Un distintivo. Sin `href` queda atenuado y sin acción, pero visible: la
 * persona ve que la opción existe y la nota de abajo dice cuándo se enciende.
 */
function Distintivo({ destino, tier, href }: { destino: Destino; tier: Tier; href: string | null }) {
  const b = BADGES[destino];
  const etiqueta = `Agregar tu entrada ${etiquetaTier(tier)} a ${b.nombre}`;
  const base = `inline-flex shrink-0 ${b.forma} transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-soft/70 focus-visible:ring-offset-2 focus-visible:ring-offset-night`;
  // Es un SVG estático servido desde /public: next/image no le aporta nada y
  // los lineamientos de Google piden mostrarlo tal cual.
  // eslint-disable-next-line @next/next/no-img-element
  const imagen = <img src={b.src} alt="" width={b.ancho} height={48} draggable={false} className="h-12 w-auto select-none" />;

  if (!href) {
    return (
      <span role="link" aria-disabled="true" aria-label={`${etiqueta} (todavía no disponible)`} className={`${base} cursor-not-allowed opacity-40`}>
        {imagen}
      </span>
    );
  }
  return (
    <a href={href} aria-label={etiqueta} className={`${base} hover:opacity-90`}>
      {imagen}
    </a>
  );
}
