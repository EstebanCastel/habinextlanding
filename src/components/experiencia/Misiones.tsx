"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Dot from "@/components/Dot";
import {
  LIMITES,
  MISIONES,
  PREMIO,
  PUNTOS_TOTALES,
  textoFotos,
  textoFrase,
  textoInstagram,
  textoInvitacion,
  textoVoy,
  type Fase,
  type Mision,
  type MisionId,
} from "@/config/experiencia";
import { aBlob, cargarFuentes, cargarRecursos, dibujarFrase, familiaDeFuente } from "@/lib/carnet";
import type { Vista } from "@/lib/experiencia";
import { BotonRed, Chip } from "./Redes";
import {
  blobDe,
  claseCampo,
  clasesBoton,
  compartirArchivos,
  copiar,
  descargar,
  ErrorDePeticion,
  pedir,
  pedirJson,
  reducirImagen,
  useMovil,
} from "./util";

/**
 * Las misiones. Cada tarjeta se abre y muestra lo que hay que hacer, ya
 * preparado: el texto escrito, las imágenes elegidas, el botón. Lo que se
 * completa en nuestro servidor (LinkedIn) se marca solo; lo que pasa en el
 * aparato de la persona (Instagram, WhatsApp) se avisa al terminar.
 */

type Props = {
  yo: Vista | null;
  fase: Fase;
  sitio: string;
  li?: string;
  alCambiar: (yo: Vista) => void;
  asegurar: () => Promise<Vista>;
  /** Qué misión está desplegada. Vive arriba para que el carnet pueda abrir una. */
  abierta: MisionId | null;
  alAbrir: (m: MisionId | null) => void;
  /** Solo estas misiones, en una lista sin los grupos por fase. */
  solo?: MisionId[];
  /** Sin el marcador grande de arriba: la página ya muestra los puntos. */
  compacto?: boolean;
};

type Estado = "hecha" | "pendiente" | "cerrada";

const AVISOS_LI: Record<string, { texto: string; malo?: boolean }> = {
  ok: { texto: "LinkedIn conectado. Ya puedes publicar en un clic." },
  cancelado: { texto: "No conectaste LinkedIn. Puedes hacerlo cuando quieras.", malo: true },
  estado: { texto: "La conexión con LinkedIn no cuadró. Inténtalo de nuevo.", malo: true },
  fallo: { texto: "LinkedIn no respondió bien. Inténtalo en un momento.", malo: true },
  "sin-configurar": { texto: "La conexión con LinkedIn no está activa todavía.", malo: true },
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const Miniatura = ({ src, alt, seleccionada, onClick, vertical }: { src: string; alt: string; seleccionada?: boolean; onClick?: () => void; vertical?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={seleccionada}
    className={`relative overflow-hidden rounded-xl border-2 transition-colors ${
      seleccionada ? "border-violet" : "border-white/10 hover:border-white/30"
    } ${vertical ? "aspect-[9/16]" : "aspect-[4/5]"}`}
  >
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
    {seleccionada ? (
      <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-violet text-xs font-bold text-white">✓</span>
    ) : null}
  </button>
);

function Mensaje({ texto, malo }: { texto: string; malo?: boolean }) {
  return (
    <p
      role={malo ? "alert" : undefined}
      className={`flex items-start gap-3 rounded-2xl border px-5 py-4 text-base font-light leading-relaxed ${
        malo ? "border-red-400/30 bg-red-400/[0.08] text-red-200" : "border-violet/40 bg-violet/10 text-white"
      }`}
    >
      <Dot color={malo ? "rgb(252 165 165)" : "var(--violet-soft)"} className="mt-2.5 h-1.5 w-1.5" />
      <span>{texto}</span>
    </p>
  );
}

// ---------- la prueba ----------

/**
 * Una captura de pantalla como prueba de que se publicó. Es el camino de
 * quien publica por su cuenta: Instagram no deja comprobarlo desde afuera,
 * y en LinkedIn no todos quieren conectar la cuenta.
 */
function SubirPrueba({ yo, mision, texto, alCambiar }: { yo: Vista | null; mision: MisionId; texto: string; alCambiar: (yo: Vista) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; malo?: boolean } | null>(null);
  const pruebas = (yo?.fotos ?? []).filter((f) => f.clase === "prueba" && f.de === mision);

  async function subir(f: File | undefined) {
    if (!f) return;
    setOcupado(true);
    setAviso(null);
    try {
      const reducida = await reducirImagen(f, 1600, 0.84);
      const fd = new FormData();
      fd.append("foto", reducida, "prueba.jpg");
      fd.append("clase", "prueba");
      fd.append("mision", mision);
      const r = await pedir<{ ok: boolean; yo: Vista }>("/api/experiencia/fotos", { method: "POST", body: fd });
      alCambiar(r.yo);
      setAviso({ texto: "Prueba recibida. Misión cumplida." });
    } catch (e) {
      setAviso({ texto: (e as Error).message, malo: true });
    } finally {
      setOcupado(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-dashed border-white/15 p-4">
      <p className="text-sm font-light leading-relaxed text-white/60">{texto}</p>
      <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => subir(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={ocupado} onClick={() => entrada.current?.click()} className={clasesBoton.borde}>
          {ocupado ? "Subiendo…" : pruebas.length ? "Subir otra captura" : "Subir captura como prueba"}
        </button>
        {pruebas.map((f) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={f.id} src={`/api/experiencia/archivo?f=${encodeURIComponent(f.id)}`} alt="Prueba" className="h-14 w-14 rounded-lg border border-white/10 object-cover" />
        ))}
      </div>
      {aviso ? <Mensaje {...aviso} /> : null}
    </div>
  );
}

// ---------- LinkedIn ----------

function PanelLinkedIn({
  yo,
  mision,
  textoInicial,
  sitio,
  alCambiar,
  preseleccion = [],
  conCarnet,
}: {
  yo: Vista | null;
  mision: "linkedin_voy" | "linkedin_fotos";
  textoInicial: string;
  sitio: string;
  alCambiar: (yo: Vista) => void;
  preseleccion?: string[];
  conCarnet: boolean;
}) {
  const [texto, setTexto] = useState(textoInicial);
  const [incluirCarnet, setIncluirCarnet] = useState(conCarnet);
  const [fotos, setFotos] = useState<string[]>(preseleccion);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; malo?: boolean } | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const conectado = Boolean(yo?.linkedin?.vigente);
  const fotosDisponibles = (yo?.fotos ?? []).filter((f) => f.clase !== "perfil");
  const ultima = yo?.publicaciones.filter((p) => p.red === "linkedin" && p.mision === mision).slice(-1)[0];
  const enlaceCarnet = yo?.carnet ? `${sitio}/c/${yo.id}` : null;

  const alternar = (id: string) =>
    setFotos((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length + (incluirCarnet ? 1 : 0) >= LIMITES.fotosPorPublicacion) return prev;
      return [...prev, id];
    });

  async function publicar() {
    setOcupado(true);
    setAviso(null);
    try {
      const r = await pedirJson<{ ok: boolean; url?: string; yo: Vista }>("/api/experiencia/publicar", {
        mision,
        texto,
        fotos,
        carnet: incluirCarnet && yo?.carnet ? "feed" : undefined,
      });
      alCambiar(r.yo);
      setUrl(r.url || null);
      setAviso({ texto: "Publicado en tu LinkedIn. Misión cumplida." });
    } catch (e) {
      const err = e as ErrorDePeticion;
      if (err.status === 428) {
        setAviso({ texto: "Tu permiso de LinkedIn venció o no alcanza para publicar. Vuelve a conectar y prueba de nuevo.", malo: true });
      } else {
        setAviso({ texto: err.message, malo: true });
      }
    } finally {
      setOcupado(false);
    }
  }

  if (!conectado) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <BotonRed red="linkedin" href="/api/experiencia/linkedin?volver=misiones">
            Publicar en LinkedIn
          </BotonRed>
          <p className="text-sm font-light leading-relaxed text-white/55">
            Entras a LinkedIn una sola vez y vuelves acá con el texto y las imágenes listas.
            {yo?.linkedin && !yo.linkedin.vigente ? " Tu permiso anterior venció." : ""}
          </p>
        </div>
        <p className="text-sm font-light leading-relaxed text-white/45">
          Nunca publicamos nada sin que tú le des el botón.
        </p>
        <SubirPrueba yo={yo} mision={mision} texto="¿Ya publicaste por tu cuenta? Sube una captura de tu publicación y la misión queda hecha." alCambiar={alCambiar} />
        {enlaceCarnet && mision === "linkedin_voy" ? (
          <p className="text-sm font-light leading-relaxed text-white/45">
            ¿Prefieres no conectar?{" "}
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(enlaceCarnet)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-soft underline underline-offset-4 hover:text-white"
            >
              Comparte el enlace de tu carnet
            </a>
            : LinkedIn arma la vista previa con tu carnet y nosotros reconocemos la publicación.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <BotonRed red="linkedin" onClick={publicar} disabled={ocupado || texto.trim().length < 10}>
          {ocupado ? "Publicando…" : "Publicar en LinkedIn"}
        </BotonRed>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className={clasesBoton.borde}>
            Ver publicación
          </a>
        ) : null}
        <span className="text-sm font-light text-white/45">Se publica como {yo?.linkedin?.nombre}.</span>
      </div>

      {aviso ? <Mensaje {...aviso} /> : null}

      <SubirPrueba yo={yo} mision={mision} texto="Si prefieres publicar tú desde LinkedIn, sube después una captura como prueba." alCambiar={alCambiar} />

      {ultima?.url ? (
        <p className="text-sm font-light text-white/50">
          Ya publicaste esta misión el {fecha(ultima.en)}.{" "}
          <a href={ultima.url} target="_blank" rel="noopener noreferrer" className="text-violet-soft underline underline-offset-4">
            Ver publicación
          </a>
        </p>
      ) : null}

      <label className="flex flex-col gap-2.5">
        <span className="text-sm font-medium tracking-tight text-white/65">Esto es lo que se publica (puedes cambiarlo)</span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={9}
          maxLength={2800}
          className={`${claseCampo} min-h-[14rem] text-base leading-relaxed`}
        />
      </label>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium tracking-tight text-white/65">
          Imágenes <span className="font-light text-white/40">· hasta {LIMITES.fotosPorPublicacion}</span>
        </span>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {yo?.carnet ? (
            <Miniatura
              src="/api/experiencia/archivo?f=carnet:feed"
              alt="Tu carnet"
              seleccionada={incluirCarnet}
              onClick={() => setIncluirCarnet((v) => !v)}
            />
          ) : null}
          {fotosDisponibles.map((f) => (
            <Miniatura
              key={f.id}
              src={`/api/experiencia/archivo?f=${encodeURIComponent(f.id)}`}
              alt={f.clase === "frase" ? "Tu frase" : "Tu foto"}
              seleccionada={fotos.includes(f.id)}
              onClick={() => alternar(f.id)}
            />
          ))}
        </div>
        {!yo?.carnet && fotosDisponibles.length === 0 ? (
          <p className="text-sm font-light text-white/45">Arma tu carnet arriba y aparecerá acá para publicarlo.</p>
        ) : null}
      </div>

    </div>
  );
}

// ---------- Instagram ----------

function PanelInstagram({
  yo,
  mision,
  fase,
  alCambiar,
}: {
  yo: Vista | null;
  mision: "instagram_voy" | "instagram_fotos";
  fase: Fase;
  alCambiar: (yo: Vista) => void;
}) {
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; malo?: boolean } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [abrir, setAbrir] = useState(false);
  const movil = useMovil();

  const texto = textoInstagram(fase);
  const fotos = (yo?.fotos ?? []).filter((f) => f.clase !== "perfil");
  const esVoy = mision === "instagram_voy";
  // En el celular, la hoja de compartir abre Instagram con la imagen puesta.
  // En el computador no existe esa puerta: se descarga la imagen, se copia el
  // texto y se abre Instagram para que la suba desde «Crear».
  const urlInstagram = esVoy ? "https://www.instagram.com/create/story" : "https://www.instagram.com/";

  async function copiarTexto() {
    setCopiado(await copiar(texto));
    setTimeout(() => setCopiado(false), 2500);
  }

  async function compartir() {
    setOcupado(true);
    setAviso(null);
    try {
      const urls = esVoy
        ? ["/api/experiencia/archivo?f=carnet:story"]
        : seleccion.map((id) => `/api/experiencia/archivo?f=${encodeURIComponent(id)}`);
      if (!urls.length) return setAviso({ texto: "Elige al menos una foto.", malo: true });

      await copiar(texto);
      const blobs = await Promise.all(urls.map(blobDe));
      const archivos = blobs.map((b, i) => new File([b], `habi-next-${i + 1}.jpg`, { type: "image/jpeg" }));

      const r = await compartirArchivos(archivos, texto);
      if (r === "no-soportado") {
        archivos.forEach((a) => descargar(a, a.name));
        setAbrir(true);
        setAviso({
          texto: `Te descargamos ${archivos.length === 1 ? "la imagen" : "las imágenes"} y el texto quedó copiado. Abre Instagram, dale a Crear y elige el archivo.`,
        });
        return;
      }
      if (r === "cancelado") return setAviso({ texto: "Cerraste la hoja de compartir. Cuando quieras, de nuevo.", malo: true });

      const res = await pedirJson<{ ok: boolean; yo: Vista }>("/api/experiencia/mision", {
        mision,
        detalle: esVoy ? "historia" : `${archivos.length} fotos`,
      });
      alCambiar(res.yo);
      setAviso({ texto: "Compartido. El texto quedó copiado por si Instagram no lo pegó. Misión cumplida." });
    } catch (e) {
      setAviso({ texto: (e as Error).message, malo: true });
    } finally {
      setOcupado(false);
    }
  }

  if (esVoy && !yo?.carnet) {
    return <p className="text-base font-light text-white/60">Primero arma tu carnet arriba: la historia sale de ahí, en formato vertical.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <BotonRed red="instagram" onClick={compartir} disabled={ocupado}>
          {ocupado ? "Abriendo…" : "Publicar en Instagram"}
        </BotonRed>
        {abrir ? (
          <BotonRed red="instagram" href={urlInstagram} target="_blank" className="!bg-[#262626] hover:!brightness-125">
            Abrir Instagram
          </BotonRed>
        ) : null}
        <span className="text-sm font-light text-white/45">
          {movil ? "Se abre Instagram con la imagen puesta y el texto copiado." : "Desde el celular se abre Instagram directo."}
        </span>
      </div>

      {aviso ? <Mensaje {...aviso} /> : null}

      <div className="grid gap-5 sm:grid-cols-[minmax(0,11rem)_1fr]">
        {esVoy ? (
          <div className="overflow-hidden rounded-xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/experiencia/archivo?f=carnet:story" alt="Tu carnet para historias" className="w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:col-span-2 sm:grid-cols-5 md:grid-cols-6">
            {fotos.map((f) => (
              <Miniatura
                key={f.id}
                src={`/api/experiencia/archivo?f=${encodeURIComponent(f.id)}`}
                alt="Tu foto"
                seleccionada={seleccion.includes(f.id)}
                onClick={() =>
                  setSeleccion((prev) => (prev.includes(f.id) ? prev.filter((x) => x !== f.id) : prev.length >= 10 ? prev : [...prev, f.id]))
                }
              />
            ))}
            {fotos.length === 0 ? (
              <p className="col-span-full text-sm font-light text-white/45">Sube tus fotos en la misión anterior y aparecen acá.</p>
            ) : null}
          </div>
        )}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium tracking-tight text-white/65">El texto para tu publicación</span>
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-light leading-relaxed text-white/75">{texto}</p>
          <button type="button" onClick={copiarTexto} className={clasesBoton.suave + " self-start"}>
            {copiado ? "Copiado ✓" : "Copiar texto"}
          </button>
          <p className="text-xs font-light leading-relaxed text-white/40">
            Instagram no deja llenar el texto desde afuera. Lo copiamos por ti: al publicar, pégalo.
          </p>
        </div>
      </div>

      <SubirPrueba yo={yo} mision={mision} texto="Cuando lo publiques, sube una captura de tu historia o publicación como prueba." alCambiar={alCambiar} />
    </div>
  );
}

// ---------- WhatsApp ----------

function PanelInvitar({ yo, sitio, alCambiar, asegurar }: { yo: Vista | null; sitio: string; alCambiar: (yo: Vista) => void; asegurar: () => Promise<Vista> }) {
  const [copiado, setCopiado] = useState(false);
  const [creado, setCreado] = useState<Vista | null>(null);
  // Sin sesión todavía no hay id: se abre una en cuanto se muestra el panel.
  useEffect(() => {
    if (!yo && !creado) asegurar().then(setCreado).catch(() => null);
  }, [yo, creado, asegurar]);

  const persona = yo ?? creado;
  if (!persona) return <p className="text-base font-light text-white/60">Preparando tu enlace…</p>;

  const enlace = `${sitio}/i/${persona.id}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(textoInvitacion(enlace))}`;

  async function marcar() {
    try {
      const r = await pedirJson<{ ok: boolean; yo: Vista }>("/api/experiencia/mision", { mision: "invitar" });
      alCambiar(r.yo);
    } catch {
      /* si falla, WhatsApp igual se abrió; la vista previa lo marca */
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-base font-light leading-relaxed text-white/70">
        Este enlace es tuyo. Cada persona que lo abra queda contada acá, y si compra su entrada sabemos que
        llegó por ti.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <code className="flex-1 truncate rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3.5 font-mono text-sm text-white/80">
          {enlace}
        </code>
        <button
          type="button"
          onClick={async () => {
            setCopiado(await copiar(enlace));
            setTimeout(() => setCopiado(false), 2500);
          }}
          className={clasesBoton.borde}
        >
          {copiado ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <BotonRed red="whatsapp" href={wa} target="_blank" onClick={marcar}>
          Enviar por WhatsApp
        </BotonRed>
        <span className="text-sm font-light text-white/50">
          {persona.invitacion.clics === 0
            ? "Todavía nadie la ha abierto."
            : persona.invitacion.clics === 1
              ? "Ya la abrió 1 persona."
              : `Ya la abrieron ${persona.invitacion.clics} personas.`}
        </span>
      </div>
      <SubirPrueba yo={yo} mision="invitar" texto="También puedes subir una captura del chat donde la enviaste." alCambiar={alCambiar} />
    </div>
  );
}

// ---------- Fotos ----------

function PanelFotos({ yo, alCambiar }: { yo: Vista | null; alCambiar: (yo: Vista) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; malo?: boolean } | null>(null);
  const fotos = (yo?.fotos ?? []).filter((f) => f.clase === "foto");

  async function subir(lista: FileList | null) {
    if (!lista?.length) return;
    setAviso(null);
    const archivos = Array.from(lista).slice(0, LIMITES.fotos - fotos.length);
    if (archivos.length < lista.length) setAviso({ texto: `Caben ${LIMITES.fotos} fotos en total; subimos las primeras.` });
    let n = 0;
    for (const archivo of archivos) {
      n += 1;
      setProgreso(`Subiendo ${n} de ${archivos.length}…`);
      try {
        const reducida = await reducirImagen(archivo);
        const fd = new FormData();
        fd.append("foto", reducida, "foto.jpg");
        fd.append("clase", "foto");
        const r = await pedir<{ ok: boolean; yo: Vista }>("/api/experiencia/fotos", { method: "POST", body: fd });
        alCambiar(r.yo);
      } catch (e) {
        setAviso({ texto: (e as Error).message, malo: true });
        break;
      }
    }
    setProgreso(null);
    if (entrada.current) entrada.current.value = "";
  }

  async function borrar(id: string) {
    try {
      const r = await pedir<{ ok: boolean; yo: Vista }>(`/api/experiencia/fotos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      alCambiar(r.yo);
    } catch (e) {
      setAviso({ texto: (e as Error).message, malo: true });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-base font-light leading-relaxed text-white/70">
        Sube las fotos que te tomaste en Habi Next. Se reducen en tu celular antes de subir y quedan listas
        para publicar en las misiones que siguen.
      </p>
      <input ref={entrada} type="file" accept="image/*" multiple hidden onChange={(e) => subir(e.target.files)} />
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => entrada.current?.click()} disabled={Boolean(progreso) || fotos.length >= LIMITES.fotos} className={clasesBoton.solido}>
          {progreso ?? (fotos.length ? "Subir más fotos" : "Subir mis fotos")}
        </button>
        <span className="text-sm font-light text-white/45">
          {fotos.length} de {LIMITES.fotos}
        </span>
      </div>
      {aviso ? <Mensaje {...aviso} /> : null}
      {fotos.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {fotos.map((f) => (
            <div key={f.id} className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/experiencia/archivo?f=${encodeURIComponent(f.id)}`} alt="Tu foto" className="h-full w-full object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => borrar(f.id)}
                aria-label="Borrar foto"
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-night/80 text-sm text-white/80 opacity-80 transition-opacity hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------- Frase ----------

function PanelFrase({ yo, sitio, alCambiar }: { yo: Vista | null; sitio: string; alCambiar: (yo: Vista) => void }) {
  const [frase, setFrase] = useState(yo?.frase ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; malo?: boolean } | null>(null);
  const [publicar, setPublicar] = useState(false);
  const movil = useMovil();

  const pieza = (yo?.fotos ?? []).filter((f) => f.clase === "frase").slice(-1)[0];

  async function crear() {
    if (frase.trim().length < 8) return setAviso({ texto: "Escribe una frase un poco más larga.", malo: true });
    setOcupado(true);
    setAviso(null);
    try {
      const r = await pedirJson<{ ok: boolean; yo: Vista }>("/api/experiencia/mision", { mision: "frase", frase });
      alCambiar(r.yo);
      const familia = familiaDeFuente();
      await cargarFuentes(familia);
      const recursos = await cargarRecursos("feed");
      const c = document.createElement("canvas");
      dibujarFrase(c, { frase, nombre: r.yo.nombre, apellido: r.yo.apellido, recursos, familia });
      const blob = await aBlob(c, 0.92);
      const fd = new FormData();
      fd.append("foto", blob, "frase.jpg");
      fd.append("clase", "frase");
      const s = await pedir<{ ok: boolean; yo: Vista }>("/api/experiencia/fotos", { method: "POST", body: fd });
      alCambiar(s.yo);
      setAviso({ texto: "Tu pieza está lista. Compártela o publícala en LinkedIn." });
    } catch (e) {
      setAviso({ texto: (e as Error).message, malo: true });
    } finally {
      setOcupado(false);
    }
  }

  async function compartir() {
    if (!pieza) return;
    const blob = await blobDe(`/api/experiencia/archivo?f=${encodeURIComponent(pieza.id)}`);
    const archivo = new File([blob], "habi-next-frase.jpg", { type: "image/jpeg" });
    await copiar(textoFrase(frase));
    const r = await compartirArchivos([archivo], textoFrase(frase));
    if (r === "no-soportado") descargar(blob, archivo.name);
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2.5">
        <span className="flex items-center justify-between text-sm font-medium tracking-tight text-white/65">
          ¿Qué te llevas de Habi Next?
          <span className="text-xs font-light text-white/40">
            {frase.length}/{LIMITES.frase}
          </span>
        </span>
        <textarea
          value={frase}
          onChange={(e) => setFrase(e.target.value.slice(0, LIMITES.frase))}
          rows={3}
          maxLength={LIMITES.frase}
          placeholder="Una idea, un aprendizaje, una frase que te quedó sonando."
          className={`${claseCampo} text-base leading-relaxed`}
        />
      </label>
      {aviso ? <Mensaje {...aviso} /> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={crear} disabled={ocupado} className={clasesBoton.solido}>
          {ocupado ? "Creando…" : pieza ? "Volver a crear la pieza" : "Crear mi pieza"}
        </button>
      </div>
      {pieza ? (
        <div className="grid gap-5 sm:grid-cols-[minmax(0,16rem)_1fr]">
          <div className="overflow-hidden rounded-xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/experiencia/archivo?f=${encodeURIComponent(pieza.id)}`} alt="Tu frase" className="w-full" />
          </div>
          <div className="flex flex-col gap-3">
            <button type="button" onClick={compartir} className={clasesBoton.borde + " self-start"}>
              {movil ? "Compartir" : "Descargar"}
            </button>
            {publicar ? (
              <button type="button" onClick={() => setPublicar(false)} className={clasesBoton.suave + " self-start"}>
                Ocultar LinkedIn
              </button>
            ) : (
              <BotonRed red="linkedin" onClick={() => setPublicar(true)} className="self-start">
                Publicar en LinkedIn
              </BotonRed>
            )}
            {publicar ? (
              <PanelLinkedIn
                yo={yo}
                mision="linkedin_fotos"
                textoInicial={textoFrase(frase)}
                sitio={sitio}
                alCambiar={alCambiar}
                preseleccion={[pieza.id]}
                conCarnet={false}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------- la lista ----------

function Tarjeta({
  m,
  indice,
  estado,
  abierta,
  alAbrir,
  hechaEn,
  children,
}: {
  m: Mision;
  indice: number;
  estado: Estado;
  abierta: boolean;
  alAbrir: () => void;
  hechaEn?: string;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`rounded-[26px] border transition-colors ${
        estado === "hecha"
          ? "border-violet/50 bg-violet/[0.08]"
          : estado === "cerrada"
            ? "border-white/8 bg-white/[0.02]"
            : "border-white/12 bg-white/[0.03]"
      }`}
    >
      <button
        type="button"
        onClick={alAbrir}
        aria-expanded={abierta}
        disabled={estado === "cerrada"}
        className="flex w-full items-start gap-4 p-5 text-left disabled:cursor-not-allowed md:items-center md:gap-6 md:p-6"
      >
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-base font-bold tabular-nums ${
            estado === "hecha" ? "bg-violet text-white" : estado === "cerrada" ? "border border-white/10 text-white/30" : "border border-white/20 text-white/80"
          }`}
        >
          {estado === "hecha" ? "✓" : indice}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`text-lg font-semibold tracking-tight md:text-xl ${estado === "cerrada" ? "text-white/45" : "text-white"}`}>
              {m.titulo}
            </span>
            {m.red ? <Chip red={m.red} className={estado === "cerrada" ? "opacity-40 grayscale" : ""} /> : null}
          </span>
          <span className={`mt-1 block text-sm font-light md:text-base ${estado === "cerrada" ? "text-white/35" : "text-white/60"}`}>
            {estado === "cerrada" ? "Se abre el 20 de octubre, el día del evento." : estado === "hecha" && hechaEn ? `Hecha el ${fecha(hechaEn)}.` : m.resumen}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className={`block text-xl font-bold tabular-nums tracking-tight md:text-2xl ${estado === "hecha" ? "text-violet-soft" : "text-white/70"}`}>
            +{m.puntos}
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">puntos</span>
        </span>
      </button>
      {abierta && estado !== "cerrada" ? <div className="border-t border-white/10 p-5 md:p-6">{children}</div> : null}
    </li>
  );
}

export default function Misiones({ yo, fase, sitio, li, alCambiar, asegurar, abierta, alAbrir, solo, compacto }: Props) {
  const avisoLi = li ? AVISOS_LI[li] : undefined;

  const hechas = MISIONES.filter((m) => yo?.misiones[m.id]).length;
  const puntos = yo?.puntos ?? 0;
  const porcentaje = Math.round((puntos / PUNTOS_TOTALES) * 100);

  const estadoDe = (m: Mision): Estado => {
    if (yo?.misiones[m.id]) return "hecha";
    if (m.fase === "evento" && fase === "antes") return "cerrada";
    return "pendiente";
  };


  const antes = useMemo(() => MISIONES.filter((m) => m.fase === "antes" && (!solo || solo.includes(m.id))), [solo]);
  const evento = useMemo(() => MISIONES.filter((m) => m.fase === "evento" && (!solo || solo.includes(m.id))), [solo]);

  const panel = (m: Mision) => {
    switch (m.id) {
      case "carnet":
        return (
          <p className="text-base font-light leading-relaxed text-white/70">
            Tu carnet se arma{" "}
            <a href="#carnet" className="text-violet-soft underline underline-offset-4 hover:text-white">
              arriba
            </a>
            : nombre, apellido y tu foto. Al guardarlo, esta misión se marca sola.
          </p>
        );
      case "linkedin_voy":
        return (
          <PanelLinkedIn yo={yo} mision="linkedin_voy" textoInicial={textoVoy(yo?.registro?.tier)} sitio={sitio} alCambiar={alCambiar} conCarnet />
        );
      case "instagram_voy":
        return <PanelInstagram yo={yo} mision="instagram_voy" fase={fase} alCambiar={alCambiar} />;
      case "invitar":
        return <PanelInvitar yo={yo} sitio={sitio} alCambiar={alCambiar} asegurar={asegurar} />;
      case "fotos":
        return <PanelFotos yo={yo} alCambiar={alCambiar} />;
      case "linkedin_fotos":
        return (
          <PanelLinkedIn
            yo={yo}
            mision="linkedin_fotos"
            textoInicial={textoFotos()}
            sitio={sitio}
            alCambiar={alCambiar}
            preseleccion={(yo?.fotos ?? []).filter((f) => f.clase === "foto").slice(0, LIMITES.fotosPorPublicacion).map((f) => f.id)}
            conCarnet={false}
          />
        );
      case "instagram_fotos":
        return <PanelInstagram yo={yo} mision="instagram_fotos" fase={fase} alCambiar={alCambiar} />;
      case "frase":
        return <PanelFrase yo={yo} sitio={sitio} alCambiar={alCambiar} />;
    }
  };

  const lista = (grupo: Mision[], desde: number) => (
    <ul className="flex flex-col gap-3">
      {grupo.map((m, i) => (
        <Tarjeta
          key={m.id}
          m={m}
          indice={desde + i}
          estado={estadoDe(m)}
          abierta={abierta === m.id}
          alAbrir={() => alAbrir(abierta === m.id ? null : m.id)}
          hechaEn={yo?.misiones[m.id]?.en}
        >
          {panel(m)}
        </Tarjeta>
      ))}
    </ul>
  );

  return (
    <section id="misiones" className="scroll-mt-24">
      {/* Marcador */}
      {compacto ? null : (
      <div className="rounded-[28px] border border-white/12 bg-gradient-to-b from-violet-shade to-night p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-soft">Tu avance</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-bold tabular-nums tracking-tighter md:text-6xl">{puntos}</span>
              <span className="text-lg font-light text-white/50">/ {PUNTOS_TOTALES} puntos</span>
            </p>
            <p className="mt-1 text-base font-light text-white/60">
              {hechas} de {MISIONES.length} misiones · nivel <span className="font-semibold text-white">{yo?.nivel ?? "Asistente"}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 text-right">
            {yo?.linkedin ? (
              <form method="post" action="/api/experiencia/salir" className="flex items-center gap-3 text-sm text-white/55">
                <span>
                  Conectado como <span className="font-medium text-white/85">{yo.linkedin.nombre}</span>
                </span>
                <button type="submit" className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs text-white/60 transition-colors hover:border-white/35 hover:text-white">
                  Salir
                </button>
              </form>
            ) : (
              <a href="/api/experiencia/linkedin?volver=misiones" className="text-sm text-white/55 underline underline-offset-4 transition-colors hover:text-white">
                Conectar LinkedIn para guardar mi avance
              </a>
            )}
            {yo?.registro ? (
              <span className="rounded-full bg-violet px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                Entrada {yo.registro.tier === "vip" ? "VIP" : "General"} · {yo.registro.etapa === "aprobado" ? "confirmada" : "en proceso"}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-violet transition-[width] duration-700" style={{ width: `${porcentaje}%` }} />
        </div>
        <p className="mt-5 text-base font-light leading-relaxed text-white/60">
          <span className="font-semibold text-white">{PREMIO.titulo}.</span> {PREMIO.detalle}
        </p>
      </div>
      )}

      {avisoLi ? (
        <div className="mt-6">
          <Mensaje {...avisoLi} />
        </div>
      ) : null}

      <div className={`flex flex-col gap-10 ${compacto ? "" : "mt-10"}`}>
        {antes.length ? (
          <div>
            {evento.length ? (
              <p className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
                <Dot className="h-1.5 w-1.5" />
                Antes del evento
              </p>
            ) : null}
            {lista(antes, 1)}
          </div>
        ) : null}
        {evento.length ? (
          <div>
            {antes.length ? (
              <p className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-soft">
                <Dot className="h-1.5 w-1.5" />
                El día del evento
              </p>
            ) : null}
            {lista(evento, antes.length + 1)}
          </div>
        ) : null}
      </div>
    </section>
  );
}
