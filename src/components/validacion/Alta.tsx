"use client";

import { useState } from "react";
import PaseQr from "@/components/experiencia/PaseQr";

/**
 * Crear una entrada en la puerta.
 *
 * Está pensada para usarse de pie, con alguien enfrente esperando, así que
 * pide lo mínimo: nombre y correo. La cédula y el celular ayudan —con la
 * cédula la persona entra después a la experiencia— pero no detienen nada.
 *
 * Cuando termina muestra el QR en grande para que la persona lo escanee desde
 * la pantalla del que la atendió, sin esperar a que le llegue el correo de
 * Luma. Ese correo llega igual, pero en una fila nadie espera un correo.
 */

type Salida = {
  ok: boolean;
  creado?: boolean;
  yaEstaba?: boolean;
  tier?: string;
  email?: string;
  nombre?: string;
  qr?: string;
  nota?: string;
  error?: string;
};

export default function Alta({ llave, por }: { llave: string; por: string }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"general" | "vip">("general");
  const [telefono, setTelefono] = useState("");
  const [cedula, setCedula] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [salida, setSalida] = useState<Salida | null>(null);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    setOcupado(true);
    setSalida(null);
    try {
      const r = await fetch(`/api/validacion/alta?k=${encodeURIComponent(llave)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, tier, telefono, cedula, por }),
      });
      setSalida((await r.json()) as Salida);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([90]);
    } catch {
      setSalida({ ok: false, error: "No se pudo. Mira la señal e intenta otra vez." });
    } finally {
      setOcupado(false);
    }
  }

  function otra() {
    setSalida(null);
    setNombre("");
    setEmail("");
    setTelefono("");
    setCedula("");
  }

  const campo =
    "w-full rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-base text-white placeholder:text-white/30 focus:border-violet focus:outline-none";

  if (salida?.ok) {
    return (
      <section className="rounded-3xl border border-emerald-400/40 bg-emerald-400/[0.08] p-6 text-center sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-300">
          {salida.yaEstaba ? "Ya tenía entrada" : "Entrada creada"}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">{salida.nombre || nombre}</h2>
        <p className="mt-1 text-sm font-light text-white/60">
          {salida.email} · {salida.tier === "vip" ? "VIP" : "General"}
        </p>

        {salida.qr ? (
          <div className="mt-6 flex justify-center">
            {/* Se dibuja acá, no se pide a un servicio de afuera: la política
                de seguridad del sitio solo deja imágenes propias, y además
                así sale al instante aunque la red esté lenta. */}
            <PaseQr
              url={salida.qr}
              rotulo="Su entrada"
              nota="Que la escanee de esta pantalla, o espere el correo de Luma."
            />
          </div>
        ) : null}

        <p className="mt-5 text-sm font-light leading-relaxed text-white/60">{salida.nota}</p>

        <div className="mt-6 grid gap-2.5">
          <button
            type="button"
            onClick={otra}
            className="rounded-full bg-violet px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-violet/90"
          >
            Crear otra
          </button>
          {salida.qr ? (
            <a
              href={salida.qr}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Abrir el QR en grande
            </a>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={crear} className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 sm:p-8">
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          {(["general", "vip"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className={`rounded-2xl border px-4 py-3.5 text-base font-bold transition-colors ${
                tier === t ? "border-violet bg-violet text-white" : "border-white/15 text-white/60"
              }`}
            >
              {t === "vip" ? "VIP" : "General"}
            </button>
          ))}
        </div>

        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre y apellido"
          autoComplete="off"
          autoCapitalize="words"
          className={campo}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className={campo}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <input
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Cédula"
            inputMode="numeric"
            autoComplete="off"
            className={campo}
          />
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Celular"
            inputMode="tel"
            autoComplete="off"
            className={campo}
          />
        </div>
      </div>

      <p className="mt-3 text-xs font-light leading-relaxed text-white/40">
        Con la cédula la persona puede entrar después a la experiencia y ver su carnet. Sin ella la
        entrada sirve igual en la puerta.
      </p>

      {salida?.error ? (
        <p className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {salida.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={ocupado || nombre.trim().length < 3 || !email.includes("@")}
        className="mt-5 w-full rounded-full bg-violet px-6 py-4 text-lg font-bold text-white transition-colors hover:bg-violet/90 disabled:opacity-45"
      >
        {ocupado ? "Creando en Luma…" : `Crear entrada ${tier === "vip" ? "VIP" : "General"}`}
      </button>
    </form>
  );
}
