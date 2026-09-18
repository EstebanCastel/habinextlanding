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

export type Recursos = { fondo: HTMLImageElement; lockup: HTMLImageElement; habi: HTMLImageElement };

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

function trazarAsterisco(ctx: CanvasRenderingContext2D, cx: number, cy: number, tam: number) {
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

function redondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Texto con espaciado entre letras, dibujado letra a letra (Safari no tiene letterSpacing en canvas). */
function anchoEspaciado(ctx: CanvasRenderingContext2D, texto: string, espacio: number): number {
  let w = 0;
  for (const c of texto) w += ctx.measureText(c).width + espacio;
  return w - espacio;
}

function dibujarEspaciado(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, espacio: number) {
  let cx = x;
  for (const c of texto) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + espacio;
  }
}

/** Baja el tamaño hasta que el texto quepa en el ancho dado. */
function ajustar(ctx: CanvasRenderingContext2D, texto: string, peso: number, tam: number, familia: string, maximo: number, tracking: number) {
  let t = tam;
  for (; t > 22; t -= 2) {
    ctx.font = `${peso} ${t}px ${familia}`;
    if (anchoEspaciado(ctx, texto, t * tracking) <= maximo) break;
  }
  return t;
}

/** La foto, recortada a cubrir el marco según el encuadre, y pasada a blanco y negro. */
function fotoEnGris(foto: HTMLImageElement, w: number, h: number, encuadre: Encuadre): HTMLCanvasElement {
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
};

export function dibujar(canvas: HTMLCanvasElement, o: OpcionesDeDibujo) {
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
