"use client";

import { useEffect } from "react";

/**
 * El cuaderno de visitas, del lado del navegador.
 *
 * Anota de dónde llegó la persona, con qué aparato, hasta dónde bajó, qué
 * tocó y cuánto se quedó. Nada de esto se manda evento por evento: se acumula
 * y se envía por lotes, porque una petición por cada píxel de scroll sería más
 * tráfico que la página misma.
 *
 * Tres detalles que sostienen que los datos sirvan:
 *
 * - **Las UTM se guardan al entrar y duran toda la sesión.** Quien llega por
 *   Instagram y navega a otra sección sigue siendo de Instagram; si se leyeran
 *   de la URL en cada envío, todo el tráfico interno aparecería como directo.
 * - **El envío final va con `sendBeacon`.** Es lo único que el navegador
 *   garantiza entregar cuando la pestaña ya se está cerrando, que es
 *   justamente cuando se sabe cuánto duró la visita.
 * - **Se respeta «no rastrear»** del navegador: si está activo, no se anota
 *   nada.
 */

type Evento = { tipo: string; en: string; valor?: string | number };

const CLAVE_VISITANTE = "hn_v";
const CLAVE_SESION = "hn_s";
const CLAVE_UTM = "hn_utm";

function id(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** localStorage lanza en modo privado y con las cookies bloqueadas. */
function recordar(almacen: Storage, clave: string, valor?: string): string | null {
  try {
    if (valor !== undefined) {
      almacen.setItem(clave, valor);
      return valor;
    }
    return almacen.getItem(clave);
  } catch {
    return null;
  }
}

function dispositivo() {
  const ua = navigator.userAgent;
  const tableta = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua));
  const movil = !tableta && /Mobi|Android|iPhone|iPod/i.test(ua);

  const sistema =
    /iPhone|iPad|iPod/i.test(ua) ? "iOS"
    : /Android/i.test(ua) ? "Android"
    : /Mac OS X/i.test(ua) ? "macOS"
    : /Windows/i.test(ua) ? "Windows"
    : /Linux/i.test(ua) ? "Linux"
    : undefined;

  // El orden importa: casi todos los navegadores dicen "Safari" y "Chrome" en
  // su user agent, así que hay que descartar primero los más específicos.
  const navegador =
    /EdgA?\//i.test(ua) ? "Edge"
    : /OPR\/|Opera/i.test(ua) ? "Opera"
    : /FBAN|FBAV/i.test(ua) ? "Facebook"
    : /Instagram/i.test(ua) ? "Instagram"
    : /Linkedin/i.test(ua) ? "LinkedIn"
    : /Chrome\//i.test(ua) ? "Chrome"
    : /Firefox\//i.test(ua) ? "Firefox"
    : /Safari\//i.test(ua) ? "Safari"
    : undefined;

  return {
    tipo: movil ? "movil" : tableta ? "tableta" : "escritorio",
    sistema,
    navegador,
    ancho: window.innerWidth,
    idioma: navigator.language,
    zona: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export default function Rastro() {
  useEffect(() => {
    // @ts-expect-error doNotTrack no está en todos los tipos de Navigator
    const noRastrear = navigator.doNotTrack === "1" || window.doNotTrack === "1";
    if (noRastrear) return;

    const visitante = recordar(localStorage, CLAVE_VISITANTE) ?? recordar(localStorage, CLAVE_VISITANTE, id()) ?? id();
    const sesion = recordar(sessionStorage, CLAVE_SESION) ?? recordar(sessionStorage, CLAVE_SESION, id()) ?? id();

    // La UTM de la primera página vale para toda la sesión.
    const params = new URLSearchParams(window.location.search);
    const deLaUrl = {
      source: params.get("utm_source") ?? undefined,
      medium: params.get("utm_medium") ?? undefined,
      campaign: params.get("utm_campaign") ?? undefined,
      content: params.get("utm_content") ?? undefined,
      term: params.get("utm_term") ?? undefined,
    };
    let utm = deLaUrl;
    if (deLaUrl.source) {
      recordar(sessionStorage, CLAVE_UTM, JSON.stringify(deLaUrl));
    } else {
      try {
        const guardada = recordar(sessionStorage, CLAVE_UTM);
        if (guardada) utm = JSON.parse(guardada);
      } catch {
        /* sesión sin UTM: queda como directo */
      }
    }

    const base = {
      visitante,
      sesion,
      utm,
      referente: document.referrer || undefined,
      entrada: window.location.pathname + window.location.search,
      dispositivo: dispositivo(),
    };

    const pendientes: Evento[] = [];
    const anotar = (tipo: string, valor?: string | number) =>
      pendientes.push({ tipo, en: new Date().toISOString(), valor });

    const enviar = (final = false) => {
      if (!pendientes.length) return;
      const cuerpo = JSON.stringify({ ...base, eventos: pendientes.splice(0) });
      // Al cerrar la pestaña, fetch se cancela y sendBeacon no.
      if (final && navigator.sendBeacon) {
        navigator.sendBeacon("/api/rastro", new Blob([cuerpo], { type: "application/json" }));
        return;
      }
      fetch("/api/rastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: cuerpo,
        keepalive: true,
      }).catch(() => {
        /* sin conexión: se pierde el lote y no pasa nada */
      });
    };

    anotar("visita", window.location.pathname);

    // --- profundidad de lectura ---
    const hitos = [25, 50, 75, 100];
    const alcanzados = new Set<number>();
    const alHacerScroll = () => {
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      if (alto <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / alto) * 100));
      for (const h of hitos) {
        if (pct >= h && !alcanzados.has(h)) {
          alcanzados.add(h);
          anotar("scroll", h);
        }
      }
    };

    // --- clics que importan ---
    const alHacerClic = (ev: MouseEvent) => {
      const el = (ev.target as HTMLElement | null)?.closest("a, button");
      if (!el) return;
      const href = el.getAttribute("href") ?? "";
      const texto = (el.textContent ?? "").trim().slice(0, 60);

      let nombre: string | null = null;
      if (href.includes("luma.com/habinext-vip")) nombre = "boleteria:vip";
      else if (href.includes("luma.com/habinext-general")) nombre = "boleteria:general";
      else if (href.startsWith("/codigo")) nombre = "boleteria:codigo";
      else if (href.startsWith("mailto:")) nombre = "patrocinadores";
      else if (el.tagName === "A" && href.startsWith("http")) nombre = `externo:${texto}`;
      if (nombre) anotar("clic", nombre);
    };

    // --- cuánto duró ---
    const inicio = Date.now();
    const alSalir = () => {
      anotar("salida", Math.round((Date.now() - inicio) / 1000));
      enviar(true);
    };

    window.addEventListener("scroll", alHacerScroll, { passive: true });
    document.addEventListener("click", alHacerClic, true);
    // `pagehide` es el único que dispara de forma fiable en Safari de iPhone;
    // `beforeunload` no lo hace cuando la pestaña se descarta desde el gestor.
    window.addEventListener("pagehide", alSalir);

    alHacerScroll();
    const primerEnvio = window.setTimeout(() => enviar(), 4000);
    const reloj = window.setInterval(() => enviar(), 20_000);

    return () => {
      window.removeEventListener("scroll", alHacerScroll);
      document.removeEventListener("click", alHacerClic, true);
      window.removeEventListener("pagehide", alSalir);
      window.clearTimeout(primerEnvio);
      window.clearInterval(reloj);
      enviar();
    };
  }, []);

  return null;
}
