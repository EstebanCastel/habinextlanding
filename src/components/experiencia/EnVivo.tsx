"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { enCurso, horaBogota, type EnCurso } from "@/config/agenda";

/**
 * Lo que está pasando ahora mismo, en la barra de arriba.
 *
 * El día del evento la pregunta deja de ser «cuántos días faltan» y pasa a
 * ser «¿a dónde entro ahora?». Los dos salones corren en paralelo, así que
 * hay que mostrar los dos.
 *
 * En el teléfono no caben juntos: dos títulos de charla en una barra de
 * cuarenta y ocho píxeles se cortan los dos y no se lee ninguno. Así que se
 * turnan, uno cada cuatro segundos, con un fundido. En pantalla ancha sí
 * caben y van juntos, sin turnarse.
 *
 * Y no todas las horas pesan igual. Cinco minutos antes de que arranque algo
 * la barra cambia de tono y lo anuncia; mientras arranca, se pone morada
 * entera. El resto del tiempo es gris y discreta, que es lo que debe ser una
 * barra de estado.
 *
 * Se recalcula con la hora de Bogotá, no con el reloj del teléfono, que en un
 * recinto con mala señal se desfasa.
 */

type Estado = "pronto" | "arranca" | "ahora";

type Pieza = {
  salonId: string;
  rotulo: string;
  numero: string;
  titulo: string;
  ponente?: string;
  estado: Estado;
  minutos: number;
};

/** Cuánto antes se anuncia, y cuánto dura el «empieza ya». */
const AVISO = 5;
const RECIEN = 3;
const TURNO_MS = 4000;

const aMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function hora12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const doce = h % 12 === 0 ? 12 : h % 12;
  return `${doce}:${String(m).padStart(2, "0")}`;
}

/** Las dos salas, traducidas a lo que hay que decir de cada una. */
function piezasDe(salas: EnCurso[], hora: string): Pieza[] {
  const ahoraMin = aMinutos(hora);
  const salida: Pieza[] = [];

  for (const s of salas) {
    const base = { salonId: s.salon.id, rotulo: s.salon.rotulo, numero: s.salon.numero };

    // Lo que va a empezar manda sobre lo que está corriendo: en los cinco
    // minutos de transición, lo útil es a dónde ir, no dónde se estuvo.
    if (s.sigue?.desde) {
      const faltan = aMinutos(s.sigue.desde) - ahoraMin;
      if (faltan >= 0 && faltan <= AVISO) {
        salida.push({ ...base, titulo: s.sigue.titulo, ponente: s.sigue.ponente, estado: "pronto", minutos: faltan });
        continue;
      }
    }
    if (!s.ahora?.desde) continue;
    const llevan = ahoraMin - aMinutos(s.ahora.desde);
    salida.push({
      ...base,
      titulo: s.ahora.titulo,
      ponente: s.ahora.ponente,
      estado: llevan <= RECIEN ? "arranca" : "ahora",
      minutos: llevan,
    });
  }
  return salida;
}

const ETIQUETA = (p: Pieza): string =>
  p.estado === "pronto" ? (p.minutos <= 1 ? "YA MISMO" : `EN ${p.minutos} MIN`) : p.estado === "arranca" ? "EMPIEZA YA" : "AHORA";

/** Lo que llama la atención sube de tono solo cuando hace falta. */
const TONO: Record<Estado, { caja: string; rotulo: string; punto: string; titulo: string }> = {
  pronto: {
    caja: "bg-amber-400/15 ring-1 ring-inset ring-amber-300/40",
    rotulo: "text-amber-200",
    punto: "bg-amber-300",
    titulo: "text-white",
  },
  arranca: {
    caja: "bg-violet ring-1 ring-inset ring-violet",
    rotulo: "text-white/85",
    punto: "bg-white",
    titulo: "text-white",
  },
  ahora: {
    caja: "bg-transparent",
    rotulo: "text-violet-soft",
    punto: "bg-violet",
    titulo: "text-white",
  },
};

function Punto({ clase, late }: { clase: string; late: boolean }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
      {late ? (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none ${clase}`} />
      ) : null}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${clase}`} />
    </span>
  );
}

function Tira({ p }: { p: Pieza }) {
  const t = TONO[p.estado];
  return (
    <span
      key={`${p.salonId}-${p.titulo}-${p.estado}`}
      className={`flex min-w-0 animate-[entra_.45s_ease-out] items-center gap-2 rounded-full px-2.5 py-1 motion-reduce:animate-none ${t.caja}`}
    >
      <Punto clase={t.punto} late={p.estado !== "ahora"} />
      {/* «AHORA» no se escribe en el teléfono: el punto morado ya lo dice y
          esas cinco letras son lo que le faltaba al título para caber. Lo que
          sí se escribe siempre es «EN 5 MIN» y «EMPIEZA YA», que es
          información que el punto no puede dar. */}
      <span
        className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] ${t.rotulo} ${
          p.estado === "ahora" ? "hidden sm:inline" : ""
        }`}
      >
        {ETIQUETA(p)}
      </span>
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">{p.rotulo}</span>
      <span className={`truncate text-[13px] font-semibold tracking-tight sm:text-sm ${t.titulo}`}>{p.titulo}</span>
    </span>
  );
}

export default function EnVivo() {
  // El primer render tiene que coincidir con el del servidor o React protesta
  // por la hidratación: arranca vacío y se llena en cuanto monta.
  const [salas, setSalas] = useState<EnCurso[] | null>(null);
  const [hora, setHora] = useState("");
  const [turno, setTurno] = useState(0);

  useEffect(() => {
    const tic = () => {
      setSalas(enCurso(new Date()));
      setHora(horaBogota(new Date()));
    };
    tic();
    const id = setInterval(tic, 20_000);
    return () => clearInterval(id);
  }, []);

  const piezas = salas && hora ? piezasDe(salas, hora) : [];

  // El turno del teléfono: una sala, luego la otra.
  useEffect(() => {
    if (piezas.length < 2) return;
    const id = setInterval(() => setTurno((t) => t + 1), TURNO_MS);
    return () => clearInterval(id);
  }, [piezas.length]);

  if (!salas) {
    return <span className="truncate text-[13px] font-semibold tracking-tight sm:text-sm">Hoy es Habi Next</span>;
  }

  if (!piezas.length) {
    const siguiente = salas.map((s) => s.sigue).filter(Boolean)[0];
    return (
      <span className="truncate text-[13px] font-semibold tracking-tight sm:text-sm">
        {siguiente ? `A las ${hora12(siguiente.desde!)} · ${siguiente.titulo}` : "Gracias por venir a Habi Next"}
      </span>
    );
  }

  const visible = piezas[turno % piezas.length];

  return (
    <>
      {/* El estilo del fundido vive acá: es de este componente y de ningún otro. */}
      <style>{`@keyframes entra{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

      {/* Teléfono: se turnan. */}
      {/* Sin indicador de turno: dos puntitos no le dicen nada a nadie y se
          comían el ancho que necesita el título de la charla, que es lo
          único que de verdad hay que leer. El cambio de salón se nota solo,
          porque el rótulo cambia de INSPIRA a TALLER. */}
      <span className="flex min-w-0 items-center sm:hidden">
        <Tira p={visible} />
      </span>

      {/* Pantalla ancha: caben los dos. */}
      <span className="hidden min-w-0 items-center gap-2 sm:flex">
        {piezas.map((p) => (
          <Tira key={p.salonId} p={p} />
        ))}
      </span>

      {/* Para quien lee con lector de pantalla: todo, sin turnos. */}
      <span className="sr-only">
        {piezas.map((p) => `${ETIQUETA(p)} en ${p.rotulo}: ${p.titulo}. `).join("")}
      </span>
    </>
  );
}

/**
 * La misma información, en grande, para la portada de la experiencia: las dos
 * salas una al lado de la otra con lo que corre y lo que sigue.
 */
export function Salas() {
  const [salas, setSalas] = useState<EnCurso[] | null>(null);
  const [hora, setHora] = useState("");

  useEffect(() => {
    const tic = () => {
      setSalas(enCurso(new Date()));
      setHora(horaBogota(new Date()));
    };
    tic();
    const id = setInterval(tic, 20_000);
    return () => clearInterval(id);
  }, []);

  if (!salas || !salas.some((s) => s.ahora)) return null;
  const piezas = hora ? piezasDe(salas, hora) : [];

  return (
    <section aria-label="Lo que está pasando ahora" className="grid gap-3 sm:grid-cols-2">
      {salas.map((s) => {
        const p = piezas.find((x) => x.salonId === s.salon.id);
        const estado: Estado = p?.estado ?? "ahora";
        const t = TONO[estado];
        return (
          <Link
            key={s.salon.id}
            href="/experiencia/agenda"
            className={`flex flex-col rounded-2xl border p-4 transition-colors ${
              estado === "arranca"
                ? "border-violet bg-violet/[0.16] hover:border-violet"
                : estado === "pronto"
                  ? "border-amber-300/45 bg-amber-400/[0.08] hover:border-amber-300/70"
                  : "border-violet/30 bg-violet/[0.07] hover:border-violet/60"
            }`}
          >
            <span className="flex items-center gap-2">
              <Punto clase={t.punto} late={estado !== "ahora"} />
              <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${t.rotulo}`}>
                {p ? ETIQUETA(p) : "Ahora"} · Salón {s.salon.numero} · {s.salon.rotulo}
              </span>
            </span>
            <span className="mt-2 text-base font-semibold leading-tight tracking-tight text-white">
              {p?.titulo ?? s.ahora?.titulo ?? "Sala libre"}
            </span>
            {(p?.ponente ?? s.ahora?.ponente) ? (
              <span className="mt-0.5 text-sm font-light text-white/55">{p?.ponente ?? s.ahora?.ponente}</span>
            ) : null}
            {s.sigue ? (
              <span className="mt-3 text-xs font-light text-white/40">
                A las {hora12(s.sigue.desde!)} · {s.sigue.titulo}
              </span>
            ) : null}
          </Link>
        );
      })}
    </section>
  );
}
