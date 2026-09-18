"use client";

import { useCallback, useState } from "react";
import Dot from "@/components/Dot";
import type { Fase } from "@/config/experiencia";
import type { Vista } from "@/lib/experiencia";
import Carnet from "./Carnet";
import Misiones from "./Misiones";
import { pedir } from "./util";

/**
 * Raíz de la parte interactiva: sostiene el estado de la persona (`yo`) y lo
 * reparte entre el carnet y las misiones, que lo devuelven actualizado cada
 * vez que el servidor responde.
 */
export default function Experiencia({ inicial, fase, sitio, li }: { inicial: Vista | null; fase: Fase; sitio: string; li?: string }) {
  const [yo, setYo] = useState<Vista | null>(inicial);

  const asegurar = useCallback(async (): Promise<Vista> => {
    if (yo) return yo;
    const r = await pedir<{ ok: boolean; yo: Vista }>("/api/experiencia/yo", { method: "POST" });
    setYo(r.yo);
    return r.yo;
  }, [yo]);

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-5 pb-20 sm:px-8 md:px-14 md:pb-28 lg:px-20">
        <p className="mb-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
          <Dot className="h-1.5 w-1.5" />
          Paso uno · Tu carnet
        </p>
        <Carnet yo={yo} alCambiar={setYo} />
      </div>

      <div className="s-ink border-t border-white/8">
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 md:px-14 md:py-28 lg:px-20">
          <p className="mb-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
            <Dot className="h-1.5 w-1.5" />
            Paso dos · Las misiones
          </p>
          <h2 className="mb-10 max-w-3xl text-3xl font-light leading-[1.02] tracking-tighter sm:text-4xl md:text-5xl">
            Cuenta que vas. <span className="font-bold">Después, cuenta cómo fue.</span>
          </h2>
          <Misiones yo={yo} fase={fase} sitio={sitio} li={li} alCambiar={setYo} asegurar={asegurar} />
        </div>
      </div>
    </>
  );
}
