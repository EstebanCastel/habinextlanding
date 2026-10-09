/**
 * El carnet, dibujado en el navegador.
 *
 * Se dibuja en un `<canvas>` y no en el servidor por una razón: la persona
 * tiene que verlo cambiar mientras escribe su nombre y acomoda su foto. El
 * mismo dibujo, a tamaño completo, es lo que después se guarda y se publica.
 *
 * La composición sigue la pieza oficial: Bogotá en blanco y negro al fondo,
 * la trama de puntos morados, el lockup «Habi Next» con «COLOMBIA» debajo,
 * la foto en blanco y negro con esquinas redondeadas, los dos asteriscos
 * —uno en línea, otro relleno— sobre la esquina de la foto, el nombre en dos
 * pesos y «UN EVENTO DE habi» al pie.
 *
 * Este archivo solo corre en el navegador.
 */

export type Formato = "feed" | "story";

export type Encuadre = {
  /** Desplazamiento de la foto dentro del marco, de -1 a 1 en cada eje. */
  dx: number;
  dy: number;
  /** 1 = la foto llena el marco justo; más, acerca. */
  zoom: number;
};

export const ENCUADRE_INICIAL: Encuadre = { dx: 0, dy: 0, zoom: 1 };

type Diseno = {
  w: number;
  h: number;
  margen: number;
  lockup: { x: number; y: number; w: number };
  foto: { x: number; y: number; w: number; h: number; r: number };
  asteriscos: { tam: number; y: number; blanco: number; morado: number };
  nombre: { y: number; tam: number };
  apellido: { y: number; tam: number };
  pie: { y: number; logoH: number; tam: number };
  puntos: { paso: number; r: number };
};

export const DISENO: Record<Formato, Diseno> = {
  // Los asteriscos montan la esquina inferior derecha de la foto y el nombre
  // arranca por debajo de ellos: así un nombre largo nunca se cruza con el
  // asterisco, que era lo que pasaba con el trazado literal de la pieza.
  feed: {
    w: 1080,
    h: 1350,
    margen: 96,
    lockup: { x: 96, y: 84, w: 520 },
    foto: { x: 96, y: 320, w: 584, h: 620, r: 44 },
    asteriscos: { tam: 260, y: 940, blanco: 620, morado: 1000 },
    nombre: { y: 1120, tam: 56 },
    apellido: { y: 1200, tam: 78 },
    pie: { y: 1292, logoH: 90, tam: 27 },
    puntos: { paso: 96, r: 3.5 },
  },
  story: {
    w: 1080,
    h: 1920,
    margen: 96,
    lockup: { x: 96, y: 200, w: 560 },
    foto: { x: 96, y: 480, w: 700, h: 860, r: 52 },
    asteriscos: { tam: 300, y: 1340, blanco: 736, morado: 1040 },
    nombre: { y: 1560, tam: 64 },
    apellido: { y: 1650, tam: 88 },
    pie: { y: 1800, logoH: 104, tam: 30 },
    puntos: { paso: 96, r: 3.5 },
  },
};

const VIOLETA = "#802ef6";
const VIOLETA_OSCURO = "#4b1a8b";

/** Las capas del diseño VIP: el fondo (Bogotá), lo que va debajo de la tarjeta y lo que va encima. */
export type RecursosVip = { fondo: HTMLImageElement; bajo: HTMLImageElement; alto: HTMLImageElement };
export type Recursos = { fondo: HTMLImageElement; lockup: HTMLImageElement; habi: HTMLImageElement; vip?: RecursosVip };

const cache = new Map<string, Promise<HTMLImageElement>>();

export function cargarImagen(src: string): Promise<HTMLImageElement> {
  const previa = cache.get(src);
  if (previa) return previa;
  const p = new Promise<HTMLImageElement>((resolver, rechazar) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolver(img);
    img.onerror = () => rechazar(new Error(`no cargó ${src}`));
    img.src = src;
  });
  cache.set(src, p);
  return p;
}

export async function cargarRecursosVip(): Promise<RecursosVip> {
  const [fondo, bajo, alto] = await Promise.all([
    cargarImagen("/img/carnet/vip-fondo.jpg"),
    cargarImagen("/img/carnet/vip-bajo.png"),
    cargarImagen("/img/carnet/vip-alto.png"),
  ]);
  return { fondo, bajo, alto };
}

export async function cargarRecursos(formato: Formato): Promise<Recursos> {
  const [fondo, lockup, habi] = await Promise.all([
    cargarImagen(`/img/carnet/bogota-${formato}.jpg`),
    cargarImagen("/img/carnet/lockup.svg"),
    cargarImagen("/img/carnet/habi.svg"),
  ]);
  return { fondo, lockup, habi };
}

/** La familia que next/font registró para Urbanist, tal como la ve el CSS. */
export function familiaDeFuente(): string {
  const f = typeof document !== "undefined" ? getComputedStyle(document.body).fontFamily : "";
  return f || "Urbanist, system-ui, sans-serif";
}

export async function cargarFuentes(familia: string): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  await Promise.all(
    [300, 500, 700, 800].map((peso) => document.fonts.load(`${peso} 40px ${familia}`).catch(() => null))
  );
}

/** Generador determinista: la trama de puntitos sale igual en cada dibujo. */
function semilla(s: number) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** El trazado oficial del asterisco de ocho puntas (viewBox 152.4). */
const ASTERISCO = [
  142.91, 70.47, 90.11, 70.47, 127.45, 33.11, 119.3, 24.96, 81.96, 62.31, 81.96, 9.49, 70.43, 9.49, 70.43, 62.31, 33.1,
  24.96, 24.95, 33.11, 62.28, 70.47, 9.48, 70.47, 9.48, 82, 62.28, 82, 24.95, 119.36, 33.1, 127.51, 70.43, 90.16, 70.43,
  142.98, 81.96, 142.98, 81.96, 90.16, 119.3, 127.51, 127.45, 119.36, 90.11, 82, 142.91, 82,
];

/** Los mismos puntos como atributo `points` de un `<polygon>`, para animarlo encima del lienzo. */
export const ASTERISCO_PUNTOS = ASTERISCO.join(" ");

export function trazarAsterisco(ctx: CanvasRenderingContext2D, cx: number, cy: number, tam: number) {
  const k = tam / 152.4;
  ctx.beginPath();
  for (let i = 0; i < ASTERISCO.length; i += 2) {
    const x = cx + (ASTERISCO[i] - 76.2) * k;
    const y = cy + (ASTERISCO[i + 1] - 76.2) * k;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function redondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Texto con espaciado entre letras, dibujado letra a letra (Safari no tiene letterSpacing en canvas). */
export function anchoEspaciado(ctx: CanvasRenderingContext2D, texto: string, espacio: number): number {
  let w = 0;
  for (const c of texto) w += ctx.measureText(c).width + espacio;
  return w - espacio;
}

export function dibujarEspaciado(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, espacio: number) {
  let cx = x;
  for (const c of texto) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + espacio;
  }
}

/** Baja el tamaño hasta que el texto quepa en el ancho dado. */
export function ajustar(ctx: CanvasRenderingContext2D, texto: string, peso: number, tam: number, familia: string, maximo: number, tracking: number) {
  let t = tam;
  for (; t > 22; t -= 2) {
    ctx.font = `${peso} ${t}px ${familia}`;
    if (anchoEspaciado(ctx, texto, t * tracking) <= maximo) break;
  }
  return t;
}

/** La foto, recortada a cubrir el marco según el encuadre, y pasada a blanco y negro. */
export function fotoEnGris(foto: HTMLImageElement, w: number, h: number, encuadre: Encuadre): HTMLCanvasElement {
  const lienzo = document.createElement("canvas");
  lienzo.width = w;
  lienzo.height = h;
  const c = lienzo.getContext("2d")!;
  const iw = foto.naturalWidth || foto.width;
  const ih = foto.naturalHeight || foto.height;
  const escala = Math.max(w / iw, h / ih) * Math.max(1, encuadre.zoom);
  const dw = iw * escala;
  const dh = ih * escala;
  // El desplazamiento se limita a lo que sobra: la foto nunca deja ver el fondo.
  const ox = (w - dw) / 2 + Math.max(-1, Math.min(1, encuadre.dx)) * ((dw - w) / 2);
  const oy = (h - dh) / 2 + Math.max(-1, Math.min(1, encuadre.dy)) * ((dh - h) / 2);
  c.drawImage(foto, ox, oy, dw, dh);

  const datos = c.getImageData(0, 0, w, h);
  const d = datos.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    // Un poco más de contraste que el gris plano: es lo que da el aire de la pieza.
    const v = Math.max(0, Math.min(255, (l - 128) * 1.08 + 122));
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  c.putImageData(datos, 0, 0);
  return lienzo;
}

export type OpcionesDeDibujo = {
  formato: Formato;
  nombre: string;
  apellido: string;
  foto: HTMLImageElement | null;
  encuadre: Encuadre;
  recursos: Recursos;
  familia: string;
  /** En pantalla los asteriscos van aparte, animados; en la imagen final, pintados. */
  sinAsteriscos?: boolean;
  /** La escarapela VIP tiene su propio diseño (`dibujarVip`); General es el de siempre. */
  tier?: "general" | "vip";
};

/**
 * La escarapela VIP: el diseño de la pieza oficial (2040 × 2946), partido en
 * tres capas rasterizadas —fondo, lo que va debajo de la tarjeta y las
 * palabras verticales que van encima— y, en medio, la tarjeta con la foto y
 * el nombre que pinta el canvas. En feed la pieza se ajusta a la altura y
 * queda centrada; en story, al ancho.
 */
const VIP = {
  w: 2040,
  h: 2946,
  tarjeta: { x: 423, y: 490, w: 1194, h: 1855, r: 127 },
  // La foto llena la tarjeta entera, como en la pieza: con un recuadro
  // interior, una foto de fondo claro se veía enmarcada dentro del negro.
  foto: { x: 423, y: 490, w: 1194, h: 1855, r: 127 },
  nombre: { x: 594, y: 2122, tam: 101 },
  apellido: { x: 594, y: 2226, tam: 106 },
};

export function dibujarVip(canvas: HTMLCanvasElement, o: OpcionesDeDibujo, vip: RecursosVip) {
  const D = DISENO[o.formato];
  canvas.width = D.w;
  canvas.height = D.h;
  const ctx = canvas.getContext("2d")!;
  const { w, h } = D;
  const s = o.formato === "feed" ? h / VIP.h : w / VIP.w;
  const ox = (w - VIP.w * s) / 2;
  const oy = (h - VIP.h * s) / 2;
  const S = (v: number) => v * s;

  // --- fondo a sangre ---
  ctx.fillStyle = "#07040d";
  ctx.fillRect(0, 0, w, h);
  const fs = Math.max(w / vip.fondo.width, h / vip.fondo.height);
  const fw = vip.fondo.width * fs;
  const fh = vip.fondo.height * fs;
  ctx.drawImage(vip.fondo, (w - fw) / 2, (h - fh) / 2, fw, fh);

  // --- cuadrícula, asterisco, «VIP», lockup y «un evento de» ---
  ctx.drawImage(vip.bajo, ox, oy, S(VIP.w), S(VIP.h));

  // --- la tarjeta y la foto ---
  const T = VIP.tarjeta;
  ctx.fillStyle = "rgba(9,8,11,0.97)";
  redondeado(ctx, ox + S(T.x), oy + S(T.y), S(T.w), S(T.h), S(T.r));
  ctx.fill();
  const F = VIP.foto;
  const fx = ox + S(F.x);
  const fy = oy + S(F.y);
  const fW = Math.round(S(F.w));
  const fH = Math.round(S(F.h));
  ctx.save();
  redondeado(ctx, fx, fy, fW, fH, S(F.r));
  ctx.clip();
  if (o.foto) {
    ctx.drawImage(fotoEnGris(o.foto, fW, fH, o.encuadre), fx, fy);
    // El nombre va sobre la parte baja de la foto: se oscurece para que se lea.
    const velo = ctx.createLinearGradient(0, fy + fH * 0.5, 0, fy + fH);
    velo.addColorStop(0, "rgba(0,0,0,0)");
    velo.addColorStop(1, "rgba(0,0,0,0.92)");
    ctx.fillStyle = velo;
    ctx.fillRect(fx, fy, fW, fH);
  } else {
    const relleno = ctx.createLinearGradient(fx, fy, fx + fW, fy + fH);
    relleno.addColorStop(0, "#1a0b30");
    relleno.addColorStop(1, "#0d0618");
    ctx.fillStyle = relleno;
    ctx.fillRect(fx, fy, fW, fH);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    trazarAsterisco(ctx, fx + fW / 2, fy + fH / 2 - 30, fW * 0.42);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `500 ${Math.round(fW * 0.055)}px ${o.familia}`;
    ctx.textAlign = "center";
    ctx.fillText("Tu foto va aquí", fx + fW / 2, fy + fH * 0.62);
    ctx.textAlign = "left";
  }
  ctx.restore();

  // --- las palabras verticales de la izquierda ---
  ctx.drawImage(vip.alto, ox, oy, S(VIP.w), S(VIP.h));

  // --- el nombre, como en la pieza: pila fino y espaciado, apellido en negrita ---
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  const nombre = (o.nombre || "Tu nombre").trim().toUpperCase();
  const apellido = (o.apellido || (o.nombre ? "" : "Apellido")).trim().toUpperCase();
  const maximo = S(F.x + F.w - VIP.nombre.x - 48);
  const tN = ajustar(ctx, nombre, 300, S(VIP.nombre.tam), o.familia, maximo, 0.22);
  ctx.font = `300 ${tN}px ${o.familia}`;
  dibujarEspaciado(ctx, nombre, ox + S(VIP.nombre.x), oy + S(VIP.nombre.y), tN * 0.22);
  if (apellido) {
    const tA = ajustar(ctx, apellido, 800, S(VIP.apellido.tam), o.familia, maximo, 0.08);
    ctx.font = `800 ${tA}px ${o.familia}`;
    dibujarEspaciado(ctx, apellido, ox + S(VIP.apellido.x), oy + S(VIP.apellido.y), tA * 0.08);
  }
}

export function dibujar(canvas: HTMLCanvasElement, o: OpcionesDeDibujo) {
  if (o.tier === "vip" && o.recursos.vip) {
    dibujarVip(canvas, o, o.recursos.vip);
    return;
  }
  const D = DISENO[o.formato];
  canvas.width = D.w;
  canvas.height = D.h;
  const ctx = canvas.getContext("2d")!;
  const { w, h } = D;

  // --- fondo: Bogotá en blanco y negro, oscurecida ---
  ctx.fillStyle = "#050208";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(o.recursos.fondo, 0, 0, w, h);
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(0, 0, w, h);
  const arriba = ctx.createLinearGradient(0, 0, 0, h * 0.45);
  arriba.addColorStop(0, "rgba(0,0,0,0.72)");
  arriba.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = arriba;
  ctx.fillRect(0, 0, w, h * 0.45);
  const abajo = ctx.createLinearGradient(0, h * 0.55, 0, h);
  abajo.addColorStop(0, "rgba(0,0,0,0)");
  abajo.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = abajo;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);

  // --- trama de puntos morados ---
  ctx.fillStyle = "rgba(128,46,246,0.55)";
  for (let y = D.puntos.paso / 2; y < h; y += D.puntos.paso) {
    for (let x = D.puntos.paso / 2; x < w; x += D.puntos.paso) {
      ctx.beginPath();
      ctx.arc(x, y, D.puntos.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- nube de puntitos blancos en la esquina superior derecha ---
  const al = semilla(20261020);
  for (let i = 0; i < 900; i += 1) {
    const ang = al() * Math.PI * 2;
    const dist = Math.pow(al(), 0.55) * 460;
    const x = w + 40 + Math.cos(ang) * dist;
    const y = -40 + Math.sin(ang) * dist;
    if (x < 0 || x > w || y < 0 || y > h) continue;
    const cerca = 1 - dist / 460;
    ctx.fillStyle = `rgba(255,255,255,${0.15 + cerca * 0.75})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + al() * 2.2 * cerca, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- el lockup oficial: «Habi Next», los dos asteriscos y «COLOMBIA» ---
  const lockupH = (D.lockup.w * 260) / 780;
  ctx.drawImage(o.recursos.lockup, D.lockup.x, D.lockup.y, D.lockup.w, lockupH);
  ctx.textBaseline = "alphabetic";

  // --- la foto ---
  const F = D.foto;
  ctx.save();
  redondeado(ctx, F.x, F.y, F.w, F.h, F.r);
  ctx.clip();
  if (o.foto) {
    ctx.drawImage(fotoEnGris(o.foto, F.w, F.h, o.encuadre), F.x, F.y);
    const velo = ctx.createLinearGradient(0, F.y + F.h * 0.6, 0, F.y + F.h);
    velo.addColorStop(0, "rgba(0,0,0,0)");
    velo.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = velo;
    ctx.fillRect(F.x, F.y, F.w, F.h);
  } else {
    const relleno = ctx.createLinearGradient(F.x, F.y, F.x + F.w, F.y + F.h);
    relleno.addColorStop(0, "#1a0b30");
    relleno.addColorStop(1, "#0d0618");
    ctx.fillStyle = relleno;
    ctx.fillRect(F.x, F.y, F.w, F.h);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    trazarAsterisco(ctx, F.x + F.w / 2, F.y + F.h / 2 - 30, F.w * 0.42);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `500 ${Math.round(F.w * 0.055)}px ${o.familia}`;
    ctx.textAlign = "center";
    ctx.fillText("Tu foto va aquí", F.x + F.w / 2, F.y + F.h * 0.78);
    ctx.textAlign = "left";
  }
  ctx.restore();
  // Borde apenas visible, para que la foto se despegue del fondo oscuro.
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  redondeado(ctx, F.x, F.y, F.w, F.h, F.r);
  ctx.stroke();

  // --- los dos asteriscos ---
  const A = D.asteriscos;
  if (!o.sinAsteriscos) {
    trazarAsterisco(ctx, A.blanco, A.y, A.tam);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(3, A.tam * 0.018);
    ctx.lineJoin = "miter";
    ctx.stroke();
    const degrade = ctx.createLinearGradient(A.morado - A.tam / 2, A.y - A.tam / 2, A.morado + A.tam / 2, A.y + A.tam / 2);
    degrade.addColorStop(0, VIOLETA);
    degrade.addColorStop(1, VIOLETA_OSCURO);
    ctx.fillStyle = degrade;
    trazarAsterisco(ctx, A.morado, A.y, A.tam);
    ctx.fill();
  }

  // --- el nombre ---
  const maximo = w - D.margen * 2;
  const nombre = (o.nombre || "Tu nombre").trim().toUpperCase();
  const apellido = (o.apellido || (o.nombre ? "" : "Apellido")).trim().toUpperCase();
  ctx.fillStyle = "#ffffff";
  const tN = ajustar(ctx, nombre, 300, D.nombre.tam, o.familia, maximo, 0.16);
  ctx.font = `300 ${tN}px ${o.familia}`;
  dibujarEspaciado(ctx, nombre, D.margen, D.nombre.y, tN * 0.16);
  if (apellido) {
    const tA = ajustar(ctx, apellido, 800, D.apellido.tam, o.familia, maximo, 0.05);
    ctx.font = `800 ${tA}px ${o.familia}`;
    dibujarEspaciado(ctx, apellido, D.margen, D.apellido.y, tA * 0.05);
  }

  // --- UN EVENTO DE habi ---
  const P = D.pie;
  const logoW = P.logoH; // el isotipo es cuadrado
  const logoX = w - D.margen - logoW;
  const logoY = P.y - P.logoH + P.tam * 0.35;
  ctx.drawImage(o.recursos.habi, logoX, logoY, logoW, P.logoH);
  ctx.font = `500 ${P.tam}px ${o.familia}`;
  const texto = "UN EVENTO DE";
  const anchoTexto = anchoEspaciado(ctx, texto, P.tam * 0.22);
  ctx.fillStyle = "#ffffff";
  dibujarEspaciado(ctx, texto, logoX - 28 - anchoTexto, logoY + P.logoH / 2 + P.tam * 0.36, P.tam * 0.22);
}

/** Parte el texto en renglones que quepan en el ancho. */
function renglones(ctx: CanvasRenderingContext2D, texto: string, maximo: number): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const salida: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width <= maximo || !actual) actual = prueba;
    else {
      salida.push(actual);
      actual = p;
    }
  }
  if (actual) salida.push(actual);
  return salida;
}

/**
 * La pieza de «Lo que me llevo»: la frase de la persona, grande, sobre la
 * noche de la marca, firmada con su nombre. Mismo lenguaje que el carnet,
 * sin foto: acá la protagonista es la frase.
 */
export function dibujarFrase(
  canvas: HTMLCanvasElement,
  o: { frase: string; nombre: string; apellido: string; recursos: Recursos; familia: string }
) {
  const w = 1080;
  const h = 1350;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const margen = 96;

  ctx.fillStyle = "#050208";
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.28;
  ctx.drawImage(o.recursos.fondo, 0, 0, w, h);
  ctx.globalAlpha = 1;
  const velo = ctx.createLinearGradient(0, 0, 0, h);
  velo.addColorStop(0, "rgba(5,2,8,0.55)");
  velo.addColorStop(1, "rgba(5,2,8,0.95)");
  ctx.fillStyle = velo;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(128,46,246,0.5)";
  for (let y = 48; y < h; y += 96) {
    for (let x = 48; x < w; x += 96) {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Asterisco grande, en línea, saliéndose por la derecha.
  trazarAsterisco(ctx, w - 60, h * 0.42, 620);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 8;
  ctx.stroke();

  const lockupW = 520;
  const lockupH = (lockupW * 260) / 780;
  ctx.drawImage(o.recursos.lockup, margen, 84, lockupW, lockupH);

  // Antetítulo.
  ctx.fillStyle = "#ba9dfa";
  ctx.font = `700 26px ${o.familia}`;
  dibujarEspaciado(ctx, "LO QUE ME LLEVO DE HABI NEXT", margen, 430, 26 * 0.28);

  // La frase, ajustada para caber en el bloque central.
  const maximo = w - margen * 2;
  let tam = 96;
  let lineas: string[] = [];
  for (; tam >= 40; tam -= 4) {
    ctx.font = `300 ${tam}px ${o.familia}`;
    lineas = renglones(ctx, `“${o.frase.trim()}”`, maximo);
    if (lineas.length * tam * 1.12 <= 560) break;
  }
  ctx.fillStyle = "#ffffff";
  let y = 520 + tam;
  for (const l of lineas) {
    ctx.fillText(l, margen, y);
    y += tam * 1.12;
  }

  // Firma.
  const quien = [o.nombre, o.apellido].filter(Boolean).join(" ").trim();
  if (quien) {
    ctx.fillStyle = VIOLETA;
    ctx.fillRect(margen, y + 30, 64, 4);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 40px ${o.familia}`;
    ctx.fillText(quien, margen, y + 96);
  }

  // Pie.
  const logoH = 96;
  const logoX = w - margen - logoH;
  const logoY = 1275 - logoH + 10;
  ctx.drawImage(o.recursos.habi, logoX, logoY, logoH, logoH);
  ctx.font = `500 28px ${o.familia}`;
  const texto = "UN EVENTO DE";
  const anchoTexto = anchoEspaciado(ctx, texto, 28 * 0.22);
  ctx.fillStyle = "#ffffff";
  dibujarEspaciado(ctx, texto, logoX - 28 - anchoTexto, logoY + logoH / 2 + 10, 28 * 0.22);
}

export function aBlob(canvas: HTMLCanvasElement, calidad = 0.92): Promise<Blob> {
  return new Promise((resolver, rechazar) => {
    canvas.toBlob((b) => (b ? resolver(b) : rechazar(new Error("no se pudo exportar"))), "image/jpeg", calidad);
  });
}

// ---------- el reverso: la entrada ----------

export type OpcionesDeReverso = {
  formato: Formato;
  nombre: string;
  apellido: string;
  tier: "general" | "vip";
  /** El QR de Luma ya rasterizado; null mientras no haya entrada emitida. */
  qr: HTMLImageElement | null;
  correo?: string;
  cedula?: string;
  /** Qué falta para que haya QR, en palabras para la persona. */
  aviso?: string;
  recursos: Recursos;
  familia: string;
};

/**
 * La cara de atrás del carnet: la entrada. El mismo lenguaje del frente —la
 * noche, la trama de puntos, el lockup y el pie— pero con el QR de Luma en el
 * centro, que es lo que lee la puerta. Sin QR todavía, el recuadro dice qué
 * falta en vez de quedar en blanco.
 */
export function dibujarReverso(canvas: HTMLCanvasElement, o: OpcionesDeReverso) {
  const D = DISENO[o.formato];
  canvas.width = D.w;
  canvas.height = D.h;
  const ctx = canvas.getContext("2d")!;
  const { w, h } = D;

  ctx.fillStyle = "#050208";
  ctx.fillRect(0, 0, w, h);
  const brillo = ctx.createRadialGradient(w * 0.5, h * 0.42, 40, w * 0.5, h * 0.42, w * 0.9);
  brillo.addColorStop(0, "rgba(128,46,246,0.18)");
  brillo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(128,46,246,0.35)";
  for (let y = D.puntos.paso / 2; y < h; y += D.puntos.paso) {
    for (let x = D.puntos.paso / 2; x < w; x += D.puntos.paso) {
      ctx.beginPath();
      ctx.arc(x, y, D.puntos.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const lockupH = (D.lockup.w * 260) / 780;
  ctx.drawImage(o.recursos.lockup, D.lockup.x, D.lockup.y, D.lockup.w, lockupH);
  ctx.textBaseline = "alphabetic";

  // --- rótulo ---
  const arriba = D.lockup.y + lockupH + (o.formato === "story" ? 120 : 70);
  ctx.fillStyle = VIOLETA;
  ctx.font = `700 ${Math.round(w * 0.022)}px ${o.familia}`;
  const rotulo = o.tier === "vip" ? "TU ENTRADA VIP" : "TU ENTRADA GENERAL";
  const esp = w * 0.022 * 0.3;
  dibujarEspaciado(ctx, rotulo, w / 2 - anchoEspaciado(ctx, rotulo, esp) / 2, arriba, esp);

  // --- el QR, en blanco y con aire: es lo que lee el lector ---
  const lado = Math.round(w * 0.6);
  const Q = { x: (w - lado) / 2, y: arriba + 44, s: lado, r: Math.round(lado * 0.06) };
  ctx.fillStyle = "#ffffff";
  redondeado(ctx, Q.x, Q.y, Q.s, Q.s, Q.r);
  ctx.fill();
  if (o.qr) {
    const p = Math.round(lado * 0.07);
    ctx.drawImage(o.qr, Q.x + p, Q.y + p, Q.s - p * 2, Q.s - p * 2);
  } else {
    ctx.fillStyle = "rgba(5,2,8,0.5)";
    ctx.font = `300 ${Math.round(w * 0.026)}px ${o.familia}`;
    ctx.textAlign = "center";
    const lineas = renglones(ctx, o.aviso ?? "Tu QR aparece cuando tu entrada esté confirmada", Q.s - lado * 0.2);
    const salto = w * 0.036;
    lineas.forEach((l, i) => ctx.fillText(l, w / 2, Q.y + Q.s / 2 - ((lineas.length - 1) * salto) / 2 + i * salto + salto * 0.3));
    ctx.textAlign = "left";
  }

  // --- nombre ---
  ctx.textAlign = "center";
  const completo = `${o.nombre} ${o.apellido}`.trim().toUpperCase() || "TU NOMBRE";
  ctx.fillStyle = "#ffffff";
  const tNombre = ajustar(ctx, completo, 700, Math.round(w * 0.046), o.familia, w - D.margen * 2, 0.04);
  ctx.font = `700 ${tNombre}px ${o.familia}`;
  const yNombre = Q.y + Q.s + (o.formato === "story" ? 110 : 86);
  ctx.fillText(completo, w / 2, yNombre);

  let y = yNombre + w * 0.04;
  if (o.cedula) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `300 ${Math.round(w * 0.024)}px ${o.familia}`;
    ctx.fillText(`CC ${o.cedula}`, w / 2, y);
    y += w * 0.034;
  }
  if (o.correo) {
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.font = `300 ${Math.round(w * 0.022)}px ${o.familia}`;
    ctx.fillText(o.correo, w / 2, y);
    y += w * 0.034;
  }

  // --- los datos del día ---
  const yLinea = y + w * 0.02;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(D.margen + 40, yLinea);
  ctx.lineTo(w - D.margen - 40, yLinea);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `600 ${Math.round(w * 0.027)}px ${o.familia}`;
  ctx.fillText("Martes 20 de octubre de 2026", w / 2, yLinea + w * 0.05);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `300 ${Math.round(w * 0.025)}px ${o.familia}`;
  ctx.fillText("Centro de Convenciones Av. 68 · Bogotá", w / 2, yLinea + w * 0.088);
  ctx.textAlign = "left";

  // --- UN EVENTO DE habi, igual que al frente ---
  const P = D.pie;
  const logoW = P.logoH;
  const logoX = w - D.margen - logoW;
  const logoY = P.y - P.logoH + P.tam * 0.35;
  ctx.drawImage(o.recursos.habi, logoX, logoY, logoW, P.logoH);
  ctx.font = `500 ${P.tam}px ${o.familia}`;
  const texto = "UN EVENTO DE";
  const anchoTexto = anchoEspaciado(ctx, texto, P.tam * 0.22);
  ctx.fillStyle = "#ffffff";
  dibujarEspaciado(ctx, texto, logoX - 28 - anchoTexto, logoY + P.logoH / 2 + P.tam * 0.36, P.tam * 0.22);
}
