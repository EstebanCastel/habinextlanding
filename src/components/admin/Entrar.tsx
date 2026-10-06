import { Suspense } from "react";
import Asterisk from "@/components/Asterisk";
import Dot from "@/components/Dot";
import AvisoClave from "./AvisoClave";

/** La puerta del panel. El layout la muestra cuando no hay sesión. */
export default function Entrar() {
  return (
    <main className="s-night relative grid min-h-dvh place-items-center overflow-hidden px-6">
      <Asterisk
        color="var(--violet)"
        className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 opacity-[0.07]"
      />
      <form method="post" action="/api/admin" className="relative z-10 w-full max-w-sm">
        <input type="hidden" name="accion" value="entrar" />
        <p className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
          <Dot className="h-1.5 w-1.5" />
          Operación
        </p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">Boletería Habi Next</h1>
        <p className="mt-3 mb-8 text-base font-light text-white/55">
          Necesitas la clave del equipo.
        </p>
        <input
          type="password"
          name="clave"
          autoComplete="current-password"
          required
          placeholder="Clave"
          className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-4 text-lg text-white placeholder:text-white/25 transition-colors focus:border-violet-soft/70 focus:bg-white/[0.07] focus:outline-none"
        />
        <Suspense fallback={null}>
          <AvisoClave />
        </Suspense>
        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-violet px-8 py-4 text-lg font-semibold tracking-tight text-white shadow-[0_18px_44px_-14px_rgba(128,46,246,0.9)] transition-colors hover:bg-violet-press"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
