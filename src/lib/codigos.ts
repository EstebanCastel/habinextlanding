import { randomInt } from "node:crypto";
import { borrar as borrarRuta, crearSiNoExiste, leer, listarRutas, modificar } from "./almacen";
import type { FilaInvitado } from "./excel";
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

/**
 * A quién se le entregó el código, según la lista del equipo.
 *
 * Es deliberadamente otra cosa que la redención: lo que dice el Excel es a
 * quién se le mandó, y lo que dice `redenciones` es quién lo usó de verdad. Las
 * dos pueden no coincidir —el código se reenvía, la persona entra con otro
 * correo— y verlas lado a lado es justamente lo que el panel necesita mostrar.
 */
export type Asignado = {
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  /** La columna «Invitado» de la lista: Habi Credit, Buyer, PAE… */
  grupo?: string;
  /** De qué archivo y de qué fila salió. */
  archivo: string;
  hoja?: string;
  fila?: number;
  asignadoEn: string;
};

export type Codigo = {
  /** Siempre en mayúsculas y sin espacios: la gente lo escribe como quiere. */
  codigo: string;
  asignado?: Asignado;
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

/**
 * Un código nuevo: `HABI-XXXX-XXXX`. Lo que va detrás del prefijo sale del
 * generador criptográfico y no de un contador, porque una numeración
 * correlativa se adivina (quien recibe el 0147 prueba el 0148). El alfabeto
 * excluye O, 0, I, 1 y L, que son los que la gente confunde al dictar un
 * código por teléfono o copiarlo de una foto.
 */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generar(prefijo = "HABI"): string {
  const bloque = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${prefijo}-${bloque()}-${bloque()}`;
}

export async function crear(datos: {
  /** Vacío = se genera uno. */
  codigo?: string;
  sirvePara: Tier | "ambos";
  usosMaximos: number;
  venceEl: string | null;
  nota?: string;
  asignado?: Asignado;
}): Promise<{ ok: boolean; nota: string; codigo?: string }> {
  const pedido = normalizar(datos.codigo ?? "");
  if (datos.codigo && pedido.length < 4) return { ok: false, nota: "El código necesita al menos 4 caracteres" };

  // Un código generado al azar puede chocar con uno que ya existe; es
  // improbable (31^8 combinaciones) pero no imposible, así que se reintenta.
  for (let intento = 0; intento < 5; intento++) {
    const limpio = pedido || generar();
    const nuevo: Codigo = {
      codigo: limpio,
      sirvePara: datos.sirvePara,
      usosMaximos: Math.max(0, Math.trunc(datos.usosMaximos)),
      usos: 0,
      venceEl: datos.venceEl,
      activo: true,
      ...(datos.nota ? { nota: datos.nota } : {}),
      ...(datos.asignado ? { asignado: datos.asignado } : {}),
      creadoEn: new Date().toISOString(),
      redenciones: [],
    };

    // Creación atómica: si el código ya existe no se pisa, porque pisarlo
    // devolvería a cero los usos de uno que ya está circulando.
    const gano = await crearSiNoExiste(ruta(limpio), nuevo);
    if (gano) return { ok: true, nota: `Código ${limpio} creado`, codigo: limpio };
    if (pedido) return { ok: false, nota: `El código ${limpio} ya existe` };
  }
  return { ok: false, nota: "No se pudo generar un código libre; vuelve a intentar" };
}

/**
 * Le pone (o le cambia) la persona de la lista a un código que ya existe. Si
 * viene `sirvePara`, también cambia la entrada, pero solo mientras nadie lo
 * haya usado: un código ya redimido es historia y no se reescribe.
 */
export async function asignar(codigo: string, asignado: Asignado, sirvePara?: Tier | "ambos"): Promise<boolean> {
  const res = await modificar<Codigo>(ruta(normalizar(codigo)), (c) =>
    c ? { ...c, asignado, ...(sirvePara && c.usos === 0 ? { sirvePara } : {}) } : null
  );
  return Boolean(res);
}

/** Le quita el dueño a un código sin usar, para que el barrido lo borre. */
export async function desasignar(codigo: string): Promise<boolean> {
  const res = await modificar<Codigo>(ruta(normalizar(codigo)), (c) => {
    if (!c || c.usos > 0) return null;
    const { asignado: _fuera, ...resto } = c;
    void _fuera;
    return resto;
  });
  return Boolean(res);
}

/**
 * Borra un código, pero solo si nadie lo usó. Un código redimido es la prueba
 * de que alguien entró con él y esa historia no se tira.
 *
 * Primero se desactiva con escritura condicional y después se borra: si
 * alguien está redimiendo ese código en ese mismo instante, una de las dos
 * escrituras pierde. Si pierde la nuestra, vemos `usos > 0` y no borramos; si
 * pierde la suya, vuelve a leer, encuentra el código inactivo y se le niega.
 * Sin ese paso, `del` a secas podría borrar un código justo después de que
 * alguien entró con él.
 */
export async function borrarCodigo(codigo: string): Promise<"borrado" | "redimido" | "no-existe"> {
  const limpio = normalizar(codigo);
  const apagado = await modificar<Codigo>(ruta(limpio), (c) => (c && c.usos === 0 ? { ...c, activo: false } : null));
  if (!apagado) {
    const c = await traer(limpio);
    return c ? "redimido" : "no-existe";
  }
  await borrarRuta(ruta(limpio));
  return "borrado";
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

export type ResumenCodigos = {
  total: number;
  redimidos: number;
  disponibles: number;
  asignados: number;
  sinAsignar: number;
  porTier: { general: { total: number; redimidos: number }; vip: { total: number; redimidos: number } };
};

/**
 * Las cuentas de los códigos.
 *
 * «Redimido» es haber gastado el cupo, no simplemente existir: un código de un
 * uso ya usado y uno de diez con diez usos cuentan igual, porque en los dos
 * casos ya no le sirven a nadie más.
 */
export function resumir(lista: CodigoConEstado[]): ResumenCodigos {
  const cuenta = (filtro: (c: CodigoConEstado) => boolean) => {
    const sub = lista.filter(filtro);
    return { total: sub.length, redimidos: sub.filter((c) => c.usos > 0).length };
  };
  const redimidos = lista.filter((c) => c.usos > 0).length;
  return {
    total: lista.length,
    redimidos,
    disponibles: lista.filter((c) => c.utilizable).length,
    asignados: lista.filter((c) => c.asignado).length,
    sinAsignar: lista.filter((c) => !c.asignado && c.usos === 0).length,
    porTier: {
      general: cuenta((c) => c.sirvePara === "general" || c.sirvePara === "ambos"),
      vip: cuenta((c) => c.sirvePara === "vip" || c.sirvePara === "ambos"),
    },
  };
}

/** Planilla de códigos, para repartir y para revisar quién ya entró. */
export function aCsv(lista: CodigoConEstado[], sitio: string): string {
  // Una celda que empieza por =, @, + o - la abre Excel como fórmula; un nombre
  // escrito con mala intención en el formulario público llegaría a la planilla
  // del equipo como código ejecutable. Se le antepone un apóstrofo, que Excel
  // entiende como «texto». Los teléfonos con + se dejan: +57… es un número.
  const celda = (v: unknown) => {
    const t = String(v ?? "");
    const peligrosa = /^[=@]/.test(t) || (/^[+-]/.test(t) && /[^\d\s+-]/.test(t));
    return `"${(peligrosa ? `'${t}` : t).replace(/"/g, '""')}"`;
  };
  const cab = [
    "Código", "Entrada", "Estado",
    "Asignado a", "Apellido", "Correo asignado", "Teléfono", "Invitado",
    "Redimido por", "Correo de quien lo usó", "Cuándo",
    "Link para redimir", "Nota",
  ];
  const filas = lista.map((c) => {
    const r = c.redenciones[0];
    const a = c.asignado;
    const tier = c.sirvePara === "ambos" ? "general" : c.sirvePara;
    return [
      c.codigo,
      c.sirvePara === "vip" ? "VIP" : c.sirvePara === "ambos" ? "Las dos" : "General",
      c.usos > 0 ? "Redimido" : !c.activo ? "Desactivado" : c.vencido ? "Vencido" : "Disponible",
      a?.nombre ?? "",
      a?.apellido ?? "",
      a?.email ?? "",
      a?.telefono ?? "",
      a?.grupo ?? "",
      r?.nombre ?? "",
      r?.email ?? "",
      r ? r.en.slice(0, 16).replace("T", " ") : "",
      `${sitio}/codigo?tier=${tier}&codigo=${c.codigo}`,
      c.nota ?? "",
    ].map(celda).join(";");
  });
  return "\ufeff" + [cab.map(celda).join(";"), ...filas].join("\r\n");
}

export async function todos(): Promise<CodigoConEstado[]> {
  const rutas = await listarRutas("codigos/", 2000);
  const ahora = Date.now();
  const salida: CodigoConEstado[] = [];

  // En tandas y no de a uno: con ochocientos códigos, leerlos en fila son
  // ochocientas idas y vueltas al almacén y el panel tarda minutos en abrir.
  const TANDA = 40;
  for (let i = 0; i < rutas.length; i += TANDA) {
    const trozo = await Promise.all(rutas.slice(i, i + TANDA).map((r) => leer<Codigo>(r)));
    for (const c of trozo) if (c) salida.push(conEstado(c, ahora));
  }

  // Los redimidos primero y, dentro de cada grupo, lo más reciente arriba: lo
  // que se mira es quién acaba de entrar.
  return salida.sort((a, b) => {
    const ra = a.redenciones[0]?.en ?? "";
    const rb = b.redenciones[0]?.en ?? "";
    if (ra && rb) return rb.localeCompare(ra);
    if (ra !== rb) return ra ? -1 : 1;
    return a.codigo.localeCompare(b.codigo);
  });
}

export async function cambiarEstado(codigo: string, activo: boolean): Promise<boolean> {
  const res = await modificar<Codigo>(ruta(normalizar(codigo)), (c) =>
    c ? { ...c, activo } : null
  );
  return Boolean(res);
}

export type InformeImportacion = {
  archivo: string;
  hojasLeidas: string[];
  hojasIgnoradas: string[];
  filas: number;
  creados: number;
  yaTenian: number;
  actualizados: number;
  /** Ya entraron con un código que figura a nombre de otra persona: no se les da otro. */
  entraronConOtro: number;
  sinCorreo: number;
  repetidosEnLista: number;
  liberados: number;
  borrados: number;
  fallos: string[];
};

const mismosDatos = (a: Asignado, b: Asignado) =>
  a.email === b.email &&
  a.nombre === b.nombre &&
  (a.apellido ?? "") === (b.apellido ?? "") &&
  (a.telefono ?? "") === (b.telefono ?? "") &&
  (a.grupo ?? "") === (b.grupo ?? "");

/** El lote de códigos generado el 17-sep, antes de que existiera la asignación: son los únicos «sobrantes». */
const esDelLote = (c: Codigo) => c.codigo.startsWith("HABI-") && (!c.nota || /^referido\b/i.test(c.nota));

/** Corre tareas de a tantas: cientos de escrituras en fila se pasan del tiempo de la función. */
async function porTandas<T>(items: T[], tanda: number, fn: (x: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += tanda) await Promise.all(items.slice(i, i + tanda).map(fn));
}

/**
 * Cruza la lista del equipo con los códigos que existen y deja a cada persona
 * con uno.
 *
 * La llave es el correo. Quien ya tenga un código asignado conserva ese (y se
 * le corrigen nombre, teléfono, grupo o entrada si cambiaron en la hoja);
 * quien ya entró con un código que está a nombre de otra persona no recibe
 * otro; quien no tiene nada recibe uno nuevo de la entrada que diga su fila.
 * Si la fila trae un código escrito, se respeta siempre que no sea de otra
 * persona ni lo haya usado alguien más. Al final se borran los códigos del
 * lote original que quedaron sin dueño y sin usar, porque un código suelto es
 * una entrada regalada esperando a que alguien la encuentre; los redimidos,
 * los desactivados a propósito, los creados a mano en el panel y los del
 * experimento (otro prefijo) no se tocan.
 *
 * Primero se decide todo en memoria y después se escribe por tandas: así la
 * lógica no depende del orden en que responda el almacén y las cuatrocientas
 * escrituras caben en el tiempo de la función.
 */
export async function importar(
  filas: FilaInvitado[],
  archivo: string,
  opciones: {
    borrarSobrantes?: boolean;
    simular?: boolean;
    /** Para probar la lógica sin almacén: el estado de partida. */
    existentes?: CodigoConEstado[];
    hojasLeidas?: string[];
    hojasIgnoradas?: string[];
    sinCorreo?: number;
  } = {}
): Promise<InformeImportacion> {
  const informe: InformeImportacion = {
    archivo,
    hojasLeidas: opciones.hojasLeidas ?? [],
    hojasIgnoradas: opciones.hojasIgnoradas ?? [],
    filas: filas.length,
    creados: 0,
    yaTenian: 0,
    actualizados: 0,
    entraronConOtro: 0,
    sinCorreo: opciones.sinCorreo ?? 0,
    repetidosEnLista: 0,
    liberados: 0,
    borrados: 0,
    fallos: [],
  };
  const seco = Boolean(opciones.simular);
  const ahora = new Date().toISOString();

  const existentes = opciones.existentes ?? (await todos());
  const porCodigo = new Map(existentes.map((c) => [c.codigo, c]));
  /** Correo → código que tiene asignado. */
  const porCorreo = new Map<string, CodigoConEstado>();
  /** Correo → código con el que ya redimió (puede estar a nombre de otro). */
  const redimioCon = new Map<string, CodigoConEstado>();
  for (const c of existentes) {
    if (c.asignado?.email) porCorreo.set(c.asignado.email.toLowerCase(), c);
    for (const r of c.redenciones) if (!redimioCon.has(r.email.toLowerCase())) redimioCon.set(r.email.toLowerCase(), c);
  }

  // Lo que hay que escribir, decidido en memoria.
  const asignaciones: { codigo: string; asignado: Asignado; tier?: Tier }[] = [];
  const creaciones: { codigo?: string; tier: Tier; asignado: Asignado }[] = [];
  const liberaciones: string[] = [];

  const liberar = (c: CodigoConEstado) => {
    // Esta persona pasa a otro código: el anterior, si nadie lo usó, queda sin dueño y el barrido lo borra.
    if (c.usos > 0 || !c.asignado) return;
    porCorreo.delete(c.asignado.email.toLowerCase());
    c.asignado = undefined;
    liberaciones.push(c.codigo);
    informe.liberados += 1;
  };
  const poner = (c: CodigoConEstado, asignado: Asignado, tier: Tier) => {
    const previoEn = c.asignado?.asignadoEn;
    const cambiaEntrada = c.usos === 0 && c.sirvePara !== tier;
    c.asignado = { ...asignado, asignadoEn: previoEn ?? ahora };
    if (cambiaEntrada) c.sirvePara = tier;
    porCorreo.set(asignado.email, c);
    asignaciones.push({ codigo: c.codigo, asignado: c.asignado, ...(cambiaEntrada ? { tier } : {}) });
  };

  const vistos = new Set<string>();
  for (const f of filas) {
    if (vistos.has(f.email)) {
      informe.repetidosEnLista += 1;
      continue;
    }
    vistos.add(f.email);

    const asignado: Asignado = {
      nombre: f.nombre,
      ...(f.apellido ? { apellido: f.apellido } : {}),
      email: f.email,
      ...(f.telefono ? { telefono: f.telefono } : {}),
      ...(f.grupo ? { grupo: f.grupo } : {}),
      archivo,
      hoja: f.hoja,
      fila: f.fila,
      asignadoEn: ahora,
    };
    const actual = porCorreo.get(f.email);
    const pedido = normalizar(f.codigo);

    // 1) La fila trae un código escrito.
    if (pedido) {
      const c = porCodigo.get(pedido);
      if (c) {
        if (c.usos > 0 && !c.redenciones.some((r) => r.email.toLowerCase() === f.email)) {
          informe.fallos.push(`${f.email}: ${pedido} ya lo usó otra persona`);
          continue;
        }
        if (c.asignado && c.asignado.email.toLowerCase() !== f.email) {
          informe.fallos.push(`${f.email}: ${pedido} está a nombre de ${c.asignado.email}`);
          continue;
        }
        if (actual && actual !== c) liberar(actual);
        if (c.asignado && mismosDatos(c.asignado, asignado) && (c.usos > 0 || c.sirvePara === f.tier)) {
          informe.yaTenian += 1;
        } else {
          poner(c, asignado, f.tier);
          informe.actualizados += 1;
        }
        continue;
      }
      // No existe: se crea con ese código.
      if (actual) liberar(actual);
      creaciones.push({ codigo: pedido, tier: f.tier, asignado });
      porCorreo.set(f.email, conEstado({ codigo: pedido, sirvePara: f.tier, usosMaximos: 1, usos: 0, venceEl: null, activo: true, asignado, creadoEn: ahora, redenciones: [] }));
      continue;
    }

    // 2) Ya tiene uno asignado: se conserva y se corrigen datos si cambiaron.
    if (actual) {
      if (actual.asignado && mismosDatos(actual.asignado, asignado) && (actual.usos > 0 || actual.sirvePara === f.tier)) {
        informe.yaTenian += 1;
      } else {
        poner(actual, asignado, f.tier);
        informe.actualizados += 1;
      }
      continue;
    }

    // 3) Ya entró con algún código.
    const entroCon = redimioCon.get(f.email);
    if (entroCon) {
      if (!entroCon.asignado) {
        // Era un código sin dueño: ahora consta que es suyo.
        poner(entroCon, asignado, f.tier);
        informe.actualizados += 1;
      } else {
        // El código es de otra persona y se lo reenviaron: ya está adentro, no se le da otro.
        informe.entraronConOtro += 1;
      }
      continue;
    }

    // 4) Nuevo: código nuevo de su entrada.
    const codigo = generar();
    creaciones.push({ tier: f.tier, asignado });
    porCorreo.set(f.email, conEstado({ codigo, sirvePara: f.tier, usosMaximos: 1, usos: 0, venceEl: null, activo: true, asignado, creadoEn: ahora, redenciones: [] }));
  }

  // ---- escrituras, por tandas ----
  if (!seco) {
    await porTandas(asignaciones, 20, async (a) => {
      if (!(await asignar(a.codigo, a.asignado, a.tier))) informe.fallos.push(`${a.asignado.email}: no se pudo asignar ${a.codigo}`);
    });
    await porTandas(liberaciones, 20, async (codigo) => {
      if (!(await desasignar(codigo))) informe.fallos.push(`${codigo}: no se pudo liberar`);
    });
  }
  await porTandas(creaciones, 20, async (n) => {
    const r = seco ? { ok: true, nota: "" } : await crear({ codigo: n.codigo, sirvePara: n.tier, usosMaximos: 1, venceEl: null, asignado: n.asignado });
    if (r.ok) informe.creados += 1;
    else informe.fallos.push(`${n.asignado.email}: ${r.nota}`);
  });

  if (opciones.borrarSobrantes !== false) {
    const sobrantes = existentes.filter((c) => !c.asignado && c.usos === 0 && c.activo && esDelLote(c));
    await porTandas(sobrantes, 20, async (c) => {
      if (seco || (await borrarCodigo(c.codigo)) === "borrado") informe.borrados += 1;
    });
  }

  return informe;
}
