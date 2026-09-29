"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MISIONES, type Fase, type MisionId } from "@/config/experiencia";
import type { Vista } from "@/lib/experiencia";
import { ENCUADRE_INICIAL, type Encuadre } from "@/lib/carnet";
import Carnet from "./Carnet";
import Credencial from "./Credencial";
import Mapa from "./Mapa";
import Misiones from "./Misiones";
import Vip from "./Vip";
import { useEntrada } from "./entrada";
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
  vip,
}: {
  modo: "carnet" | "mapa" | "redes";
  inicial: Vista | null;
  fase: Fase;
  sitio: string;
  li?: string;
  abrir?: string;
  /** Precios del VIP, calculados en el servidor con la etapa vigente. */
  vip?: { diferencia: string; precio: string; etiqueta: string };
}) {
  const router = useRouter();
  const [yo, setYo] = useState<Vista | null>(inicial);
  const { entrada, motivo, cargando } = useEntrada();
  const [pieza, setPieza] = useState<{
    nombre: string;
    apellido: string;
    foto: HTMLImageElement | null;
    encuadre: Encuadre;
  }>({ nombre: inicial?.nombre ?? "", apellido: inicial?.apellido ?? "", foto: null, encuadre: ENCUADRE_INICIAL });
  const recogerPieza = useCallback((d: typeof pieza) => setPieza(d), []);
  const esGeneral = useMemo(() => (entrada?.tier ?? "general") === "general", [entrada]);
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
          <Carnet yo={yo} alCambiar={setYo} alPublicar={irAMision} alPreparar={recogerPieza} />

          {/* La credencial del evento: la misma foto, en la pieza que se
              cuelga del cordón y que lleva el QR de entrada al respaldo. */}
          <section id="credencial" className="flex flex-col gap-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">Tu credencial</p>
              <h2 className="mt-2 text-4xl font-bold tracking-tighter md:text-5xl">La que llevas puesta.</h2>
              <p className="mt-2 max-w-xl text-base font-light text-white/60">
                Es la escarapela del evento, con tus datos de un lado y tu código de entrada del otro. Tócala para
                girarla.
              </p>
            </div>
            <Credencial
              yo={yo}
              foto={pieza.foto}
              encuadre={pieza.encuadre}
              nombre={pieza.nombre}
              apellido={pieza.apellido}
              entrada={entrada}
              motivo={motivo}
              cargando={cargando}
            />
          </section>

          {vip && !cargando && esGeneral ? (
            <Vip
              diferencia={vip.diferencia}
              precio={vip.precio}
              etiqueta={vip.etiqueta}
              yaPagada={entrada?.etapa === "aprobado" || entrada?.etapa === "pago_confirmado"}
            />
          ) : null}
        </>
      ) : null}
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
