import { crearSiNoExiste, leer, listarRutas, modificar } from "./almacen";
import type { Tier } from "./registros";

/**
 * Códigos de invitación: quien tiene uno entra sin pagar.
 *
 * Son para los invitados de la casa —aliados, prensa, equipo, patrocinadores—
 * y por eso lo importante no es el descuento sino el control: cuántas entradas
 * regala cada código, hasta cuándo sirve, para qué boleta, y quién lo usó.
 * Un código sin cupo es una puerta abierta a que se reparta por ahí y el
 * evento se llene de entradas que nadie pagó.
 */

export type Codigo = {
  /** Siempre en mayúsculas y sin espacios: la gente lo escribe como quiere. */
  codigo: string;
  /** `ambos` deja que la persona elija con qué boleta entra. */
  sirvePara: Tier | "ambos";
  /** 0 = sin límite. */
  usosMaximos: number;
  usos: number;
  /** ISO, o null si no vence. */
  venceEl: string | null;
  activo: boolean;
  nota?: string;
  creadoEn: string;
  redenciones: { en: string; email: string; nombre: string; tier: Tier; token: string }[];
};

const ruta = (codigo: string) => `codigos/${normalizar(codigo)}.json`;

/**
 * Normaliza lo que la persona escribió. Nadie copia un código con el mismo
 * formato en el que se lo mandaron: llega con espacios, en minúscula, con
 * guiones de más. Todo eso es el mismo código.
 */
export function normalizar(codigo: string): string {
  return String(codigo ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

export async function traer(codigo: string): Promise<Codigo | null> {
  const limpio = normalizar(codigo);
  if (!limpio) return null;
  return leer<Codigo>(ruta(limpio));
}

export async function crear(datos: {
  codigo: string;
  sirvePara: Tier | "ambos";
  usosMaximos: number;
  venceEl: string | null;
  nota?: string;
}): Promise<{ ok: boolean; nota: string }> {
  const limpio = normalizar(datos.codigo);
  if (limpio.length < 4) return { ok: false, nota: "El código necesita al menos 4 caracteres" };

  const nuevo: Codigo = {
    codigo: limpio,
    sirvePara: datos.sirvePara,
    usosMaximos: Math.max(0, Math.trunc(datos.usosMaximos)),
    usos: 0,
    venceEl: datos.venceEl,
    activo: true,
    ...(datos.nota ? { nota: datos.nota } : {}),
    creadoEn: new Date().toISOString(),
    redenciones: [],
  };

  // Creación atómica: si el código ya existe no se pisa, porque pisarlo
  // devolvería a cero los usos de uno que ya está circulando.
  const gano = await crearSiNoExiste(ruta(limpio), nuevo);
  return gano
    ? { ok: true, nota: `Código ${limpio} creado` }
    : { ok: false, nota: `El código ${limpio} ya existe` };
}

export type Rechazo =
  | "no-existe"
  | "inactivo"
  | "vencido"
  | "sin-cupo"
  | "otra-boleta"
  | "repetido";

const EXPLICACION: Record<Rechazo, string> = {
  "no-existe": "Ese código no lo reconocemos. Revisa que esté completo.",
  inactivo: "Ese código ya no está activo.",
  vencido: "Ese código ya venció.",
  "sin-cupo": "Ese código ya se usó todas las veces que podía usarse.",
  "otra-boleta": "Ese código no aplica para esta boleta.",
  repetido: "Ya redimiste este código con ese correo. Revisa tu bandeja.",
};

export const explicar = (motivo: Rechazo): string => EXPLICACION[motivo];

/**
 * Toma un cupo del código, o dice por qué no.
 *
 * El cupo se descuenta **antes** de dar de alta a nadie en Luma. Es a
 * propósito: si el alta falla, sobra un cupo consumido —molesto pero
 * inofensivo, se arregla en el panel—, mientras que al revés dos personas
 * podrían llevarse la última entrada del código a la vez. La escritura es
 * condicional, así que cuando dos redenciones caen en el mismo instante la
 * segunda vuelve a leer y ve el cupo ya gastado.
 */
export async function tomarCupo(
  codigo: string,
  quien: { email: string; nombre: string; tier: Tier; token: string }
): Promise<{ ok: true; codigo: Codigo } | { ok: false; motivo: Rechazo }> {
  const limpio = normalizar(codigo);
  const actual = await traer(limpio);
  if (!actual) return { ok: false, motivo: "no-existe" };

  let motivo: Rechazo | null = null;
  const correo = quien.email.trim().toLowerCase();

  const resultado = await modificar<Codigo>(ruta(limpio), (c) => {
    if (!c) {
      motivo = "no-existe";
      return null;
    }
    if (!c.activo) {
      motivo = "inactivo";
      return null;
    }
    if (c.venceEl && Date.now() > new Date(c.venceEl).getTime()) {
      motivo = "vencido";
      return null;
    }
    if (c.sirvePara !== "ambos" && c.sirvePara !== quien.tier) {
      motivo = "otra-boleta";
      return null;
    }
    if (c.redenciones.some((r) => r.email.trim().toLowerCase() === correo)) {
      motivo = "repetido";
      return null;
    }
    if (c.usosMaximos > 0 && c.usos >= c.usosMaximos) {
      motivo = "sin-cupo";
      return null;
    }
    return {
      ...c,
      usos: c.usos + 1,
      redenciones: [
        ...c.redenciones,
        { en: new Date().toISOString(), email: correo, nombre: quien.nombre, tier: quien.tier, token: quien.token },
      ],
    };
  });

  if (!resultado) return { ok: false, motivo: motivo ?? "no-existe" };
  return { ok: true, codigo: resultado };
}

/** Devuelve el cupo cuando el alta en Luma no salió. */
export async function devolverCupo(codigo: string, token: string): Promise<void> {
  await modificar<Codigo>(ruta(normalizar(codigo)), (c) => {
    if (!c) return null;
    return {
      ...c,
      usos: Math.max(0, c.usos - 1),
      redenciones: c.redenciones.filter((r) => r.token !== token),
    };
  });
}

/**
 * Si un código sirve hoy, y por qué no. Se resuelve acá y no en la pantalla
 * porque es una regla de negocio —la misma que aplica `tomarCupo`— y porque el
 * render de React no puede leer el reloj.
 */
export type CodigoConEstado = Codigo & {
  agotado: boolean;
  vencido: boolean;
  utilizable: boolean;
};

export function conEstado(c: Codigo, ahora = Date.now()): CodigoConEstado {
  const agotado = c.usosMaximos > 0 && c.usos >= c.usosMaximos;
  const vencido = Boolean(c.venceEl && ahora > new Date(c.venceEl).getTime());
  return { ...c, agotado, vencido, utilizable: c.activo && !agotado && !vencido };
}

export async function todos(): Promise<CodigoConEstado[]> {
  const rutas = await listarRutas("codigos/", 500);
  const ahora = Date.now();
  const salida: CodigoConEstado[] = [];
  for (const r of rutas) {
    const c = await leer<Codigo>(r);
    if (c) salida.push(conEstado(c, ahora));
  }
  return salida.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export async function cambiarEstado(codigo: string, activo: boolean): Promise<boolean> {
  const res = await modificar<Codigo>(ruta(normalizar(codigo)), (c) =>
    c ? { ...c, activo } : null
  );
  return Boolean(res);
}
