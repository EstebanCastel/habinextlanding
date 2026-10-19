"use client";

import { useEffect, useState } from "react";
import Asterisk from "@/components/Asterisk";
import type { Vista } from "@/lib/experiencia";
import PaseQr from "./PaseQr";

/**
 * Los talleres que la persona ya reservó, con el pase de cada uno.
 *
 * Reservar se hace abajo, en la tarjeta de cada sesión: ahí es donde se mira
 * la agenda y donde se decide. Acá arriba va lo que hace falta el día del
 * evento —a qué hora me toca y cuál es mi QR— sin tener que buscarlo entre
 * veinte tarjetas.
 *
 * Un QR por taller y no uno para todos: en la puerta del salón se valida una
 * sesión concreta, y un pase genérico obligaría a preguntar a cuál viene
 * justo cuando hay fila.
 *
 * Sin reservas no se pinta nada. Una sección vacía que dice «no tienes nada»
 * ocupa el sitio de lo que sí importa.
 */

type Taller = { id: string; titulo: string; desde: string; ponente: string; detallePonente: string; necesitas: string };
type Respuesta = { talleres: Taller[]; mios: string[]; pases?: Record<string, string> };

export default function Talleres({ yo }: { yo: Vista | null }) {
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [mios, setMios] = useState<string[]>(yo?.talleres ?? []);
  const [pases, setPases] = useState<Record<string, string>>({});

  useEffect(() => {
    let vivo = true;
    fetch("/api/experiencia/taller")
      .then((r) => r.json())
      .then((d: Respuesta) => {
        if (!vivo || !d?.talleres) return;
        setTalleres(d.talleres);
        setMios(d.mios ?? []);
        setPases(d.pases ?? {});
      })
      .catch(() => null);
    return () => {
      vivo = false;
    };
  }, []);

  const reservados = talleres
    .filter((t) => mios.includes(t.id))
    .sort((a, b) => a.desde.localeCompare(b.desde));

  if (!reservados.length) return null;

  return (
    <section className="mx-auto mb-16 w-full max-w-5xl rounded-3xl border border-white/12 bg-white/[0.04] p-7 sm:p-9">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-soft">
        <Asterisk className="size-3.5" /> Salón Taller
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {reservados.length === 1 ? "Tu taller" : "Tus talleres"}
      </h2>
      <p className="mt-2 max-w-2xl text-base font-light leading-relaxed text-white/60">
        Enseña el QR de cada uno en la puerta del salón. No es el mismo de la entrada. Para soltar un
        puesto o reservar otro, toca la sesión en la agenda de abajo.
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {reservados.map((t) => (
          <div key={t.id} className="grid gap-4 rounded-2xl border border-violet/40 bg-violet/[0.1] p-5 sm:grid-cols-[auto_1fr] sm:items-center">
            {pases[t.id] ? <PaseQr url={pases[t.id]} rotulo={t.desde} /> : null}
            <div>
              <p className="text-base font-semibold leading-snug text-white">{t.titulo}</p>
              {t.ponente ? (
                <p className="mt-1 text-sm font-light text-white/55">
                  {t.ponente}
                  {t.detallePonente ? ` · ${t.detallePonente}` : ""}
                </p>
              ) : null}
              {t.necesitas ? (
                <p className="mt-2 text-xs font-light leading-relaxed text-white/45">{t.necesitas}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
