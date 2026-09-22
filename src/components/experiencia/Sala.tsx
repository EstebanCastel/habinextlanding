"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { MISIONES, type Fase, type MisionId } from "@/config/experiencia";
import type { Vista } from "@/lib/experiencia";
import Carnet from "./Carnet";
import Mapa from "./Mapa";
import Misiones from "./Misiones";
import { pedir } from "./util";

/**
 * La raíz de cada experiencia: sostiene a la persona (`yo`) y qué misión
 * está abierta, y reparte eso entre las piezas de la pantalla.
 */
export default function Sala({
  modo,
  inicial,
  fase,
  sitio,
  li,
  abrir,
}: {
  modo: "carnet" | "mapa" | "redes";
  inicial: Vista | null;
  fase: Fase;
  sitio: string;
  li?: string;
  abrir?: string;
}) {
  const router = useRouter();
  const [yo, setYo] = useState<Vista | null>(inicial);
  const misiones = MISIONES.filter((m) => m.experiencia === modo).map((m) => m.id);
  const [abierta, setAbierta] = useState<MisionId | null>(() => {
    if (abrir && misiones.includes(abrir as MisionId)) return abrir as MisionId;
    if (li === "ok") return misiones.find((m) => MISIONES.find((x) => x.id === m)?.red === "linkedin" && !inicial?.misiones[m]) ?? null;
    return null;
  });

  const asegurar = useCallback(async (): Promise<Vista> => {
    if (yo) return yo;
    const r = await pedir<{ ok: boolean; yo: Vista }>("/api/experiencia/yo", { method: "POST" });
    setYo(r.yo);
    return r.yo;
  }, [yo]);

  const irAMision = useCallback(
    (m: MisionId) => {
      if (misiones.includes(m)) {
        setAbierta(m);
        document.getElementById("misiones")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        router.push(`/experiencia/redes?abrir=${m}`);
      }
    },
    [misiones, router]
  );

  if (modo === "mapa") return <Mapa yo={yo} fase={fase} alCambiar={setYo} />;

  return (
    <div className="flex flex-col gap-14">
      {modo === "carnet" ? <Carnet yo={yo} alCambiar={setYo} alPublicar={irAMision} /> : null}
      <Misiones
        yo={yo}
        fase={fase}
        sitio={sitio}
        li={li}
        alCambiar={setYo}
        asegurar={asegurar}
        abierta={abierta}
        alAbrir={setAbierta}
        solo={misiones}
        compacto
      />
    </div>
  );
}
