import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EVENT } from "@/config/event";
import { fichaDeEquipo, selloDeEquipo } from "@/config/equipo";

/**
 * La credencial del equipo, la que abre el QR de su carnet.
 *
 * Quien la escanea en la puerta necesita saber dos cosas en dos segundos:
 * que esa persona es del equipo de Habi y que la credencial no está
 * inventada. Por eso la dirección va firmada: sin el sello correcto no se
 * muestra nada, aunque el correo exista.
 *
 * No pide sesión a propósito. El que la abre es el de logística con su
 * propio celular, no la persona del carnet.
 */

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Equipo · ${EVENT.fullName}`, robots: { index: false, follow: false } };

export default async function Credencial({
  params,
  searchParams,
}: {
  params: Promise<{ email: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const [{ email }, { k }] = await Promise.all([params, searchParams]);
  const correo = decodeURIComponent(email);
  const secreto = process.env.EXPERIENCIA_SECRET ?? "";
  const ficha = fichaDeEquipo(correo);
  if (!ficha || !secreto || !k || k !== selloDeEquipo(correo, secreto)) notFound();

  const nombre = `${ficha.nombre ?? ""} ${ficha.apellido ?? ""}`.trim() || correo;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-night px-6 py-16 text-white">
      <section className="w-full max-w-md rounded-[28px] border border-violet/35 bg-white/[0.04] p-9 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-violet-soft">Equipo Habi</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">{nombre}</h1>
        {ficha.cargo ? <p className="mt-2 text-lg font-light text-white/70">{ficha.cargo}</p> : null}

        <dl className="mt-8 grid gap-3 text-left text-sm">
          <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
            <dt className="text-white/45">Correo</dt>
            <dd className="text-right">{correo}</dd>
          </div>
          {ficha.cedula ? (
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt className="text-white/45">Cédula</dt>
              <dd className="text-right tabular-nums">{ficha.cedula}</dd>
            </div>
          ) : null}
          {ficha.ciudad ? (
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt className="text-white/45">Ciudad</dt>
              <dd className="text-right">{ficha.ciudad}</dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-8 rounded-2xl bg-violet/15 px-5 py-4 text-sm font-light leading-relaxed text-white/75">
          Credencial de equipo. No es una entrada de Luma y no ocupa cupo: el equipo entra sin registro.
        </p>
        <p className="mt-5 text-xs text-white/35">
          {EVENT.fullName} · {EVENT.dateLong}
        </p>
      </section>
    </main>
  );
}
