"use client";

import { useEffect, useState } from "react";
import type { Tier } from "@/lib/credencial";
import { pedir } from "./util";

export type EntradaVista = {
  tier: Tier;
  nombre: string;
  correo: string;
  cedula?: string;
  qr: string | null;
  motivo?: string;
  enLuma?: string;
  etapa: string;
  token: string;
};

/**
 * La entrada de quien está en sesión.
 *
 * Vive en un hook y no dentro de la credencial porque la misma respuesta
 * decide tres cosas en pantallas distintas: qué QR va en el reverso, si la
 * tarjeta dice VIP o General, y si se le ofrece mejorarla. Pedirla una vez y
 * repartirla evita que la página cambie de opinión mientras carga.
 */
export function useEntrada(): { entrada: EntradaVista | null; motivo: string; cargando: boolean } {
  const [entrada, setEntrada] = useState<EntradaVista | null>(null);
  const [motivo, setMotivo] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const d = await pedir<{ entrada?: EntradaVista | null; motivo?: string }>("/api/experiencia/entrada").catch(
        () => null
      );
      if (!vivo) return;
      setEntrada(d?.entrada ?? null);
      setMotivo(d?.entrada?.motivo ?? d?.motivo ?? "");
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return { entrada, motivo, cargando };
}
