"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
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
 * En el carnet son dos pasos: armar el carnet —que atrás lleva el QR y, al
 * lado del botón del QR, la billetera del aparato— y publicarlo para sumar
 * puntos. Acá no se vende nada ni se explica el estado de la entrada: quien
 * entró ya la tiene aprobada.
 */
export default function Sala({
  modo,
  inicial,
  fase,
  sitio,
  li,
  abrir,
  billetera = { apple: false, google: false },
}: {
  modo: "carnet" | "mapa" | "redes";
  inicial: Vista | null;
  fase: Fase;
  sitio: string;
  li?: string;
  abrir?: string;
  /** Qué billeteras están configuradas en el servidor. */
  billetera?: { apple: boolean; google: boolean };
}) {
  const router = useRouter();
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
      {modo === "carnet" ? (
        <>
          <section id="carnet-paso" className="flex flex-col gap-8">
            <Paso numero={1} titulo="Arma tu carnet." nota="Tu foto y tu nombre al frente; atrás, tu entrada con el QR. Es la pieza que publicas." />
            <Carnet yo={yo} alCambiar={setYo} alPublicar={irAMision} entrada={entrada} motivo={motivo} billetera={billetera} />
          </section>


          <section id="misiones-paso" className="flex flex-col gap-8">
            <Paso numero={2} titulo="Publícalo y suma puntos." nota="Tres misiones: guardar el carnet, contarlo en LinkedIn y subirlo a tus historias. Cada una tiene su botón." />
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
          </section>
        </>
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

/** La cabecera de cada paso: número grande, título y una línea de qué es. */
function Paso({ numero, titulo, nota }: { numero: number; titulo: string; nota: string }) {
  return (
    <div className="flex items-start gap-4 md:gap-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-violet/50 bg-violet/15 text-base font-bold tabular-nums text-violet-soft md:h-12 md:w-12 md:text-lg">
        {numero}
      </span>
      <div className="min-w-0">
        <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">{titulo}</h2>
        <p className="mt-1.5 max-w-xl text-base font-light text-white/60">{nota}</p>
      </div>
    </div>
  );
}
