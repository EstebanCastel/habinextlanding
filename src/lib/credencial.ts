/**
 * La credencial del evento: la escarapela que cuelga del cordón, con dos
 * caras.
 *
 * **El frente** sigue la pieza oficial de la escarapela VIP: fondo casi negro
 * con la ciudad apenas insinuada, el gancho del cordón arriba, las palabras
 * de la marca en vertical por el borde izquierdo, la foto en blanco y negro,
 * el tipo de entrada en letras gigantes sobre el borde derecho, el nombre en
 * dos pesos y el lockup abajo.
 *
 * **El reverso** lleva lo que sirve el día del evento: el QR de Luma con el
 * que se hace el ingreso, el nombre, la cédula y los datos de la jornada. Va
 * en claro sobre oscuro y con el QR grande, porque lo va a leer un lector de
 * mano en una fila, con gente detrás.
 *
 * Es un módulo aparte de `carnet.ts` porque son dos piezas distintas: el
 * carnet es para publicar en redes (cuadrado y vertical de historia) y la
 * credencial es para entrar (formato escarapela y con QR). Comparten los
 * ayudantes de dibujo, no la composición.
 */

import {
  ajustar,
  anchoEspaciado,
  cargarImagen,
  dibujarEspaciado,
  fotoEnGris,
  redondeado,
  type Encuadre,
  type Recursos,
} from "./carnet";

export type Tier = "general" | "vip";

/** Proporción de escarapela real (10 × 15 cm más el gancho). */
export const CRED = { w: 1000, h: 1560 } as const;

const VIOLETA = "#802ef6";
const NOCHE = "#07040d";

/**
 * Las palabras que corren en vertical por el borde izquierdo, tal como están
 * en la pieza: dos columnas que se leen de abajo hacia arriba.
 */
const COLUMNA_EXTERNA = ["INMOBILIARIA", "IA", "BOGOTA", "OPORTUNIDAD", "EXPERIENCIA", "GLOBAL"];
const COLUMNA_INTERNA = ["OCT 2026", "NEXT", "LEVEL"];

export type RecursosCredencial = Recursos & { lockupNext: HTMLImageElement };

export async function cargarRecursosCredencial(): Promise<RecursosCredencial> {
  const [fondo, lockup, habi] = await Promise.all([
    cargarImagen("/img/carnet/bogota-story.jpg"),
    cargarImagen("/img/carnet/lockup.svg"),
    cargarImagen("/img/carnet/habi.svg"),
  ]);
  return { fondo, lockup, habi, lockupNext: lockup };
}

export type OpcionesCredencial = {
  tier: Tier;
  nombre: string;
  apellido: string;
  foto: HTMLImageElement | null;
  encuadre: Encuadre;
  recursos: RecursosCredencial;
  familia: string;
};

/** El gancho del cordón: la pestaña negra con el ojal y el broche. */
function gancho(ctx: CanvasRenderingContext2D, w: number) {
  const cx = w / 2;
  // El broche metálico, insinuado con un arco grueso.
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, 46, 36, Math.PI * 0.05, Math.PI * 0.95, true);
  ctx.stroke();
  ctx.restore();

  // La pestaña de la tarjeta y su ojal.
  ctx.fillStyle = "#0b0712";
  redondeado(ctx, cx - 132, 62, 264, 84, 30);
  ctx.fill();
  ctx.fillStyle = NOCHE;
  redondeado(ctx, cx - 58, 86, 116, 34, 17);
  ctx.fill();
}

/** Texto girado 90° hacia arriba, para los bordes. */
function vertical(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  tam: number,
  familia: string,
  color: string,
  espacio = 0.3
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = color;
  ctx.font = `500 ${tam}px ${familia}`;
  dibujarEspaciado(ctx, texto, 0, 0, tam * espacio);
  ctx.restore();
}

/** El frente de la credencial. */
export function dibujarFrente(canvas: HTMLCanvasElement, o: OpcionesCredencial) {
  const { w, h } = CRED;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // --- fondo: la ciudad muy apagada, casi una textura ---
  ctx.fillStyle = NOCHE;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.drawImage(o.recursos.fondo, 0, 0, w, h);
  ctx.restore();
  ctx.fillStyle = "rgba(5,2,8,0.58)";
  ctx.fillRect(0, 0, w, h);
  // Degradados arriba y abajo: dejan respirar el centro, que es donde va la
  // foto, y apagan los bordes para que el texto blanco siempre tenga contraste.
  const velaArriba = ctx.createLinearGradient(0, 0, 0, h * 0.3);
  velaArriba.addColorStop(0, "rgba(5,2,8,0.85)");
  velaArriba.addColorStop(1, "rgba(5,2,8,0)");
  ctx.fillStyle = velaArriba;
  ctx.fillRect(0, 0, w, h * 0.3);
  const velaAbajo = ctx.createLinearGradient(0, h * 0.62, 0, h);
  velaAbajo.addColorStop(0, "rgba(5,2,8,0)");
  velaAbajo.addColorStop(1, "rgba(5,2,8,0.94)");
  ctx.fillStyle = velaAbajo;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  const brillo = ctx.createRadialGradient(w * 0.5, h * 0.42, 40, w * 0.5, h * 0.42, w * 0.9);
  brillo.addColorStop(0, "rgba(128,46,246,0.10)");
  brillo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, w, h);

  // --- chevrones morados de contorno ---
  // Van entre el borde de la foto y el del carné, en la franja alta: abajo de
  // ahí empieza el tipo de entrada en vertical y se cruzarían con él.
  ctx.save();
  ctx.strokeStyle = "rgba(128,46,246,0.5)";
  ctx.lineWidth = 3;
  ctx.lineJoin = "miter";
  for (let i = 0; i < 3; i += 1) {
    const x = 672 + i * 34;
    const y = 250;
    const t = 74;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + t, y + t);
    ctx.lineTo(x, y + t * 2);
    ctx.stroke();
  }
  ctx.restore();

  gancho(ctx, w);

  // --- UN EVENTO DE habi, arriba a la derecha ---
  const tPie = 22;
  ctx.font = `500 ${tPie}px ${o.familia}`;
  const rot = "UN EVENTO DE";
  const anchoRot = anchoEspaciado(ctx, rot, tPie * 0.22);
  const logoH = 44;
  const logoX = w - 72 - logoH;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  dibujarEspaciado(ctx, rot, logoX - 20 - anchoRot, 196, tPie * 0.22);
  ctx.drawImage(o.recursos.habi, logoX, 196 - logoH * 0.72, logoH, logoH);

  // --- palabras verticales del borde izquierdo ---
  let y = h - 150;
  for (const p of COLUMNA_EXTERNA) {
    vertical(ctx, p, 46, y, 17, o.familia, "rgba(255,255,255,0.42)");
    ctx.font = `500 17px ${o.familia}`;
    y -= anchoEspaciado(ctx, p, 17 * 0.3) + 58;
  }
  y = h - 150;
  for (const p of COLUMNA_INTERNA) {
    vertical(ctx, p, 104, y, 15, o.familia, "rgba(255,255,255,0.28)");
    ctx.font = `500 15px ${o.familia}`;
    y -= anchoEspaciado(ctx, p, 15 * 0.3) + 58;
  }

  // --- la foto ---
  const F = { x: 176, y: 250, w: 560, h: 620, r: 40 };
  ctx.save();
  redondeado(ctx, F.x, F.y, F.w, F.h, F.r);
  ctx.clip();
  if (o.foto) {
    ctx.drawImage(fotoEnGris(o.foto, F.w, F.h, o.encuadre), F.x, F.y);
    // Un velo oscuro abajo, para que el nombre respire sobre la foto.
    const velo = ctx.createLinearGradient(0, F.y + F.h * 0.55, 0, F.y + F.h);
    velo.addColorStop(0, "rgba(7,4,13,0)");
    velo.addColorStop(1, "rgba(7,4,13,0.55)");
    ctx.fillStyle = velo;
    ctx.fillRect(F.x, F.y, F.w, F.h);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(F.x, F.y, F.w, F.h);
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.textAlign = "center";
    ctx.font = `300 27px ${o.familia}`;
    ctx.fillText("Tu foto acá", F.x + F.w / 2, F.y + F.h / 2 + 9);
    ctx.textAlign = "left";
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  redondeado(ctx, F.x, F.y, F.w, F.h, F.r);
  ctx.stroke();

  // --- el tipo de entrada, gigante y vertical sobre el borde derecho ---
  const etiqueta = o.tier === "vip" ? "VIP" : "GENERAL";
  const tamEtiqueta = o.tier === "vip" ? 150 : 74;
  ctx.save();
  ctx.translate(w - 86, o.tier === "vip" ? 1010 : 1030);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `300 ${tamEtiqueta}px ${o.familia}`;
  // El VIP va con relleno blanco; General, en contorno, para que no compita.
  if (o.tier === "vip") {
    ctx.shadowColor = "rgba(128,46,246,0.85)";
    ctx.shadowBlur = 38;
    ctx.fillStyle = "#ffffff";
    dibujarEspaciado(ctx, etiqueta, 0, 0, tamEtiqueta * 0.3);
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    let x = 0;
    for (const ch of etiqueta) {
      ctx.strokeText(ch, x, 0);
      x += ctx.measureText(ch).width + tamEtiqueta * 0.3;
    }
  }
  ctx.restore();

  // --- el nombre, alineado a la derecha bajo la foto ---
  const nombre = (o.nombre || "Tu nombre").trim().toUpperCase();
  const apellido = (o.apellido || (o.nombre ? "" : "Apellido")).trim().toUpperCase();
  const maximo = 520;
  ctx.fillStyle = "#ffffff";

  const tN = ajustar(ctx, nombre, 300, 40, o.familia, maximo, 0.18);
  ctx.font = `300 ${tN}px ${o.familia}`;
  const anchoN = anchoEspaciado(ctx, nombre, tN * 0.18);
  dibujarEspaciado(ctx, nombre, F.x + F.w - anchoN, 986, tN * 0.18);

  if (apellido) {
    const tA = ajustar(ctx, apellido, 800, 62, o.familia, maximo, 0.06);
    ctx.font = `800 ${tA}px ${o.familia}`;
    const anchoA = anchoEspaciado(ctx, apellido, tA * 0.06);
    dibujarEspaciado(ctx, apellido, F.x + F.w - anchoA, 1060, tA * 0.06);
  }

  // --- una línea fina como separador, igual que en la pieza ---
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(F.x + F.w - 120, 1104);
  ctx.lineTo(F.x + F.w, 1104);
  ctx.stroke();

  // --- el lockup abajo ---
  const anchoLockup = 520;
  const altoLockup = anchoLockup * (o.recursos.lockup.height / o.recursos.lockup.width || 0.34);
  ctx.drawImage(o.recursos.lockup, (w - anchoLockup) / 2, h - 90 - altoLockup, anchoLockup, altoLockup);
}

export type OpcionesReverso = {
  tier: Tier;
  nombre: string;
  apellido: string;
  /** PNG del QR ya generado (la credencial no sabe de librerías de QR). */
  qr: HTMLImageElement | null;
  /** Texto bajo el QR: normalmente el correo con el que está la entrada. */
  correo?: string;
  cedula?: string;
  recursos: RecursosCredencial;
  familia: string;
  /** Qué mostrar si todavía no hay entrada aprobada. */
  aviso?: string;
};

/** El reverso: el QR de ingreso y los datos de la jornada. */
export function dibujarReverso(canvas: HTMLCanvasElement, o: OpcionesReverso) {
  const { w, h } = CRED;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = NOCHE;
  ctx.fillRect(0, 0, w, h);
  const brillo = ctx.createRadialGradient(w * 0.5, h * 0.3, 40, w * 0.5, h * 0.3, w);
  brillo.addColorStop(0, "rgba(128,46,246,0.14)");
  brillo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, w, h);

  gancho(ctx, w);

  ctx.textAlign = "center";

  // --- rótulo ---
  ctx.fillStyle = VIOLETA;
  ctx.font = `700 22px ${o.familia}`;
  dibujarEspaciado(ctx, "TU ENTRADA", w / 2 - anchoEspaciado(ctx, "TU ENTRADA", 22 * 0.3) / 2, 226, 22 * 0.3);
  ctx.textAlign = "center";

  // --- el QR, en blanco y con aire: es lo que lee el lector ---
  const Q = { x: (w - 620) / 2, y: 270, s: 620, r: 36 };
  ctx.fillStyle = "#ffffff";
  redondeado(ctx, Q.x, Q.y, Q.s, Q.s, Q.r);
  ctx.fill();
  if (o.qr) {
    const p = 44;
    ctx.drawImage(o.qr, Q.x + p, Q.y + p, Q.s - p * 2, Q.s - p * 2);
  } else {
    ctx.fillStyle = "rgba(5,2,8,0.45)";
    ctx.font = `300 26px ${o.familia}`;
    const aviso = o.aviso ?? "Tu QR aparece cuando tu pago esté confirmado";
    const palabras = aviso.split(" ");
    let linea = "";
    const lineas: string[] = [];
    for (const p of palabras) {
      const prueba = linea ? `${linea} ${p}` : p;
      if (ctx.measureText(prueba).width <= Q.s - 120) linea = prueba;
      else {
        lineas.push(linea);
        linea = p;
      }
    }
    if (linea) lineas.push(linea);
    lineas.forEach((l, i) => ctx.fillText(l, w / 2, Q.y + Q.s / 2 - ((lineas.length - 1) * 38) / 2 + i * 38));
  }

  // --- nombre y tipo de entrada ---
  const completo = `${o.nombre} ${o.apellido}`.trim().toUpperCase() || "TU NOMBRE";
  ctx.fillStyle = "#ffffff";
  const tNombre = ajustar(ctx, completo, 700, 46, o.familia, w - 200, 0.04);
  ctx.font = `700 ${tNombre}px ${o.familia}`;
  ctx.fillText(completo, w / 2, 990);

  ctx.font = `600 24px ${o.familia}`;
  ctx.fillStyle = VIOLETA;
  const tipo = o.tier === "vip" ? "ENTRADA VIP" : "ENTRADA GENERAL";
  ctx.textAlign = "left";
  dibujarEspaciado(ctx, tipo, w / 2 - anchoEspaciado(ctx, tipo, 24 * 0.28) / 2, 1034, 24 * 0.28);
  ctx.textAlign = "center";

  if (o.cedula) {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `300 24px ${o.familia}`;
    ctx.fillText(`CC ${o.cedula}`, w / 2, 1076);
  }
  if (o.correo) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `300 22px ${o.familia}`;
    ctx.fillText(o.correo, w / 2, o.cedula ? 1112 : 1076);
  }

  // --- los datos del día ---
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(140, 1168);
  ctx.lineTo(w - 140, 1168);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = `600 27px ${o.familia}`;
  ctx.fillText("Martes 20 de octubre de 2026", w / 2, 1222);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `300 25px ${o.familia}`;
  ctx.fillText("Centro de Convenciones Av. 68", w / 2, 1262);
  ctx.fillText("Bogotá · 9:00 a. m. a 6:00 p. m.", w / 2, 1298);

  ctx.textAlign = "left";
  const anchoLockup = 420;
  const altoLockup = anchoLockup * (o.recursos.lockup.height / o.recursos.lockup.width || 0.34);
  ctx.drawImage(o.recursos.lockup, (w - anchoLockup) / 2, h - 86 - altoLockup, anchoLockup, altoLockup);
}
