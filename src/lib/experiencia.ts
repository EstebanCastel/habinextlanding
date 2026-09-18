import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { borrar, crearSiNoExiste, escribir, leer, listarRutas, modificar } from "./almacen";
import { hmacHex, igualSeguro } from "./seguridad";
import { todos as todosLosRegistros, type Etapa, type Tier } from "./registros";
import type { Perfil } from "./linkedin";
import { EVENT } from "@/config/event";
import { MISIONES, NIVELES, type Fase, type MisionId, type Red } from "@/config/experiencia";

/**
 * La experiencia del asistente: su carnet, sus fotos, sus misiones y lo que
 * publicó. Un documento por persona en el store privado, igual que los
 * registros de boletería, y con las mismas reglas: se escribe con control de
 * concurrencia y la bitácora solo crece.
 *
 * **La sesión es una cookie firmada, no un login.** Cualquiera puede armar su
 * carnet sin dar nada; la cookie es lo que hace que al volver encuentre su
 * avance. Conectar LinkedIn suma dos cosas: recuperar ese avance desde otro
 * aparato, y el permiso para publicar en su nombre. El token de LinkedIn se
 * guarda cifrado: quien llegara a leer el store no podría publicar por nadie.
 */

export type Formato = "feed" | "story";

export type Foto = {
  id: string;
  ruta: string;
  tipo: string;
  bytes: number;
  subidaEn: string;
  /** `foto` es del evento; `perfil` vino de LinkedIn; `frase` es la pieza generada. */
  clase: "foto" | "perfil" | "frase";
};

export type Publicacion = {
  red: Red;
  mision: MisionId;
  en: string;
  urn?: string;
  url?: string;
  fotos: number;
};

export type Participante = {
  id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  carnet?: { renderizadoEn: string; formatos: Formato[]; veces: number };
  linkedin?: {
    sub: string;
    nombre: string;
    email?: string;
    conectadoEn: string;
    venceEn: string;
    tokenCifrado: string;
    fotoId?: string;
  };
  /** Su entrada, si su correo coincide con un registro de boletería. */
  registro?: { token: string; tier: Tier; etapa: Etapa; vinculadoEn: string };
  fotos: Foto[];
  misiones: Partial<Record<MisionId, { en: string; detalle?: string }>>;
  publicaciones: Publicacion[];
  frase?: string;
  invitacion: { clics: number; ultimoClic?: string };
  /** Qué robots de redes vinieron a buscar la vista previa de su carnet, y cuándo. */
  vistasPrevias: Record<string, string>;
  bitacora: { en: string; que: string; detalle?: string }[];
  creadoEn: string;
  actualizadoEn: string;
};

const rutaPersona = (id: string) => `experiencia/personas/${id}.json`;
const rutaIndiceLinkedIn = (sub: string) => `experiencia/indice/linkedin/${sub.replace(/[^A-Za-z0-9_-]/g, "_")}.json`;
export const rutaDeArchivo = (id: string, fotoId: string, ext: string) => `experiencia/archivos/${id}/${fotoId}.${ext}`;
export const rutaDeCarnet = (id: string, formato: Formato) => `experiencia/carnets/${id}/${formato}.jpg`;

const ID_VALIDO = /^[A-Za-z0-9_-]{8,32}$/;
export const esId = (id: unknown): id is string => typeof id === "string" && ID_VALIDO.test(id);

// ---------- sesión ----------

export const COOKIE_SESION = "hn_exp";
const VIDA_SESION = 60 * 60 * 24 * 180;

function secreto(): string {
  const s = process.env.EXPERIENCIA_SECRET;
  if (!s || s.length < 32) throw new Error("EXPERIENCIA_SECRET falta o es demasiado corto");
  return s;
}

export function configurada(): boolean {
  try {
    secreto();
    return true;
  } catch {
    return false;
  }
}

export function firmarSesion(id: string): string {
  return `${id}.${hmacHex(secreto(), `sesion:${id}`).slice(0, 40)}`;
}

export function idDeSesion(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const punto = valor.indexOf(".");
  if (punto < 0) return null;
  const id = valor.slice(0, punto);
  const firma = valor.slice(punto + 1);
  if (!esId(id) || firma.length !== 40) return null;
  return igualSeguro(hmacHex(secreto(), `sesion:${id}`).slice(0, 40), firma) ? id : null;
}

export async function sesionActual(): Promise<string | null> {
  if (!configurada()) return null;
  return idDeSesion((await cookies()).get(COOKIE_SESION)?.value);
}

export function opcionesDeCookie() {
  return {
    path: "/",
    httpOnly: true,
    // En desarrollo no hay HTTPS y Safari no acepta cookies Secure por http.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: VIDA_SESION,
  };
}

// ---------- cifrado del token de LinkedIn ----------

function llave(): Buffer {
  return createHash("sha256").update(`${secreto()}|linkedin`).digest();
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", llave(), iv);
  const ct = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64url");
}

export function descifrar(cifrado: string): string | null {
  try {
    const b = Buffer.from(cifrado, "base64url");
    const d = createDecipheriv("aes-256-gcm", llave(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ---------- fase ----------

/**
 * Antes del evento las misiones invitan a ir; desde el día del evento, a
 * contar lo vivido. `EXPERIENCIA_FASE` fuerza una u otra para probar.
 */
export function fase(ahora = new Date()): Fase {
  const forzada = process.env.EXPERIENCIA_FASE;
  if (forzada === "evento" || forzada === "antes") return forzada;
  const diaDelEvento = new Date(`${EVENT.startsAt.slice(0, 10)}T00:00:00-05:00`);
  return ahora.getTime() >= diaDelEvento.getTime() ? "evento" : "antes";
}

// ---------- personas ----------

export function nuevoId(): string {
  return randomBytes(9).toString("base64url");
}

export async function crear(): Promise<Participante> {
  const ahora = new Date().toISOString();
  for (let intento = 0; intento < 3; intento += 1) {
    const p: Participante = {
      id: nuevoId(),
      fotos: [],
      misiones: {},
      publicaciones: [],
      invitacion: { clics: 0 },
      vistasPrevias: {},
      bitacora: [{ en: ahora, que: "empezó su experiencia" }],
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    if (await crearSiNoExiste(rutaPersona(p.id), p)) return p;
  }
  throw new Error("no se pudo crear el participante");
}

export async function porId(id: string): Promise<Participante | null> {
  if (!esId(id)) return null;
  return leer<Participante>(rutaPersona(id));
}

export async function porLinkedIn(sub: string): Promise<Participante | null> {
  const idx = await leer<{ id: string }>(rutaIndiceLinkedIn(sub));
  return idx?.id ? porId(idx.id) : null;
}

/** Lee, transforma y escribe con control de concurrencia. */
export async function cambiar(
  id: string,
  transformar: (p: Participante) => Participante
): Promise<Participante | null> {
  if (!esId(id)) return null;
  return modificar<Participante>(rutaPersona(id), (actual) => {
    if (!actual) return null;
    const nuevo = transformar(actual);
    nuevo.actualizadoEn = new Date().toISOString();
    return nuevo;
  });
}

/** Bitácora append-only, con techo para que el documento no crezca sin fin. */
export function anotar(p: Participante, que: string, detalle?: string): Participante {
  const bitacora = [...p.bitacora, { en: new Date().toISOString(), que, ...(detalle ? { detalle } : {}) }];
  return { ...p, bitacora: bitacora.slice(-200) };
}

/** Marca una misión como hecha. La primera vez cuenta; las demás no cambian nada. */
export function marcar(p: Participante, mision: MisionId, detalle?: string): Participante {
  if (p.misiones[mision]) return p;
  const con = { ...p, misiones: { ...p.misiones, [mision]: { en: new Date().toISOString(), ...(detalle ? { detalle } : {}) } } };
  const m = MISIONES.find((x) => x.id === mision);
  return anotar(con, `misión: ${m?.titulo ?? mision}`, detalle);
}

export function puntos(p: Participante): number {
  return MISIONES.reduce((s, m) => s + (p.misiones[m.id] ? m.puntos : 0), 0);
}

export function nivel(p: Participante): string {
  const pts = puntos(p);
  let actual = NIVELES[0].nombre;
  for (const n of NIVELES) if (pts >= n.desde) actual = n.nombre;
  return actual;
}

export function nombreCompleto(p: Participante): string {
  return [p.nombre, p.apellido].filter(Boolean).join(" ").trim() || p.linkedin?.nombre || "";
}

// ---------- LinkedIn ----------

/**
 * Deja a la persona conectada con LinkedIn y devuelve con qué participante
 * queda. Si ya había entrado con esa cuenta desde otro aparato, se recupera
 * ese avance y se le suma lo que hizo en este.
 */
export async function conectarLinkedIn(datos: {
  idSesion: string | null;
  perfil: Perfil;
  accessToken: string;
  expiraEnSegundos: number;
}): Promise<Participante> {
  const { idSesion, perfil, accessToken, expiraEnSegundos } = datos;
  const ahora = new Date().toISOString();

  const previo = await porLinkedIn(perfil.sub);
  const actual = idSesion ? await porId(idSesion) : null;

  let destino = previo ?? actual ?? (await crear());
  if (!previo) await escribir(rutaIndiceLinkedIn(perfil.sub), { id: destino.id, en: ahora });

  const fusionar = previo && actual && previo.id !== actual.id ? actual : null;

  const resultado = await cambiar(destino.id, (p) => {
    let q: Participante = {
      ...p,
      nombre: p.nombre || perfil.nombrePila || perfil.nombre.split(" ")[0],
      apellido: p.apellido || perfil.apellido || "",
      email: p.email || perfil.email,
      linkedin: {
        sub: perfil.sub,
        nombre: perfil.nombre,
        email: perfil.email,
        conectadoEn: p.linkedin?.conectadoEn ?? ahora,
        venceEn: new Date(Date.now() + expiraEnSegundos * 1000).toISOString(),
        tokenCifrado: cifrar(accessToken),
        fotoId: p.linkedin?.fotoId,
      },
    };
    if (fusionar) {
      const vistas = new Set(q.fotos.map((f) => f.id));
      q = {
        ...q,
        fotos: [...q.fotos, ...fusionar.fotos.filter((f) => !vistas.has(f.id))],
        misiones: { ...fusionar.misiones, ...q.misiones },
        publicaciones: [...q.publicaciones, ...fusionar.publicaciones],
        frase: q.frase || fusionar.frase,
        carnet: q.carnet ?? fusionar.carnet,
        invitacion: { clics: q.invitacion.clics + fusionar.invitacion.clics },
      };
      q = anotar(q, "recuperó su avance desde otro aparato", fusionar.id);
    }
    return anotar(q, previo ? "volvió a conectar LinkedIn" : "conectó LinkedIn", perfil.nombre);
  });
  destino = resultado ?? destino;
  return destino;
}

export function tokenDeLinkedIn(p: Participante): string | null {
  if (!p.linkedin) return null;
  if (new Date(p.linkedin.venceEn).getTime() < Date.now()) return null;
  return descifrar(p.linkedin.tokenCifrado);
}

/**
 * Busca la entrada de la persona por su correo. Cuesta una lectura de todos
 * los registros, así que se hace una vez, al conectar LinkedIn, y no en cada
 * página.
 */
export async function vincularRegistro(id: string, email: string | undefined): Promise<void> {
  if (!email) return;
  const correo = email.trim().toLowerCase();
  const registros = await todosLosRegistros().catch(() => []);
  const mio = registros
    .filter((r) => r.luma.email.trim().toLowerCase() === correo && r.etapa !== "rechazado")
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))[0];
  if (!mio) return;
  await cambiar(id, (p) =>
    anotar(
      { ...p, registro: { token: mio.token, tier: mio.tier, etapa: mio.etapa, vinculadoEn: new Date().toISOString() } },
      "vinculó su entrada",
      `${mio.tier} · ${mio.etapa}`
    )
  );
}

// ---------- fotos ----------

export async function agregarFoto(id: string, foto: Foto, mision?: MisionId): Promise<Participante | null> {
  return cambiar(id, (p) => {
    let q = anotar({ ...p, fotos: [...p.fotos, foto] }, "subió una foto", `${foto.clase} · ${Math.round(foto.bytes / 1024)} KB`);
    if (mision) q = marcar(q, mision);
    return q;
  });
}

export async function quitarFoto(id: string, fotoId: string): Promise<Participante | null> {
  const p = await porId(id);
  const foto = p?.fotos.find((f) => f.id === fotoId);
  if (!p || !foto) return p;
  await borrar(foto.ruta);
  return cambiar(id, (q) => anotar({ ...q, fotos: q.fotos.filter((f) => f.id !== fotoId) }, "borró una foto"));
}

// ---------- invitaciones y vistas previas ----------

export async function contarInvitacion(id: string): Promise<void> {
  await cambiar(id, (p) => ({
    ...p,
    invitacion: { clics: p.invitacion.clics + 1, ultimoClic: new Date().toISOString() },
  }));
}

/**
 * Cuando alguien pega su carnet en LinkedIn o WhatsApp, el robot de esa red
 * viene a buscar la vista previa. Ese robot es la prueba de que se compartió,
 * sin pedirle nada a la persona: la idea la usa Supabase en sus tickets de
 * Launch Week.
 */
export function redDelRobot(userAgent: string | null): string | null {
  const ua = userAgent ?? "";
  if (/LinkedInBot/i.test(ua)) return "linkedin";
  if (/WhatsApp/i.test(ua)) return "whatsapp";
  if (/facebookexternalhit|Facebot/i.test(ua)) return "facebook";
  if (/Twitterbot/i.test(ua)) return "x";
  if (/TelegramBot/i.test(ua)) return "telegram";
  if (/Slackbot/i.test(ua)) return "slack";
  return null;
}

export async function registrarVistaPrevia(id: string, red: string): Promise<void> {
  await cambiar(id, (p) => {
    if (p.vistasPrevias[red]) return p;
    let q: Participante = { ...p, vistasPrevias: { ...p.vistasPrevias, [red]: new Date().toISOString() } };
    // Que LinkedIn haya venido por la vista previa vale como publicación
    // hecha para quien compartió el enlace en vez de publicar desde acá.
    if (red === "linkedin" && !q.misiones.linkedin_voy && fase() === "antes") {
      q = marcar(q, "linkedin_voy", "compartió el enlace de su carnet");
      q = { ...q, publicaciones: [...q.publicaciones, { red: "linkedin", mision: "linkedin_voy", en: new Date().toISOString(), fotos: 1 }] };
    }
    return anotar(q, "vista previa pedida por una red", red);
  });
}

// ---------- lo que ve el navegador ----------

/** Lo que la página necesita de la persona. Nunca incluye el token. */
export type Vista = {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  carnet?: Participante["carnet"];
  linkedin?: { nombre: string; venceEn: string; vigente: boolean; fotoId?: string };
  registro?: { tier: Tier; etapa: Etapa };
  fotos: Pick<Foto, "id" | "tipo" | "subidaEn" | "clase">[];
  misiones: Participante["misiones"];
  publicaciones: Publicacion[];
  frase?: string;
  invitacion: Participante["invitacion"];
  vistasPrevias: Record<string, string>;
  puntos: number;
  nivel: string;
};

export function vistaDe(p: Participante): Vista {
  return {
    id: p.id,
    nombre: p.nombre ?? "",
    apellido: p.apellido ?? "",
    email: p.email,
    carnet: p.carnet,
    linkedin: p.linkedin
      ? {
          nombre: p.linkedin.nombre,
          venceEn: p.linkedin.venceEn,
          vigente: new Date(p.linkedin.venceEn).getTime() > Date.now(),
          fotoId: p.linkedin.fotoId,
        }
      : undefined,
    registro: p.registro ? { tier: p.registro.tier, etapa: p.registro.etapa } : undefined,
    fotos: p.fotos.map((f) => ({ id: f.id, tipo: f.tipo, subidaEn: f.subidaEn, clase: f.clase })),
    misiones: p.misiones,
    publicaciones: p.publicaciones,
    frase: p.frase,
    invitacion: p.invitacion,
    vistasPrevias: p.vistasPrevias,
    puntos: puntos(p),
    nivel: nivel(p),
  };
}

// ---------- panel ----------

export async function todos(): Promise<Participante[]> {
  const rutas = await listarRutas("experiencia/personas/", 5000);
  const salida: Participante[] = [];
  const tanda = 40;
  for (let i = 0; i < rutas.length; i += tanda) {
    const trozo = await Promise.all(rutas.slice(i, i + tanda).map((r) => leer<Participante>(r)));
    for (const p of trozo) if (p) salida.push(p);
  }
  return salida.sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
}

export type ResumenExperiencia = {
  participantes: number;
  conLinkedIn: number;
  conNombre: number;
  carnets: number;
  fotos: number;
  publicacionesLinkedIn: number;
  compartidosInstagram: number;
  invitacionesAbiertas: number;
  vistasPreviasLinkedIn: number;
  porMision: Record<MisionId, number>;
  completaron: number;
};

export function resumir(lista: Participante[]): ResumenExperiencia {
  const porMision = Object.fromEntries(MISIONES.map((m) => [m.id, 0])) as Record<MisionId, number>;
  for (const p of lista) for (const m of MISIONES) if (p.misiones[m.id]) porMision[m.id] += 1;
  return {
    participantes: lista.length,
    conLinkedIn: lista.filter((p) => p.linkedin).length,
    conNombre: lista.filter((p) => p.nombre).length,
    carnets: lista.filter((p) => p.carnet).length,
    fotos: lista.reduce((s, p) => s + p.fotos.filter((f) => f.clase === "foto").length, 0),
    publicacionesLinkedIn: lista.reduce((s, p) => s + p.publicaciones.filter((x) => x.red === "linkedin").length, 0),
    compartidosInstagram: lista.reduce((s, p) => s + p.publicaciones.filter((x) => x.red === "instagram").length, 0),
    invitacionesAbiertas: lista.reduce((s, p) => s + p.invitacion.clics, 0),
    vistasPreviasLinkedIn: lista.filter((p) => p.vistasPrevias.linkedin).length,
    porMision,
    completaron: lista.filter((p) => MISIONES.every((m) => p.misiones[m.id])).length,
  };
}

export function aCsv(lista: Participante[], sitio: string): string {
  const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const cabecera = [
    "Nombre",
    "Apellido",
    "Correo",
    "LinkedIn",
    "Entrada",
    "Puntos",
    "Nivel",
    ...MISIONES.map((m) => m.titulo),
    "Fotos",
    "Publicaciones LinkedIn",
    "Enlaces LinkedIn",
    "Compartidos Instagram",
    "Invitación abierta (veces)",
    "Frase",
    "Carnet público",
    "Empezó",
    "Último movimiento",
  ];
  const filas = lista.map((p) =>
    [
      p.nombre,
      p.apellido,
      p.email,
      p.linkedin?.nombre,
      p.registro ? `${p.registro.tier} · ${p.registro.etapa}` : "",
      puntos(p),
      nivel(p),
      ...MISIONES.map((m) => p.misiones[m.id]?.en ?? ""),
      p.fotos.filter((f) => f.clase === "foto").length,
      p.publicaciones.filter((x) => x.red === "linkedin").length,
      p.publicaciones
        .filter((x) => x.red === "linkedin" && x.url)
        .map((x) => x.url)
        .join(" "),
      p.publicaciones.filter((x) => x.red === "instagram").length,
      p.invitacion.clics,
      p.frase,
      p.carnet ? `${sitio}/c/${p.id}` : "",
      p.creadoEn,
      p.actualizadoEn,
    ]
      .map(celda)
      .join(",")
  );
  return "﻿" + [cabecera.map(celda).join(","), ...filas].join("\r\n");
}
