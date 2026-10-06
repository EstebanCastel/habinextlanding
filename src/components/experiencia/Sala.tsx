"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MISIONES, type Fase, type MisionId } from "@/config/experiencia";
import type { Vista } from "@/lib/experiencia";
import { ENCUADRE_INICIAL, type Encuadre } from "@/lib/carnet";
import Boleta from "./Boleta";
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
 *
 * En el carnet, la pantalla va en orden de lo que la persona quiere saber:
 * primero su entrada (¿está confirmada?, ¿de qué tipo?, ¿cómo la llevo?),
 * después los tres pasos para jugar, numerados: armar el carnet, la
 * credencial con el QR, y publicarlo para sumar puntos.
 */
export default function Sala({
  modo,
  inicial,
  fase,
  sitio,
  li,
  abrir,
  vip,
  billetera = { apple: false, google: false },
}: {
  modo: "carnet" | "mapa" | "redes";
  inicial: Vista | null;
  fase: Fase;
  sitio: string;
  li?: string;
  abrir?: string;
  /** Precios del VIP, calculados en el servidor con la etapa vigente. */
  vip?: { diferencia: string; precio: string; etiqueta: string };
  /** Qué billeteras están configuradas en el servidor. */
  billetera?: { apple: boolean; google: boolean };
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
  // Cada vez que sube, la credencial se gira al QR y la página baja hasta ella.
  const [pedidoQr, setPedidoQr] = useState(0);

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

  const verQr = useCallback(() => {
    setPedidoQr((n) => n + 1);
    document.getElementById("credencial")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (modo === "mapa") return <Mapa yo={yo} fase={fase} alCambiar={setYo} />;

  return (
    <div className="flex flex-col gap-14">
      {modo === "carnet" ? (
        <>
          <Boleta yo={yo} entrada={entrada} motivo={motivo} cargando={cargando} billetera={billetera} alVerQr={verQr} />

          <section id="carnet-paso" className="flex flex-col gap-8">
            <Paso numero={1} titulo="Arma tu carnet." nota="Tu foto y tu nombre. Es la pieza que publicas y la misma foto que va en tu credencial." />
            <Carnet yo={yo} alCambiar={setYo} alPublicar={irAMision} alPreparar={recogerPieza} />
          </section>

          {/* La credencial del evento: la misma foto, en la pieza que se
              cuelga del cordón y que lleva el QR de entrada al respaldo. */}
          <section id="credencial" className="flex scroll-mt-24 flex-col gap-8">
            <Paso numero={2} titulo="Tu credencial." nota="La escarapela del evento, con tus datos de un lado y el QR de entrada del otro. Tócala para girarla." />
            <Credencial
              yo={yo}
              foto={pieza.foto}
              encuadre={pieza.encuadre}
              nombre={pieza.nombre}
              apellido={pieza.apellido}
              entrada={entrada}
              motivo={motivo}
              cargando={cargando}
              pedidoQr={pedidoQr}
            />
          </section>

          {vip && !cargando && entrada && entrada.etapa !== "rechazado" && esGeneral ? (
            <Vip
              diferencia={vip.diferencia}
              precio={vip.precio}
              etiqueta={vip.etiqueta}
              yaPagada={entrada?.etapa === "aprobado" || entrada?.etapa === "pago_confirmado"}
            />
          ) : null}

          <section id="misiones-paso" className="flex flex-col gap-8">
            <Paso numero={3} titulo="Publícalo y suma puntos." nota="Tres misiones: guardar el carnet, contarlo en LinkedIn y subirlo a tus historias." />
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
