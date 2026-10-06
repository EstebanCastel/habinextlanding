"use client";

import { useEffect, useRef, useState } from "react";
import Dot from "@/components/Dot";
import { MISIONES, textoInstagram, textoVoy } from "@/config/experiencia";
import type { Vista } from "@/lib/experiencia";
import { BotonRed } from "./Redes";
import { blobDe, compartirArchivos, copiar, descargar, ErrorDePeticion, pedirJson, useMovil } from "./util";

/**
 * Publicar el carnet: un botón por red, y nada más.
 *
 * LinkedIn: si la cuenta está conectada, se publica de una con el texto ya
 * escrito y el carnet; si no, se conecta y al volver se publica sola. Nunca
 * se publica sin que la persona haya tocado el botón. Instagram no tiene API
 * para cuentas personales: se abre la hoja de compartir con la historia
 * puesta y el texto copiado, y al volver se da por hecha.
 */

const AVISOS_LI: Record<string, { texto: string; malo?: boolean }> = {
  ok: { texto: "LinkedIn conectado." },
  cancelado: { texto: "No conectaste LinkedIn. Puedes hacerlo cuando quieras.", malo: true },
  estado: { texto: "La conexión con LinkedIn no cuadró. Inténtalo de nuevo.", malo: true },
  fallo: { texto: "LinkedIn no respondió bien. Inténtalo en un momento.", malo: true },
  "sin-configurar": { texto: "La conexión con LinkedIn no está activa todavía.", malo: true },
  "sin-sesion": { texto: "Entra con tu correo y cédula antes de conectar LinkedIn.", malo: true },
};

const CONECTAR = "/api/experiencia/linkedin?volver=carnet-publicar";

function Mensaje({ texto, malo, enlace }: { texto: string; malo?: boolean; enlace?: { href: string; texto: string } }) {
  return (
    <p
      role={malo ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-light leading-relaxed ${
        malo ? "border-red-400/30 bg-red-400/[0.08] text-red-200" : "border-violet/40 bg-violet/10 text-white"
      }`}
    >
      <Dot color={malo ? "rgb(252 165 165)" : "var(--violet-soft)"} className="mt-2 h-1.5 w-1.5" />
      <span>
        {texto}
        {enlace ? (
          <>
            {" "}
            <a href={enlace.href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">
              {enlace.texto}
            </a>
          </>
        ) : null}
      </span>
    </p>
  );
}

const puntosDe = (id: string) => MISIONES.find((m) => m.id === id)?.puntos ?? 0;

export default function Publicar({
  yo,
  tier,
  li,
  auto,
  alCambiar,
}: {
  yo: Vista;
  tier: "general" | "vip";
  li?: string;
  auto?: string;
  alCambiar: (yo: Vista) => void;
}) {
  const movil = useMovil();
  // El texto es fijo: la frase del evento, igual para todos.
  const texto = textoVoy(tier);
  const [ocupado, setOcupado] = useState<"linkedin" | "instagram" | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; malo?: boolean; enlace?: { href: string; texto: string } } | null>(
    () => (li && AVISOS_LI[li] && AVISOS_LI[li].malo ? AVISOS_LI[li] : null)
  );
  const [abrirInstagram, setAbrirInstagram] = useState(false);
  const autoLanzado = useRef(false);

  const conectado = Boolean(yo.linkedin?.vigente);
  const hechaLi = Boolean(yo.misiones.linkedin_voy);
  const hechaIg = Boolean(yo.misiones.instagram_voy);
  const ultimaLi = yo.publicaciones.filter((p) => p.red === "linkedin" && p.mision === "linkedin_voy").slice(-1)[0];

  async function publicarLinkedIn() {
    if (!conectado) {
      // Es un salto a LinkedIn (OAuth) pasando por nuestra API: navegación completa, no del router.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = CONECTAR;
      return;
    }
    setOcupado("linkedin");
    setAviso(null);
    try {
      const r = await pedirJson<{ ok: boolean; url?: string; yo: Vista }>("/api/experiencia/publicar", {
        mision: "linkedin_voy",
        texto,
        carnet: "feed",
      });
      alCambiar(r.yo);
      setAviso({ texto: "Publicado en tu LinkedIn. Sumaste los puntos.", ...(r.url ? { enlace: { href: r.url, texto: "Ver la publicación" } } : {}) });
    } catch (e) {
      const err = e as ErrorDePeticion;
      if (err.status === 428) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = CONECTAR;
        return;
      }
      setAviso({ texto: err.message || "LinkedIn no respondió. Inténtalo de nuevo.", malo: true });
    } finally {
      setOcupado(null);
    }
  }

  // Volvió de conectar LinkedIn para publicar: se publica una sola vez y se
  // limpia la dirección para que recargar no lo repita.
  useEffect(() => {
    if (auto !== "publicar" || autoLanzado.current) return;
    autoLanzado.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("auto");
    url.searchParams.delete("li");
    window.history.replaceState(window.history.state, "", url);
    // Se dispara en el siguiente turno, fuera del efecto: la regla de React
    // no quiere estado tocado de forma sincrónica dentro de un efecto.
    if (conectado && !hechaLi) {
      const t = setTimeout(() => void publicarLinkedIn(), 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  async function publicarInstagram() {
    setOcupado("instagram");
    setAviso(null);
    try {
      const pie = textoInstagram("antes");
      await copiar(pie);
      const blob = await blobDe("/api/experiencia/archivo?f=carnet:story");
      const archivo = new File([blob], "habi-next-historia.jpg", { type: "image/jpeg" });
      const r = await compartirArchivos([archivo], pie);
      if (r === "no-soportado") {
        descargar(blob, "habi-next-historia.jpg");
        setAbrirInstagram(true);
        setAviso({ texto: "Te descargamos la historia y el texto quedó copiado. Abre Instagram y súbela a tus historias." });
        return;
      }
      if (r === "cancelado") {
        setAviso({ texto: "Cerraste la hoja de compartir. Cuando quieras, de nuevo.", malo: true });
        return;
      }
      const res = await pedirJson<{ ok: boolean; yo: Vista }>("/api/experiencia/mision", { mision: "instagram_voy", detalle: "historia" });
      alCambiar(res.yo);
      setAviso({ texto: "Compartido. El texto quedó copiado por si Instagram no lo pegó. Sumaste los puntos." });
    } catch (e) {
      setAviso({ texto: (e as Error).message || "No pudimos abrir Instagram.", malo: true });
    } finally {
      setOcupado(null);
    }
  }

  async function marcarInstagram() {
    try {
      const res = await pedirJson<{ ok: boolean; yo: Vista }>("/api/experiencia/mision", { mision: "instagram_voy", detalle: "abrió Instagram" });
      alCambiar(res.yo);
    } catch {
      // Si no se pudo marcar, la persona igual está en Instagram: no se la interrumpe.
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-[26px] border border-violet/40 bg-violet/[0.07] p-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">Tu carnet está listo</p>
        <p className="mt-1 text-lg font-semibold tracking-tight">Publícalo y suma puntos.</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <BotonRed red="linkedin" onClick={publicarLinkedIn} disabled={ocupado !== null}>
            {ocupado === "linkedin" ? "Publicando…" : hechaLi ? "Publicar otra vez en LinkedIn" : "Publicar en LinkedIn"}
          </BotonRed>
          <span className={`text-sm font-semibold tabular-nums ${hechaLi ? "text-violet-soft" : "text-white/60"}`}>
            {hechaLi ? "✓ Hecho" : `+${puntosDe("linkedin_voy")} pts`}
          </span>
          {hechaLi && ultimaLi?.url ? (
            <a href={ultimaLi.url} target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 underline underline-offset-4 hover:text-white">
              Ver la publicación
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BotonRed red="instagram" onClick={publicarInstagram} disabled={ocupado !== null}>
            {ocupado === "instagram" ? "Abriendo…" : hechaIg ? "Compartir otra vez en Instagram" : "Publicar en Instagram"}
          </BotonRed>
          <span className={`text-sm font-semibold tabular-nums ${hechaIg ? "text-violet-soft" : "text-white/60"}`}>
            {hechaIg ? "✓ Hecho" : `+${puntosDe("instagram_voy")} pts`}
          </span>
          {abrirInstagram ? (
            <a
              href={movil ? "instagram://story-camera" : "https://www.instagram.com/create/story"}
              target={movil ? undefined : "_blank"}
              rel="noopener noreferrer"
              onClick={marcarInstagram}
              className="text-sm text-white/60 underline underline-offset-4 hover:text-white"
            >
              Abrir Instagram
            </a>
          ) : null}
        </div>
      </div>

      {aviso ? <Mensaje {...aviso} /> : null}

    </div>
  );
}
