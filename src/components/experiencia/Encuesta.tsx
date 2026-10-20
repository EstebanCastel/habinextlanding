"use client";

import { useEffect, useState } from "react";
import { abierta } from "@/config/encuesta";
import Formulario from "@/components/encuesta/Formulario";

/**
 * La encuesta de cierre, encima de todo y sin salida.
 *
 * Se abre sola cuando la última charla está cerrando y no se puede cerrar
 * hasta contestarla. Es deliberado: la única ventana real para que un asistente
 * califique el día es mientras todavía está en la silla. Mañana el porcentaje
 * de respuesta cae a una quinta parte y lo que quede será de los dos extremos,
 * el que salió encantado y el que salió bravo.
 *
 * No usa `<dialog>`: en varios Android del evento `showModal()` no existe y el
 * diálogo se quedaba sin abrir. Un `div` fijo con el fondo bloqueado hace lo
 * mismo y funciona en todos.
 */

/**
 * Para quien no entró con su correo no hay a quién preguntarle si ya
 * contestó, así que la marca queda en su propio navegador. Es más débil que el
 * servidor —se pierde si cambia de aparato— pero alcanza para no volver a
 * taparle la pantalla a alguien que acaba de contestar.
 */
const MARCA = "hn.encuesta.v1";
const contestadaAca = (): boolean => {
  try {
    return localStorage.getItem(MARCA) === "1";
  } catch {
    return false;
  }
};

export default function Encuesta({ hay }: { hay: boolean }) {
  const [abrir, setAbrir] = useState(false);

  useEffect(() => {
    let vivo = true;

    const mirar = async () => {
      if (!vivo || !abierta() || contestadaAca()) return;
      // Sin sesión no hay a quién preguntarle: contesta sin identificarse.
      if (!hay) {
        setAbrir(true);
        return;
      }
      try {
        const r = await fetch("/api/encuesta", { cache: "no-store" });
        const d = (await r.json()) as { contestada?: boolean };
        if (vivo && !d?.contestada) setAbrir(true);
      } catch {
        // Sin señal se vuelve a mirar en el siguiente minuto.
      }
    };

    mirar();
    const id = setInterval(mirar, 60_000);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [hay]);

  // Con la encuesta encima no se hace scroll por debajo, y el vigilante de la
  // agenda no puede recargar la página: se llevaría lo que la persona escribió.
  useEffect(() => {
    if (!abrir) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.setAttribute("data-bloquea-recarga", "encuesta");
    return () => {
      document.body.style.overflow = previo;
      document.documentElement.removeAttribute("data-bloquea-recarga");
    };
  }, [abrir]);

  if (!abrir) return null;

  return (
    // `svh` y no `dvh`: el `dvh` se encoge cuando sube el teclado y la ventana
    // entera brincaba apenas se tocaba un campo de texto. Y arriba, no
    // centrada, porque centrar algo que cambia de alto lo mueve en cada paso.
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-night"
      role="dialog"
      aria-modal="true"
      aria-label="Encuesta de cierre"
    >
      <div className="enc-fondo" aria-hidden="true">
        <div className="enc-orbe" />
        <div className="enc-grano" />
      </div>
      <div className="relative z-[3] mx-auto w-full max-w-xl px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.75rem,env(safe-area-inset-top))]">
        <div className="min-h-[100svh]">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-violet-soft">Antes de irte</p>
          <p className="mt-2 text-[15px] font-light leading-relaxed text-white/55">
            Noventa segundos. Es lo único que nos dice qué repetir y qué cambiar el año entrante.
          </p>
          <div className="mt-7">
            <Formulario
              campana={hay ? "app" : "app-anonimo"}
              onListo={() => {
                try {
                  localStorage.setItem(MARCA, "1");
                } catch {
                  // Navegador sin almacenamiento: la encuesta ya quedó guardada igual.
                }
                setTimeout(() => setAbrir(false), 2600);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
