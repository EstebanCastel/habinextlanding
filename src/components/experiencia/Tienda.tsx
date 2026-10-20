"use client";

import Image from "next/image";
import { ARTICULOS, STAND, faltan, pesos, type Articulo } from "@/config/tienda";
import { PUNTOS_TOTALES } from "@/config/experiencia";
import type { Vista } from "@/lib/experiencia";

/**
 * La vitrina de canje.
 *
 * Se ordena por lo que esta persona ya alcanza, no por precio: arriba lo que
 * puede llevarse ahora, abajo lo que le falta. Es la diferencia entre una
 * lista de precios y una tienda.
 *
 * Y lo que le falta lo dice en puntos, no en «no alcanzas»: «te faltan 35»
 * es una instrucción —sube al taller, publica— y «no alcanzas» es una puerta
 * cerrada.
 */

function Ficha({ a, puntos, dentro }: { a: Articulo; puntos: number; dentro: boolean }) {
  const falta = faltan(puntos, a);
  const alcanza = dentro && falta === 0 && !a.agotado;

  return (
    <li
      className={`group flex flex-col overflow-hidden rounded-2xl border transition-colors ${
        a.agotado
          ? "border-white/8 bg-white/[0.02]"
          : alcanza
            ? "border-violet/55 bg-violet/[0.09]"
            : "border-white/12 bg-white/[0.03]"
      }`}
    >
      <span className="relative block aspect-square overflow-hidden bg-white">
        <Image
          src={a.imagen}
          alt={a.nombre}
          fill
          sizes="(min-width: 1024px) 20vw, 45vw"
          className={`object-cover transition-transform duration-500 ${
            a.agotado ? "saturate-0 opacity-40" : "group-hover:scale-105"
          }`}
        />
        {a.agotado ? (
          <span className="absolute inset-x-0 bottom-0 bg-night/85 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
            Agotado
          </span>
        ) : alcanza ? (
          <span className="absolute right-2 top-2 rounded-full bg-violet px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
            Lo alcanzas
          </span>
        ) : null}
      </span>

      <span className="flex flex-1 flex-col p-3.5">
        <span className="text-sm font-semibold leading-tight tracking-tight text-white">{a.nombre}</span>
        {a.nota ? <span className="mt-0.5 text-[11px] font-light leading-snug text-white/40">{a.nota}</span> : null}

        <span className="mt-auto flex items-end justify-between gap-2 pt-3">
          <span className="flex flex-col">
            <span
              className={`text-base font-bold tabular-nums leading-none ${
                a.agotado ? "text-white/35" : alcanza ? "text-violet-soft" : "text-white"
              }`}
            >
              {a.puntos === 0 ? "Gratis" : `${a.puntos} pts`}
            </span>
            {a.precio > 0 ? (
              <span className="mt-1 text-[11px] font-light tabular-nums text-white/30 line-through">
                {pesos(a.precio)}
              </span>
            ) : null}
          </span>

          {!a.agotado && dentro && falta > 0 ? (
            <span className="shrink-0 text-right text-[11px] font-medium leading-tight text-amber-200/80">
              Te faltan
              <br />
              <span className="tabular-nums">{falta} pts</span>
            </span>
          ) : null}
        </span>
      </span>
    </li>
  );
}

export default function Tienda({ yo }: { yo: Vista | null }) {
  const puntos = yo?.puntos ?? 0;
  const dentro = Boolean(yo);

  // Lo que ya alcanza, primero. Dentro de cada grupo, lo más caro arriba:
  // es lo que la persona quiere ver que ya puede llevarse.
  const lista = [...ARTICULOS].sort((a, b) => {
    const aa = !a.agotado && dentro && faltan(puntos, a) === 0 ? 0 : 1;
    const bb = !b.agotado && dentro && faltan(puntos, b) === 0 ? 0 : 1;
    if (aa !== bb) return aa - bb;
    if (Boolean(a.agotado) !== Boolean(b.agotado)) return a.agotado ? 1 : -1;
    return b.puntos - a.puntos;
  });

  const alcanza = ARTICULOS.filter((a) => !a.agotado && faltan(puntos, a) === 0).length;

  return (
    <div>
      <section className="rounded-3xl border border-violet/35 bg-violet/[0.08] p-5 sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-soft">Tus puntos</p>
        <p className="mt-1.5 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tabular-nums tracking-tight text-white sm:text-5xl">
            {puntos}
          </span>
          <span className="text-base font-light text-white/45">de {PUNTOS_TOTALES}</span>
        </p>
        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full rounded-full bg-violet transition-[width] duration-700"
            style={{ width: `${Math.min(100, Math.round((puntos / PUNTOS_TOTALES) * 100))}%` }}
          />
        </span>
        <p className="mt-3 text-sm font-light leading-relaxed text-white/60">
          {!dentro
            ? "Entra con tu correo y tu cédula para ver qué alcanzas."
            : alcanza
              ? `Ya alcanzas ${alcanza === 1 ? "un artículo" : `${alcanza} artículos`}. Acércate al ${STAND.donde} y redímelo.`
              : "Todavía no alcanzas nada. Haz tu carnet, publica en redes y recorre el mapa: ahí están los puntos."}
        </p>
      </section>

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {lista.map((a) => (
          <Ficha key={a.id} a={a} puntos={puntos} dentro={dentro} />
        ))}
      </ul>

      <p className="mt-6 rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-4 text-sm font-light leading-relaxed text-white/55">
        <span className="font-semibold text-white">El canje es en persona. </span>
        Acércate al {STAND.donde} y enseña tus puntos en esta pantalla. {STAND.comoLlegar} Los precios
        tachados son lo que vale cada cosa afuera.
      </p>
    </div>
  );
}
