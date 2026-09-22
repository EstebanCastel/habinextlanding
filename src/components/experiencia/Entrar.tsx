"use client";

import { useEffect, useRef, useState } from "react";
import Dot from "@/components/Dot";
import type { Vista } from "@/lib/experiencia";
import { BotonRed } from "./Redes";
import { claseCampo, clasesBoton, ErrorDePeticion, pedirJson } from "./util";

/**
 * La ventana de entrada. Correo y cédula, o LinkedIn. Se abre encima de la
 * portada cuando alguien toca una experiencia sin haber entrado, y al entrar
 * lo lleva a esa misma experiencia.
 */

const MENSAJES: Record<string, string> = {
  datos: "Revisa el correo y la cédula: la cédula va solo en números.",
  cedula: "Esa cédula no coincide con la que quedó fijada para este correo.",
  linkedin: "Este correo entró con LinkedIn. Usa el botón de LinkedIn.",
  limite: "Demasiados intentos. Espera unos minutos.",
};

export default function Entrar({
  abierta,
  destino,
  alCerrar,
  errorInicial,
}: {
  abierta: boolean;
  destino: string;
  alCerrar: () => void;
  errorInicial?: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [cedula, setCedula] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(errorInicial ? MENSAJES[errorInicial] ?? errorInicial : null);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);

  const slug = destino.replace(/^\/experiencia\/?/, "") || "";
  const linkedin = `/api/experiencia/linkedin?volver=${encodeURIComponent(slug)}`;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setError(null);
    try {
      const r = await pedirJson<{ ok: boolean; destino: string; yo: Vista }>("/api/experiencia/entrar", { email, cedula, destino });
      window.location.href = r.destino || destino;
    } catch (err) {
      setError((err as ErrorDePeticion).message);
      setOcupado(false);
    }
  }

  return (
    <dialog
      ref={dialogo}
      onClose={alCerrar}
      onClick={(e) => {
        if (e.target === dialogo.current) alCerrar();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[28px] border border-white/12 bg-ink p-0 text-white shadow-[0_40px_120px_-30px_rgba(128,46,246,0.6)] backdrop:bg-night/80 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={enviar} className="flex flex-col gap-5 p-7 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
              <Dot className="h-1.5 w-1.5" />
              Habi Next
            </p>
            <h2 className="text-2xl font-semibold leading-tight tracking-tight">Entra para guardar tu avance</h2>
            <p className="mt-2 text-sm font-light leading-relaxed text-white/55">
              Con el correo con el que te registraste y tu cédula como clave. La primera vez que entras, la cédula que
              escribas queda fijada.
            </p>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-white/60 transition-colors hover:text-white"
          >
            ×
          </button>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium tracking-tight text-white/65">Correo</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ana@inmobiliaria.com"
            className={claseCampo}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium tracking-tight text-white/65">Cédula</span>
          <input
            type="password"
            required
            inputMode="numeric"
            pattern="[0-9]{6,12}"
            autoComplete="current-password"
            value={cedula}
            onChange={(e) => setCedula(e.target.value.replace(/\D/g, "").slice(0, 12))}
            placeholder="Solo números"
            className={`${claseCampo} tracking-widest`}
          />
        </label>

        {error ? (
          <p role="alert" className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-400/[0.08] px-5 py-3.5 text-sm font-light text-red-200">
            <Dot color="rgb(252 165 165)" className="mt-2 h-1.5 w-1.5" />
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={ocupado} className={clasesBoton.solido}>
          {ocupado ? "Entrando…" : "Entrar"}
        </button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/35">
          <span className="h-px flex-1 bg-white/10" />o<span className="h-px flex-1 bg-white/10" />
        </div>

        <BotonRed red="linkedin" href={linkedin}>
          Entrar con LinkedIn
        </BotonRed>
        <p className="text-center text-xs font-light leading-relaxed text-white/40">
          Con LinkedIn además podrás publicar tu carnet en un clic.
        </p>
      </form>
    </dialog>
  );
}
