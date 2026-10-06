"use client";

import { useCallback, useState } from "react";
import { MISIONES, type Fase, type MisionId } from "@/config/experiencia";
import type { Vista } from "@/lib/experiencia";
import Carnet from "./Carnet";
import Mapa from "./Mapa";
import Misiones from "./Misiones";
import { useEntrada } from "./entrada";
import { pedir } from "./util";

/**
 * La raíz de cada experiencia: sostiene a la persona (`yo`) y qué misión
 * está abierta, y reparte eso entre las piezas de la pantalla.
 *
 * En el carnet todo pasa en un solo bloque: la carta (con el QR atrás y la
 * billetera al lado), el formulario, guardar y, ya guardado, publicarlo en
 * LinkedIn e Instagram para sumar puntos. Acá no se vende nada ni se explica
 * el estado de la entrada: quien entró ya la tiene aprobada.
 */
export default function Sala({
  modo,
  inicial,
  fase,
  sitio,
  li,
  abrir,
  auto,
  billetera = { apple: false, google: false },
}: {
  modo: "carnet" | "mapa" | "redes";
  inicial: Vista | null;
  fase: Fase;
  sitio: string;
  li?: string;
  abrir?: string;
  /** `publicar`: viene de conectar LinkedIn para publicar el carnet de una vez. */
  auto?: string;
  /** Qué billeteras están configuradas en el servidor. */
  billetera?: { apple: boolean; google: boolean };
}) {
  const [yo, setYo] = useState<Vista | null>(inicial);
  const { entrada, motivo } = useEntrada();
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

  if (modo === "mapa") return <Mapa yo={yo} fase={fase} alCambiar={setYo} />;

  return (
    <div className="flex flex-col gap-14">
      {modo === "carnet" ? (
        <Carnet yo={yo} alCambiar={setYo} entrada={entrada} motivo={motivo} billetera={billetera} li={li} auto={auto} />
      ) : (
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
      )}
    </div>
  );
}
