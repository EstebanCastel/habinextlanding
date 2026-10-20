/**
 * La puerta cuando se cae internet.
 *
 * El lector siempre intenta el servidor primero: es quien manda y quien tiene
 * el conteo bueno. Pero le pone un límite de tres segundos, porque en una fila
 * de setecientas personas una petición colgada es peor que ninguna. Si no
 * contesta, decide con el padrón que trae en el bolsillo, guarda la marca y la
 * manda cuando la señal vuelve.
 *
 * Reenviar no duplica a nadie: `validar` escribe la marca con el id de la
 * persona como nombre de archivo, así que la segunda vez contesta «repetido» y
 * no suma. Por eso la cola puede reintentar sin miedo.
 */

const CLAVE_PADRON = "hn.padron.v2";
const CLAVE_COLA = "hn.cola.v2";

export type Tipo = "general" | "vip" | "equipo";
export type Modo = "entrada" | "almuerzo" | "taller";

export type Veredicto = {
  ok: boolean;
  estado:
    | "entra"
    | "repetido"
    | "desconocido"
    | "sin-turno"
    | "no-es-vip"
    | "fuera-de-turno"
    | "pase-equivocado"
    | "sin-reserva";
  asistente?: { id: string; tipo: Tipo; nombre: string; correo: string; cargo?: string };
  marca?: { en: string };
  previa?: { en: string; por: string };
  turno?: { rotulo: string; desde: string; hasta: string };
  detalle?: string;
  /** Lo decidió el teléfono, no el servidor. */
  local?: boolean;
};

type Fila = [string, Tipo, string, string, number];
type Pase = { n: string; t: Tipo; a?: string; ka?: string; kt?: Record<string, string> };

export type Paquete = {
  ok: true;
  armadoEn: string;
  bajadoEn: string;
  gente: Fila[];
  equipo: Record<string, string>;
  pases: Record<string, Pase>;
};

type EnCola = { texto: string; modo: Modo; por: string; en: string };

// ---------------------------------------------------------- guardado ----

const leerJson = <T,>(clave: string): T | null => {
  try {
    const t = localStorage.getItem(clave);
    return t ? (JSON.parse(t) as T) : null;
  } catch {
    return null;
  }
};

const guardarJson = (clave: string, valor: unknown): void => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin espacio o en modo privado: se sigue, solo que sin respaldo.
  }
};

export const paqueteGuardado = (): Paquete | null => leerJson<Paquete>(CLAVE_PADRON);

/** Baja el padrón y lo deja en el teléfono. Devuelve null si no se pudo. */
export async function bajarPaquete(): Promise<Paquete | null> {
  try {
    const r = await fetch("/api/validacion/padron", { cache: "no-store" });
    if (!r.ok) return null;
    const p = (await r.json()) as Paquete;
    if (!p?.ok || !Array.isArray(p.gente)) return null;
    guardarJson(CLAVE_PADRON, p);
    return p;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------- identidad ----

/** El `pk` del QR de Luma, con las mismas formas que acepta el servidor. */
export function pkDeQr(texto: string): string {
  const t = String(texto ?? "").trim();
  if (!t) return "";
  if (/^g-[A-Za-z0-9]+$/.test(t)) return t;
  try {
    const pk = new URL(t).searchParams.get("pk");
    if (pk) return pk;
  } catch {
    // no era URL
  }
  const suelto = t.match(/[?&]pk=(g-[A-Za-z0-9]+)/);
  return suelto ? suelto[1] : "";
}

const DOMINIO_HABI = /@(?:[a-z0-9-]+\.)*habi(?:credit|capital|global|next)?\.(?:co|com|com\.co|mx)$/i;

type Credencial = { correo: string; sello: string };

function credencialDe(texto: string): Credencial | null {
  try {
    const u = new URL(String(texto ?? "").trim());
    const m = u.pathname.match(/^\/staff\/(.+)$/);
    if (!m) return null;
    return { correo: decodeURIComponent(m[1]).trim().toLowerCase(), sello: u.searchParams.get("k") ?? "" };
  } catch {
    return null;
  }
}

type PaseLeido = { tipo: "almuerzo" | "taller"; id: string; extra: string; sello: string };

function paseDe(texto: string): PaseLeido | null {
  try {
    const u = new URL(String(texto ?? "").trim());
    const partes = u.pathname.split("/").filter(Boolean);
    if (partes[0] !== "v" || partes.length < 3) return null;
    const tipo = partes[1] === "a" ? "almuerzo" : partes[1] === "t" ? "taller" : null;
    if (!tipo) return null;
    return {
      tipo,
      id: decodeURIComponent(partes[2] ?? ""),
      extra: partes[3] ? decodeURIComponent(partes[3]) : "",
      sello: u.searchParams.get("k") ?? "",
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------- el veredicto ----

/** Las marcas que este teléfono ya hizo, para no repetir el verde dos veces. */
const hechas = new Set<string>();

/**
 * Decide con lo que hay en el teléfono. Es la misma lógica del servidor, con
 * una diferencia: acá no se puede comprobar la firma de quien llega por el
 * dominio de Habi sin estar en la lista, así que se le cree y la marca va a la
 * cola para que el servidor lo confirme.
 */
export function validarLocal(texto: string, modo: Modo): Veredicto {
  const p = paqueteGuardado();
  if (!p) {
    return { ok: false, estado: "desconocido", detalle: "Sin señal y sin el padrón bajado. Conéctate una vez y vuelve a intentar.", local: true };
  }

  const pase = paseDe(texto);

  if (modo === "entrada" && pase) {
    return {
      ok: false,
      estado: "pase-equivocado",
      detalle: `Ese es el pase ${pase.tipo === "taller" ? "de un taller" : "del almuerzo"}. En la puerta va el QR de la entrada.`,
      local: true,
    };
  }

  if (modo !== "entrada") {
    if (!pase || (modo === "almuerzo") !== (pase.tipo === "almuerzo")) {
      return {
        ok: false,
        estado: "pase-equivocado",
        detalle: modo === "almuerzo" ? "Ese no es el pase del almuerzo." : "Ese no es el pase del taller.",
        local: true,
      };
    }
    const ficha = p.pases[pase.id];
    if (!ficha) return { ok: false, estado: "desconocido", detalle: "No encontramos esa reserva.", local: true };

    const esperado = pase.tipo === "almuerzo" ? ficha.ka : ficha.kt?.[pase.extra];
    if (!esperado || esperado !== pase.sello) {
      return { ok: false, estado: "desconocido", detalle: "Ese pase no es válido.", local: true };
    }
    if (pase.tipo === "almuerzo" && ficha.t === "general") {
      return { ok: false, estado: "no-es-vip", detalle: "El almuerzo va con la entrada VIP.", local: true };
    }

    const asistente = { id: pase.id, tipo: ficha.t, nombre: ficha.n, correo: "" };
    const llave = `${modo}:${pase.id}:${pase.extra}`;
    if (hechas.has(llave)) return { ok: true, estado: "repetido", asistente, local: true };
    hechas.add(llave);
    return {
      ok: true,
      estado: pase.tipo === "almuerzo" && !ficha.a ? "sin-turno" : "entra",
      asistente,
      marca: { en: new Date().toISOString() },
      local: true,
    };
  }

  // La puerta: credencial de equipo o QR de Luma.
  const cred = credencialDe(texto);
  if (cred) {
    const esperado = p.equipo[cred.correo];
    const deLaCasa = DOMINIO_HABI.test(cred.correo);
    if (!esperado && !deLaCasa) {
      return { ok: false, estado: "desconocido", detalle: "Esa credencial no es de las nuestras.", local: true };
    }
    if (esperado && esperado !== cred.sello) {
      return { ok: false, estado: "desconocido", detalle: "Esa credencial no está firmada bien.", local: true };
    }
    const fila = p.gente.find((g) => g[3]?.toLowerCase() === cred.correo);
    const asistente = { id: cred.correo, tipo: "equipo" as Tipo, nombre: fila?.[2] ?? cred.correo, correo: cred.correo };
    if (hechas.has(`entrada:${cred.correo}`)) return { ok: true, estado: "repetido", asistente, local: true };
    hechas.add(`entrada:${cred.correo}`);
    return { ok: true, estado: "entra", asistente, marca: { en: new Date().toISOString() }, local: true };
  }

  const pk = pkDeQr(texto);
  if (!pk) return { ok: false, estado: "desconocido", detalle: "Ese código no está en la lista.", local: true };
  const fila = p.gente.find((g) => g[0] === pk);
  if (!fila) return { ok: false, estado: "desconocido", detalle: "Ese código no está en la lista.", local: true };

  const asistente = { id: fila[0], tipo: fila[1], nombre: fila[2], correo: fila[3] };
  if (hechas.has(`entrada:${pk}`)) return { ok: true, estado: "repetido", asistente, local: true };
  hechas.add(`entrada:${pk}`);
  return { ok: true, estado: "entra", asistente, marca: { en: new Date().toISOString() }, local: true };
}

// ------------------------------------------------------------- la cola ----

export const cola = (): EnCola[] => leerJson<EnCola[]>(CLAVE_COLA) ?? [];

export function encolar(texto: string, modo: Modo, por: string): void {
  const c = cola();
  c.push({ texto, modo, por, en: new Date().toISOString() });
  // Mil marcas es más gente de la que cabe en el recinto: si llega a eso, algo
  // se rompió y conviene soltar lo viejo antes que perder lo que entra ahora.
  guardarJson(CLAVE_COLA, c.slice(-1000));
}

/** Manda lo que quedó pendiente. Devuelve cuántas salieron. */
export async function vaciarCola(): Promise<number> {
  const pendientes = cola();
  if (!pendientes.length) return 0;

  let salieron = 0;
  let i = 0;
  for (; i < pendientes.length; i++) {
    const m = pendientes[i];
    try {
      const r = await fetch("/api/validacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "validar", texto: m.texto, modo: m.modo, por: m.por }),
        signal: AbortSignal.timeout(8000),
      });
      // Un 4xx no se arregla reintentando: el código es inválido y lo único
      // que haría es trancar la cola detrás de él para siempre.
      if (!r.ok && r.status >= 500) break;
      salieron += 1;
    } catch {
      // Se volvió a caer: lo que queda se guarda para el próximo intento.
      break;
    }
  }

  guardarJson(CLAVE_COLA, pendientes.slice(i));
  return salieron;
}

// ------------------------------------------------------ la decisión ----

/**
 * Valida: el servidor primero, el teléfono si no contesta.
 *
 * Tres segundos de espera. Más que eso y quien escanea ya se preguntó si el
 * teléfono se trabó, que es cuando la gente empieza a tocar la pantalla y a
 * escanear dos veces.
 */
export async function validar(texto: string, modo: Modo, por: string): Promise<Veredicto> {
  try {
    const r = await fetch("/api/validacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "validar", texto, modo, por }),
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) throw new Error(String(r.status));
    const v = (await r.json()) as Veredicto;
    // Lo que el servidor ya sabe, el teléfono también: así un reintento local
    // después de que se caiga la señal dice «repetido» y no «adelante».
    if (v.asistente) hechas.add(`${modo}:${v.asistente.id}`);
    return v;
  } catch {
    const v = validarLocal(texto, modo);
    // Solo se encola lo que de verdad hay que contar.
    if (v.ok && v.estado !== "repetido") encolar(texto, modo, por);
    return v;
  }
}
