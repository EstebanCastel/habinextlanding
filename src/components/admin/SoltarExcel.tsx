"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/**
 * La zona donde se suelta el Excel de invitados.
 *
 * Sube el archivo tal cual al servidor, que es quien lo lee y cruza; acá solo
 * se muestra el resultado y se recarga el listado. Si el navegador no tiene
 * JavaScript, el mismo formulario funciona a la antigua: el botón de «Elegir
 * archivo» y el envío normal llevan al mismo sitio.
 */

type Informe = {
  archivo: string;
  hojasLeidas: string[];
  hojasIgnoradas: string[];
  filas: number;
  creados: number;
  yaTenian: number;
  actualizados: number;
  sinCorreo: number;
  repetidosEnLista: number;
  borrados: number;
  fallos: string[];
};

type Estado = { fase: "quieto" } | { fase: "subiendo"; nombre: string } | { fase: "listo"; informe: Informe } | { fase: "error"; texto: string };

export default function SoltarExcel() {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>({ fase: "quieto" });
  const [encima, setEncima] = useState(false);

  async function subir(archivo: File) {
    if (!/\.(xlsx|xls|csv)$/i.test(archivo.name)) {
      setEstado({ fase: "error", texto: "Tiene que ser un Excel (.xlsx) o un CSV." });
      return;
    }
    setEstado({ fase: "subiendo", nombre: archivo.name });
    const cuerpo = new FormData();
    cuerpo.set("archivo", archivo);
    try {
      const res = await fetch("/api/admin/codigos/importar", {
        method: "POST",
        body: cuerpo,
        headers: { Accept: "application/json" },
      });
      const datos = (await res.json().catch(() => null)) as { ok?: boolean; informe?: Informe; error?: string } | null;
      if (!res.ok || !datos?.ok || !datos.informe) {
        setEstado({ fase: "error", texto: datos?.error ?? `No se pudo importar (${res.status}).` });
        return;
      }
      setEstado({ fase: "listo", informe: datos.informe });
      router.refresh();
    } catch (e) {
      setEstado({ fase: "error", texto: (e as Error).message });
    }
  }

  const ocupado = estado.fase === "subiendo";

  return (
    <form
      method="post"
      action="/api/admin/codigos/importar"
      encType="multipart/form-data"
      onSubmit={(e) => {
        // Con JavaScript el envío va por fetch; sin él, el formulario sigue su curso.
        const f = entrada.current?.files?.[0];
        if (f) {
          e.preventDefault();
          void subir(f);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        e.preventDefault();
        setEncima(false);
        const f = e.dataTransfer.files?.[0];
        if (f && !ocupado) void subir(f);
      }}
      className={`mb-6 rounded-2xl border-2 border-dashed p-6 transition-colors ${
        encima ? "border-violet-soft bg-violet/10" : "border-white/15 bg-white/[0.02]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-base font-semibold tracking-tight">Suelta aquí la lista de invitados</p>
          <p className="mt-1 max-w-2xl text-sm font-light text-white/50">
            El Excel de asistencia, con una hoja por entrada (VIP y General) y las columnas Nombre, Apellido, Correo,
            Número, Tipo de entrada e Invitado. A cada persona nueva se le crea y asigna un código; quien ya tenía uno lo
            conserva, y los códigos que queden sin dueño y sin usar se borran. Los redimidos nunca se tocan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={entrada}
            type="file"
            name="archivo"
            accept=".xlsx,.xls,.csv"
            disabled={ocupado}
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void subir(f);
            }}
            className="max-w-[14rem] text-xs text-white/60 file:mr-3 file:rounded-full file:border file:border-white/20 file:bg-transparent file:px-4 file:py-2 file:text-xs file:text-white/80"
          />
          <noscript>
            <button type="submit" className="rounded-full bg-violet px-5 py-2.5 text-sm font-semibold text-white">
              Importar
            </button>
          </noscript>
        </div>
      </div>

      {estado.fase === "subiendo" ? (
        <p className="mt-4 text-sm text-violet-soft" aria-live="polite">
          Leyendo {estado.nombre} y cruzando con los códigos… con cientos de filas tarda un minuto.
        </p>
      ) : null}
      {estado.fase === "error" ? (
        <p className="mt-4 text-sm text-red-300" aria-live="polite">
          {estado.texto}
        </p>
      ) : null}
      {estado.fase === "listo" ? (
        <div className="mt-4 rounded-xl border border-violet/40 bg-violet/10 px-4 py-3 text-sm" aria-live="polite">
          <p className="font-semibold">
            {estado.informe.archivo}: {estado.informe.filas} {estado.informe.filas === 1 ? "persona" : "personas"} en{" "}
            {estado.informe.hojasLeidas.join(" y ") || "ninguna hoja"}.
          </p>
          <p className="mt-1 text-white/75">
            {estado.informe.creados} códigos nuevos · {estado.informe.yaTenian} ya tenían el suyo · {estado.informe.actualizados} con
            datos actualizados · {estado.informe.borrados} sobrantes borrados
            {estado.informe.sinCorreo ? ` · ${estado.informe.sinCorreo} filas sin correo` : ""}
            {estado.informe.repetidosEnLista ? ` · ${estado.informe.repetidosEnLista} correos repetidos en la lista` : ""}
          </p>
          {estado.informe.hojasIgnoradas.length ? (
            <p className="mt-1 text-xs text-white/45">
              Hojas que no son de invitados y se dejaron de lado: {estado.informe.hojasIgnoradas.join(", ")}.
            </p>
          ) : null}
          {estado.informe.fallos.length ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-red-200">
              {estado.informe.fallos.slice(0, 10).map((f) => (
                <li key={f}>{f}</li>
              ))}
              {estado.informe.fallos.length > 10 ? <li>y {estado.informe.fallos.length - 10} más</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
