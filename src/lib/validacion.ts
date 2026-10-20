import { escribir, leer, listarRutas } from "./almacen";
import { esDelEquipo, fichaDeEquipo, selloDeEquipo } from "@/config/equipo";
import { ALMUERZOS, SESIONES } from "@/config/agenda";
import { leerPase } from "./pases";
import { porId } from "./experiencia";
import { eventoDeTier } from "./luma";

/**
 * La puerta: un solo lector para las tres entradas.
 *
 * El día del evento llegan tres cosas distintas a la misma fila —la entrada
 * General, la VIP y la credencial del equipo— y hasta ahora cada una se leía
 * con su propia herramienta. Eso obliga a adivinar qué es cada quien antes de
 * escanear, y en una fila de seiscientas personas eso no escala. Acá se lee
 * cualquiera de las tres y el sistema decide qué es.
 *
 * **Por qué el check-in no vive en Luma.** Su API pública no tiene endpoint de
 * check-in: deja crear invitados, cambiar su estado y sus tickets, nada más.
 * Así que el registro de quién entró es nuestro. Eso además resuelve el caso
 * del equipo, que no existe en Luma.
 *
 * El padrón se arma una vez y se guarda: pedirle la lista a Luma en cada
 * escaneo serían catorce llamadas por persona en la puerta. Se refresca solo
 * cuando se le pide.
 */

// ------------------------------------------------------------- tipos ----

export type Tipo = "general" | "vip" | "equipo";
export type Modo = "entrada" | "almuerzo" | "taller";

export type Asistente = {
  /** Lo que identifica el QR: el `pk` de Luma, o el correo para el equipo. */
  id: string;
  tipo: Tipo;
  nombre: string;
  correo: string;
  /** El cargo, solo para el equipo. */
  cargo?: string;
  /** Cuenta de prueba: se escanea igual, pero no cuenta en el padrón. */
  prueba?: boolean;
  /** Registrado pero sin aprobar en Luma. Entra igual; queda anotado. */
  pendiente?: boolean;
};

/**
 * Las cuentas con las que se revisa que todo funcione.
 *
 * Se escanean como cualquiera —ese es el punto— pero no entran en el
 * denominador: si el padrón dice «742 con entrada» ese número tiene que ser
 * el de gente de verdad, no el de gente más tres pruebas.
 */
const esPrueba = (correo: string) => /prueba|ejemplo|estebancastelblanco\+/i.test(correo);

export type Marca = {
  id: string;
  tipo: Tipo;
  nombre: string;
  correo: string;
  en: string;
  por: string;
  modo: Modo;
  /** El turno de almuerzo, cuando la marca es del restaurante. */
  turno?: string;
  /** El taller, cuando la marca es de la puerta del Salón Taller. */
  taller?: string;
};

export type Veredicto =
  | { ok: true; estado: "entra"; asistente: Asistente; marca: Marca; turno?: TurnoVista }
  | { ok: true; estado: "repetido"; asistente: Asistente; marca: Marca; previa: Marca }
  | { ok: false; estado: "desconocido"; detalle: string }
  | { ok: true; estado: "sin-turno"; asistente: Asistente; marca: Marca }
  | { ok: false; estado: "no-es-vip"; asistente: Asistente; detalle: string }
  | { ok: false; estado: "fuera-de-turno"; asistente: Asistente; turno: TurnoVista; detalle: string }
  | { ok: false; estado: "pase-equivocado"; detalle: string }
  | { ok: false; estado: "sin-reserva"; asistente: Asistente; detalle: string };

export type TurnoVista = { id: string; rotulo: string; desde: string; hasta: string };

export type Conteo = {
  general: number;
  vip: number;
  equipo: number;
  total: number;
  /** Cuántos hay en el padrón, para saber contra qué se compara. */
  padron: { general: number; vip: number; equipo: number; total: number };
  almuerzo: { total: number; porTurno: Record<string, number> };
  taller: { total: number; porSesion: Record<string, number> };
  actualizadoEn: string;
};

// ------------------------------------------------------------ rutas ----

const RUTA_PADRON = "validacion/padron.json";
/**
 * El tipo va en el nombre del archivo, no dentro: así el conteo es listar
 * rutas y mirar el prefijo, sin abrir setecientos documentos uno por uno.
 *
 * Las cuentas de prueba llevan su propia marca en el nombre por lo mismo. En
 * la mañana del evento alguien va a probar el lector antes de abrir —hay que
 * probarlo— y cada prueba dejaba el contador en uno, dos, tres. El tablero de
 * la puerta tiene que decir cuánta gente entró, no cuántas veces lo probamos.
 */
const rutaMarca = (modo: Modo, tipo: Tipo, id: string, prueba = false) =>
  `validacion/${modo}/${tipo}__${prueba ? "prueba__" : ""}${id.replace(/[^A-Za-z0-9._@-]/g, "_")}.json`;

// ----------------------------------------------------------- padrón ----

type Padron = { armadoEn: string; gente: Asistente[] };

/**
 * Arma el padrón desde Luma y desde la lista del equipo.
 *
 * Solo entran los aprobados: alguien pendiente o rechazado no debe pasar, y
 * dejarlo en el padrón obligaría a comprobar su estado en cada escaneo.
 *
 * El identificador es el `pk` del QR de Luma y no el id del invitado, porque
 * es lo único que viaja dentro del código que se escanea.
 */
export async function armarPadron(): Promise<Padron> {
  const { listarInvitadosConQr } = await import("./luma");
  const { nombreCorregido } = await import("@/config/nombres");
  const eventos: [Tipo, string | undefined][] = [
    ["general", eventoDeTier("general")],
    ["vip", eventoDeTier("vip")],
  ];

  const gente: Asistente[] = [];
  for (const [tipo, evento] of eventos) {
    if (!evento) continue;
    for (const g of await listarInvitadosConQr(evento)) {
      // Aprobados y **pendientes de aprobar**. Un pendiente es alguien que ya
      // se registró y a quien Luma ya le dio un QR: que esté esperando una
      // aprobación nuestra es un asunto administrativo, y descubrirlo cuando
      // ya está parado en la puerta no lo arregla. Entra, y queda marcado.
      if (g.estado !== "approved" && g.estado !== "pending_approval") continue;
      const id = pkDeQr(g.qr) || g.id;
      if (!id) continue;
      gente.push({
        id,
        tipo,
        nombre: nombreCorregido(g.email) ?? g.nombre ?? g.email,
        correo: g.email,
        ...(g.estado === "pending_approval" ? { pendiente: true } : {}),
        ...(esPrueba(g.email) ? { prueba: true } : {}),
      });
    }
  }

  const { EQUIPO } = await import("@/config/equipo");
  for (const c of EQUIPO) {
    gente.push({
      id: c.email.trim().toLowerCase(),
      tipo: "equipo",
      nombre: `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim() || c.email,
      correo: c.email,
      ...(c.cargo ? { cargo: c.cargo } : {}),
      ...(esPrueba(c.email) ? { prueba: true } : {}),
    });
  }

  const padron: Padron = { armadoEn: new Date().toISOString(), gente };
  await escribir(RUTA_PADRON, padron);
  return padron;
}

export async function traerPadron(): Promise<Padron | null> {
  return leer<Padron>(RUTA_PADRON);
}

/** El padrón guardado, o uno recién armado si nunca se armó. */
async function padronVigente(): Promise<Padron> {
  return (await traerPadron()) ?? (await armarPadron());
}

// -------------------------------------------------------- identidad ----

/**
 * El `pk` del QR de Luma: `https://luma.com/check-in/evt-XXX?pk=g-YYY`.
 *
 * Se acepta la URL completa o el `pk` suelto, porque algunos lectores
 * devuelven solo el parámetro y porque en la puerta alguien puede teclearlo
 * a mano si la cámara no coopera.
 */
export function pkDeQr(texto: string): string {
  const t = String(texto ?? "").trim();
  if (!t) return "";
  if (/^g-[A-Za-z0-9]+$/.test(t)) return t;
  try {
    const u = new URL(t);
    const pk = u.searchParams.get("pk");
    if (pk) return pk;
  } catch {
    // no era una URL; se sigue con las otras formas
  }
  const suelto = t.match(/[?&]pk=(g-[A-Za-z0-9]+)/);
  return suelto ? suelto[1] : "";
}

/**
 * El correo de una credencial de equipo, si la firma cuadra.
 *
 * Sin comprobar el sello cualquiera podría escribir la dirección de otro y
 * entrar como staff, que es justo lo que el HMAC existe para impedir.
 */
export function correoDeCredencial(texto: string, secreto: string): string {
  if (!secreto) return "";
  try {
    const u = new URL(String(texto ?? "").trim());
    const m = u.pathname.match(/^\/staff\/(.+)$/);
    if (!m) return "";
    const correo = decodeURIComponent(m[1]).trim().toLowerCase();
    const k = u.searchParams.get("k") ?? "";
    if (!correo || !k || !esDelEquipo(correo)) return "";
    return k === selloDeEquipo(correo, secreto) ? correo : "";
  } catch {
    return "";
  }
}

/** A quién corresponde lo que se escaneó, o null si no es de los nuestros. */
export async function identificar(texto: string, secreto: string): Promise<Asistente | null> {
  const correo = correoDeCredencial(texto, secreto);
  if (correo) {
    const f = fichaDeEquipo(correo);
    return {
      id: correo,
      tipo: "equipo",
      nombre: `${f?.nombre ?? ""} ${f?.apellido ?? ""}`.trim() || correo,
      correo,
      ...(f?.cargo ? { cargo: f.cargo } : {}),
    };
  }

  const pk = pkDeQr(texto);
  if (!pk) return null;
  const padron = await padronVigente();
  return padron.gente.find((p) => p.id === pk) ?? null;
}

// ------------------------------------------------------- validación ----

const turnoVista = (id: string): TurnoVista | undefined => {
  const t = ALMUERZOS.find((x) => x.id === id);
  return t ? { id: t.id, rotulo: t.rotulo, desde: t.desde, hasta: t.hasta } : undefined;
};

/**
 * Lee un QR y decide. Nunca lanza: en la puerta un error sin respuesta deja a
 * la persona parada sin saber qué pasó.
 *
 * En modo `almuerzo` el filtro es más estrecho: solo pasa quien tiene entrada
 * VIP y además escogió turno. El equipo pasa siempre —trabaja el evento y
 * come con el resto— y la General no, porque el almuerzo va con la VIP.
 */
export async function validar(
  texto: string,
  opciones: { modo: Modo; por: string; secreto: string }
): Promise<Veredicto> {
  // Adentro se usan pases propios —el del almuerzo y el de cada taller— y en
  // la puerta el de Luma. Enseñar el que no es tiene que decirlo con esas
  // palabras: un «no está en la lista» ahí manda a buscar un problema que no
  // existe.
  const pase = leerPase(texto, opciones.secreto);

  if (opciones.modo === "entrada" && pase) {
    return {
      ok: false,
      estado: "pase-equivocado",
      detalle: `Ese es el pase ${pase.tipo === "taller" ? "de un taller" : "del almuerzo"}. En la puerta va el QR de la entrada.`,
    };
  }

  if (opciones.modo !== "entrada") {
    if (!pase) {
      return {
        ok: false,
        estado: "pase-equivocado",
        detalle:
          opciones.modo === "almuerzo"
            ? "Ese no es el pase del almuerzo. Está en habinext.com/experiencia, en «Mi almuerzo»."
            : "Ese no es el pase del taller. Está en habinext.com/experiencia, en «Mis talleres».",
      };
    }
    if ((opciones.modo === "almuerzo") !== (pase.tipo === "almuerzo")) {
      return {
        ok: false,
        estado: "pase-equivocado",
        detalle: `Ese es el pase ${pase.tipo === "taller" ? "de un taller" : "del almuerzo"}, no el de acá.`,
      };
    }
    return validarPase(pase, opciones);
  }

  // La puerta no rechaza gente.
  //
  // El padrón se arma cada tanto y Luma cambia todo el día: alguien que
  // redimió hace dos minutos, el que estaba pendiente de aprobar, el que se
  // creó en otra pantalla. Todos esos tienen un QR legítimo y, si el lector
  // les dice «no está en la lista», la persona se queda parada mientras
  // alguien busca su correo en un panel. Eso es lo que no puede pasar con
  // ochocientas personas entrando a la misma hora.
  //
  // Así que si no está en el padrón se busca en Luma en vivo, y si tampoco
  // aparece **entra igual**, marcado en ámbar. Dejar pasar a uno de más es
  // barato; dejar a uno de menos afuera, no.
  let asistente = await identificar(texto, opciones.secreto).catch(() => null);
  let invitado = false;

  if (!asistente) {
    const pk = pkDeQr(texto);
    if (pk) {
      asistente = await buscarEnVivo(pk).catch(() => null);
      if (asistente) invitado = true;
    }
    if (!asistente) {
      // Ni en el padrón ni en Luma. Pasa igual y queda el registro.
      asistente = {
        id: pk || `suelto:${texto.slice(0, 60)}`,
        tipo: "general",
        nombre: "Sin identificar",
        correo: "",
        pendiente: true,
      };
      invitado = true;
    }
  }

  const marca: Marca = {
    id: asistente.id,
    tipo: asistente.tipo,
    nombre: asistente.nombre,
    correo: asistente.correo,
    en: new Date().toISOString(),
    por: opciones.por,
    modo: "entrada",
  };

  const ruta = rutaMarca("entrada", asistente.tipo, asistente.id, esPrueba(asistente.correo));
  const previa = await leer<Marca>(ruta).catch(() => null);
  if (previa) return { ok: true, estado: "repetido", asistente, marca, previa };

  await escribir(ruta, marca);
  return {
    ok: true,
    estado: "entra",
    asistente,
    marca,
    ...(asistente.pendiente || invitado
      ? {
          detalle: asistente.correo
            ? "Estaba pendiente de aprobar. Déjalo pasar; queda anotado."
            : "No lo encontramos en la lista. Déjalo pasar y que pase por la mesa de registro.",
        }
      : {}),
  };
}

/**
 * Busca a alguien en Luma en el momento, cuando el padrón no lo tiene.
 *
 * Son dos peticiones como mucho —una por evento— y solo ocurren con quien no
 * estaba en la copia local. Si lo encuentra, lo deja en el padrón para que la
 * siguiente vez salga de memoria.
 */
async function buscarEnVivo(pk: string): Promise<Asistente | null> {
  const { listarInvitadosConQr } = await import("./luma");
  const { nombreCorregido } = await import("@/config/nombres");
  const eventos: [Tipo, string | undefined][] = [
    ["general", eventoDeTier("general")],
    ["vip", eventoDeTier("vip")],
  ];

  for (const [tipo, evento] of eventos) {
    if (!evento) continue;
    const lista = await listarInvitadosConQr(evento).catch(() => []);
    const g = lista.find((x) => pkDeQr(x.qr) === pk || x.id === pk);
    if (!g) continue;

    const asistente: Asistente = {
      id: pk,
      tipo,
      nombre: nombreCorregido(g.email) ?? g.nombre ?? g.email,
      correo: g.email,
      ...(g.estado !== "approved" ? { pendiente: true } : {}),
      ...(esPrueba(g.email) ? { prueba: true } : {}),
    };

    // Que la próxima salga del padrón y no de otra vuelta a Luma.
    const padron = await traerPadron().catch(() => null);
    if (padron && !padron.gente.some((x) => x.id === pk)) {
      padron.gente.push(asistente);
      await escribir(RUTA_PADRON, padron).catch(() => null);
    }
    return asistente;
  }
  return null;
}

/**
 * El almuerzo y los talleres, que se validan contra lo que la persona reservó
 * y no contra el padrón de la puerta.
 *
 * El pase lleva quién es; lo que vale —el turno, la reserva— se lee en el
 * momento, porque cambia: alguien puede mover su turno después de guardar el
 * QR en el teléfono y el pase tiene que seguir sirviendo.
 */
async function validarPase(
  pase: { tipo: "almuerzo" | "taller"; participanteId: string; extra: string },
  opciones: { modo: Modo; por: string; secreto: string }
): Promise<Veredicto> {
  const p = await porId(pase.participanteId).catch(() => null);
  if (!p) {
    return { ok: false, estado: "desconocido", detalle: "No encontramos a esa persona. Que entre a la experiencia otra vez." };
  }

  const asistente: Asistente = {
    id: p.id,
    tipo: p.equipo ? "equipo" : p.registro?.tier === "vip" ? "vip" : "general",
    nombre: `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || (p.email ?? p.id),
    correo: p.email ?? "",
  };

  if (pase.tipo === "almuerzo") {
    if (asistente.tipo === "general") {
      return { ok: false, estado: "no-es-vip", asistente, detalle: "El almuerzo va con la entrada VIP." };
    }
    // Sin turno escogido **pasa igual**. Los tres turnos suman 270 puestos
    // para 179 VIP: el turno existe para repartir la sala, no para dejar a
    // nadie afuera. Devolverle a alguien su almuerzo porque no tocó un botón
    // en una app sería un mal recuerdo del evento, y además no hace falta.
    // Se avisa para que en el restaurante sepan que ese no estaba contado.
    const escogido = p.almuerzo?.turno;
    const turno = escogido ? turnoVista(escogido) : undefined;
    const marca: Marca = {
      id: p.id, tipo: asistente.tipo, nombre: asistente.nombre, correo: asistente.correo,
      en: new Date().toISOString(), por: opciones.por, modo: "almuerzo",
      ...(turno ? { turno: turno.id } : {}),
    };
    const ruta = rutaMarca("almuerzo", asistente.tipo, p.id, esPrueba(asistente.correo));
    const previa = await leer<Marca>(ruta).catch(() => null);
    if (previa) return { ok: true, estado: "repetido", asistente, marca, previa };
    await escribir(ruta, marca);
    if (!turno && asistente.tipo !== "equipo") {
      return { ok: true, estado: "sin-turno", asistente, marca } as Veredicto;
    }
    return { ok: true, estado: "entra", asistente, marca, ...(turno ? { turno } : {}) };
  }

  // Taller: el pase dice a cuál, y hay que comprobar que de verdad lo reservó.
  const taller = SESIONES.find((x) => x.id === pase.extra);
  const reservado = (p.talleres ?? []).some((t) => t.id === pase.extra);
  if (!taller || !reservado) {
    return {
      ok: false,
      estado: "sin-reserva",
      asistente,
      detalle: taller
        ? `No tiene reservado «${taller.titulo}». Si hay cupo puede reservarlo en la experiencia.`
        : "Ese taller no existe.",
    };
  }

  const marca: Marca = {
    id: `${p.id}__${taller.id}`,
    tipo: asistente.tipo,
    nombre: asistente.nombre,
    correo: asistente.correo,
    en: new Date().toISOString(),
    por: opciones.por,
    modo: "taller",
    taller: taller.id,
  };
  const ruta = rutaMarca("taller", asistente.tipo, marca.id, esPrueba(asistente.correo));
  const previa = await leer<Marca>(ruta).catch(() => null);
  if (previa) return { ok: true, estado: "repetido", asistente, marca, previa };
  await escribir(ruta, marca);
  return { ok: true, estado: "entra", asistente, marca };
}

// ----------------------------------------------------------- conteo ----

/**
 * Las cuentas de la puerta, en vivo.
 *
 * Se cuentan rutas, no documentos: el tipo va en el nombre del archivo, así
 * que saber cuántos VIP entraron no exige abrir ninguno. Con setecientas
 * personas la diferencia entre listar y leer es de segundos a minutos.
 */
export async function conteo(): Promise<Conteo> {
  const [rutasEntrada, rutasAlmuerzo, rutasTaller, padron] = await Promise.all([
    listarRutas("validacion/entrada/", 5000).catch(() => [] as string[]),
    listarRutas("validacion/almuerzo/", 5000).catch(() => [] as string[]),
    listarRutas("validacion/taller/", 5000).catch(() => [] as string[]),
    traerPadron().catch(() => null),
  ]);

  const cuenta = (rutas: string[], tipo: Tipo) =>
    rutas.filter((r) => {
      const nombre = r.split("/").pop() ?? "";
      return nombre.startsWith(`${tipo}__`) && !nombre.startsWith(`${tipo}__prueba__`);
    }).length;

  const general = cuenta(rutasEntrada, "general");
  const vip = cuenta(rutasEntrada, "vip");
  const equipo = cuenta(rutasEntrada, "equipo");
  const gente = padron?.gente ?? [];

  // El desglose por turno sí exige abrir los documentos, pero son pocos: solo
  // los VIP que ya almorzaron, no los seiscientos de la puerta.
  const porTurno: Record<string, number> = {};
  for (const t of ALMUERZOS) porTurno[t.id] = 0;
  const marcas = await Promise.all(rutasAlmuerzo.map((r) => leer<Marca>(r).catch(() => null)));
  for (const m of marcas) if (m?.turno && m.turno in porTurno && !esPrueba(m.correo)) porTurno[m.turno] += 1;

  // Igual para los talleres: el nombre del archivo lleva el participante y la
  // sesión juntos, así que el desglose por taller sí hay que leerlo.
  const porSesion: Record<string, number> = {};
  for (const x of SESIONES) if (x.salon === "taller" && !x.tipo) porSesion[x.id] = 0;
  const deTaller = await Promise.all(rutasTaller.map((r) => leer<Marca>(r).catch(() => null)));
  for (const m of deTaller) if (m?.taller && m.taller in porSesion && !esPrueba(m.correo)) porSesion[m.taller] += 1;

  return {
    general,
    vip,
    equipo,
    total: general + vip + equipo,
    padron: {
      general: gente.filter((p) => p.tipo === "general" && !p.prueba).length,
      vip: gente.filter((p) => p.tipo === "vip" && !p.prueba).length,
      equipo: gente.filter((p) => p.tipo === "equipo" && !p.prueba).length,
      total: gente.filter((p) => !p.prueba).length,
    },
    almuerzo: { total: rutasAlmuerzo.length, porTurno },
    taller: { total: rutasTaller.length, porSesion },
    actualizadoEn: new Date().toISOString(),
  };
}

/** Las últimas marcas, para que la pantalla muestre quién acaba de entrar. */
export async function ultimas(modo: Modo, cuantas = 12): Promise<Marca[]> {
  const rutas = await listarRutas(`validacion/${modo}/`, 5000).catch(() => [] as string[]);
  const marcas = (await Promise.all(rutas.map((r) => leer<Marca>(r).catch(() => null)))).filter(
    (m): m is Marca => Boolean(m)
  );
  return marcas.sort((a, b) => b.en.localeCompare(a.en)).slice(0, cuantas);
}

/**
 * Borra todas las marcas de un modo: la puerta vuelve a cero.
 *
 * Existe para una sola cosa: el día del evento, antes de abrir, hay que
 * limpiar lo que dejaron las pruebas. Sin esto el primer número que ve el
 * equipo en la puerta ya viene sucio y nadie sabe cuánto de eso es real.
 */
export async function vaciar(modo: Modo): Promise<number> {
  const { borrar } = await import("./almacen");
  const rutas = await listarRutas(`validacion/${modo}/`, 5000).catch(() => [] as string[]);
  await Promise.all(rutas.map((r) => borrar(r).catch(() => null)));
  return rutas.length;
}

/** Deshace una marca, para cuando alguien escanea por error. */
export async function deshacer(modo: Modo, tipo: Tipo, id: string): Promise<boolean> {
  const { borrar } = await import("./almacen");
  // Las dos variantes: quien deshace desde el panel sabe el tipo y el id, no
  // si el correo era de prueba.
  await Promise.all([
    borrar(rutaMarca(modo, tipo, id)).catch(() => null),
    borrar(rutaMarca(modo, tipo, id, true)).catch(() => null),
  ]);
  return true;
}
