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
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-night/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Encuesta de cierre"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-10">
        <div className="rounded-3xl border border-white/12 bg-white/[0.03] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-soft">Antes de irte</p>
          <p className="mt-2 text-sm font-light leading-relaxed text-white/55">
            Noventa segundos. Es lo único que nos dice qué repetir y qué cambiar el año entrante.
          </p>
          <div className="mt-6">
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
