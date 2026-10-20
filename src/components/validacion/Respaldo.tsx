"use client";

import { useEffect } from "react";
import { bajarPaquete, paqueteGuardado } from "./offline";

/**
 * Deja la puerta lista para trabajar sin internet.
 *
 * Hace dos cosas al abrir `/validacion`: registra el service worker, para que
 * la página cargue aunque se caiga la señal, y baja el padrón al teléfono sin
 * esperar a que alguien abra el lector. Así, quien llega a las siete, abre el
 * control y lo deja en la pantalla del salón, ya tiene todo guardado cuando a
 * las ocho y media se llene el recinto y la red empiece a fallar.
 */
export default function Respaldo() {
  useEffect(() => {
    const id = setTimeout(() => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw-validacion.js", { scope: "/validacion" }).catch(() => null);
      }
      // Si ya hay uno guardado igual se refresca: la lista de aprobados en
      // Luma cambia toda la mañana.
      void bajarPaquete().catch(() => paqueteGuardado());
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return null;
}
