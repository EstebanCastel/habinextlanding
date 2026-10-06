import readXlsxFile from "read-excel-file/node";
import type { Tier } from "./registros";

/**
 * La lista de invitados que trae el equipo.
 *
 * Llega como el Excel de asistencia, con una hoja por entrada (VIP, General)
 * y las columnas Nombre · Apellido · Correo · Número · Tipo de entrada ·
 * Invitado · Código. No se exige ese orden ni esos títulos exactos: se busca
 * cada columna por lo que dice la cabecera, porque la hoja la arma gente
 * distinta cada semana y nadie la va a dejar idéntica. Lo que sí se exige es
 * que la hoja hable de entradas: una pestaña de brokers pegada al lado, con
 * nombre y correo pero sin «tipo de entrada», no es una lista de invitados y
 * se deja de lado en vez de regalarle entradas a todo el mundo.
 */

export type FilaInvitado = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  tier: Tier;
  /** La columna «Invitado»: de qué grupo viene (Habi Credit, Buyer, PAE…). */
  grupo: string;
  /** Si la hoja ya traía un código en la fila, se respeta. */
  codigo: string;
  hoja: string;
  fila: number;
};

export type Lectura = {
  filas: FilaInvitado[];
  hojasLeidas: string[];
  hojasIgnoradas: string[];
  /** Filas que no tenían correo y por eso no se pueden asignar. */
  sinCorreo: number;
};

const llano = (t: unknown) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

type Columnas = { nombre?: number; apellido?: number; email?: number; telefono?: number; tier?: number; grupo?: number; codigo?: number };

/**
 * Cada columna se busca por prioridad y no por orden de aparición: «Tipo de
 * entrada» gana a «Entrada confirmada», y «Número de celular» gana a «Número
 * de documento». Una cabecera que ya se usó no se vuelve a usar.
 */
const REGLAS: { campo: keyof Columnas; acepta: RegExp; rechaza?: RegExp }[] = [
  { campo: "email", acepta: /(correo|e-?mail)/ },
  { campo: "tier", acepta: /tipo de entrada|^entrada$|^tier$|^boleta$|^tipo$/ },
  { campo: "codigo", acepta: /^codigo/ },
  { campo: "apellido", acepta: /apellido/ },
  { campo: "telefono", acepta: /(telefono|celular|whatsapp|movil)/, rechaza: /(documento|cedula|nit|identificacion)/ },
  { campo: "telefono", acepta: /^numero$|numero de (celular|telefono|whatsapp|contacto)/ },
  { campo: "grupo", acepta: /^(invitado|grupo|empresa|origen|equipo|procedencia)/ },
  { campo: "nombre", acepta: /nombre/, rechaza: /(empresa|usuario|archivo)/ },
];

function detectar(cabecera: unknown[]): Columnas {
  const c: Columnas = {};
  const usadas = new Set<number>();
  const textos = cabecera.map(llano);
  for (const regla of REGLAS) {
    if (c[regla.campo] !== undefined) continue;
    const i = textos.findIndex((t, k) => t && !usadas.has(k) && regla.acepta.test(t) && !(regla.rechaza && regla.rechaza.test(t)));
    if (i >= 0) {
      c[regla.campo] = i;
      usadas.add(i);
    }
  }
  return c;
}

/** Primero lo que dice la celda; si no dice VIP ni General, lo que dice la hoja. */
function tierDe(texto: unknown, hoja: string): Tier | null {
  for (const t of [llano(texto), llano(hoja)]) {
    if (/vip/.test(t)) return "vip";
    if (/general/.test(t)) return "general";
  }
  return null;
}

const celda = (fila: unknown[], i?: number) => (i === undefined ? "" : String(fila[i] ?? "").trim());

function filasDe(hoja: string, datos: unknown[][]): { filas: FilaInvitado[]; sinCorreo: number } | null {
  const idx = datos.findIndex((f) => f.some((v) => /(correo|e-?mail)/.test(llano(v))));
  if (idx < 0) return null;
  const col = detectar(datos[idx]);
  // Sin columna de entrada y sin que la hoja se llame VIP o General no es una lista de invitados.
  if (col.email === undefined || (col.tier === undefined && !tierDe("", hoja))) return null;

  const filas: FilaInvitado[] = [];
  let sinCorreo = 0;
  datos.slice(idx + 1).forEach((f, n) => {
    if (!f.some((v) => String(v ?? "").trim())) return;
    const email = celda(f, col.email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sinCorreo += 1;
      return;
    }
    const tier = tierDe(celda(f, col.tier), hoja) ?? "general";
    filas.push({
      nombre: celda(f, col.nombre).replace(/\s+/g, " "),
      apellido: celda(f, col.apellido).replace(/\s+/g, " "),
      email,
      // Solo dígitos: el «+» y los espacios con que la gente escribe un celular
      // no son parte del número, y el formulario de redención lleva el +57 aparte.
      telefono: celda(f, col.telefono).replace(/\D/g, ""),
      tier,
      grupo: celda(f, col.grupo),
      codigo: celda(f, col.codigo),
      hoja,
      fila: idx + n + 2,
    });
  });
  return { filas, sinCorreo };
}

export async function leerExcel(bytes: Buffer): Promise<Lectura> {
  // Una sola lectura trae todas las hojas, cada una con su nombre y sus filas.
  const hojas = await readXlsxFile(bytes);
  const salida: Lectura = { filas: [], hojasLeidas: [], hojasIgnoradas: [], sinCorreo: 0 };
  for (const { sheet: hoja, data } of hojas) {
    const r = filasDe(hoja, data as unknown[][]);
    if (!r) {
      salida.hojasIgnoradas.push(hoja);
      continue;
    }
    salida.hojasLeidas.push(hoja);
    salida.filas.push(...r.filas);
    salida.sinCorreo += r.sinCorreo;
  }
  return salida;
}

/** Un CSV sencillo (el de Luma, o uno guardado desde Excel) por si no llega .xlsx. */
export function leerCsv(texto: string, nombre = "CSV"): Lectura {
  const sep = (texto.match(/;/g)?.length ?? 0) > (texto.match(/,/g)?.length ?? 0) ? ";" : ",";
  const filas: unknown[][] = [];
  for (const linea of texto.replace(/^﻿/, "").split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const campos: string[] = [];
    let actual = "";
    let entreComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (ch === '"') {
        if (entreComillas && linea[i + 1] === '"') {
          actual += '"';
          i++;
        } else entreComillas = !entreComillas;
      } else if (ch === sep && !entreComillas) {
        campos.push(actual);
        actual = "";
      } else actual += ch;
    }
    campos.push(actual);
    filas.push(campos);
  }
  const r = filasDe(nombre, filas);
  return r
    ? { filas: r.filas, hojasLeidas: [nombre], hojasIgnoradas: [], sinCorreo: r.sinCorreo }
    : { filas: [], hojasLeidas: [], hojasIgnoradas: [nombre], sinCorreo: 0 };
}

/** Decide por la extensión y el contenido; `.xlsx` es un zip y empieza por `PK`. */
export async function leerLista(nombre: string, bytes: Buffer): Promise<Lectura> {
  const esZip = bytes.length > 1 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (esZip || /\.xlsx?$/i.test(nombre)) return leerExcel(bytes);
  return leerCsv(bytes.toString("utf8"), nombre.replace(/\.csv$/i, ""));
}
