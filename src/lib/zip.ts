/**
 * Un zip sin compresión, escrito a mano.
 *
 * Es deliberado no traer una librería: un `.pkpass` son seis archivos
 * pequeños, el formato «almacenado» del zip es una docena de campos, y el
 * teléfono lo acepta igual. Una dependencia más en el servidor por esto no se
 * justifica.
 */
export function zip(archivos: Record<string, Buffer>): Buffer {
  const entradas: Buffer[] = [];
  const central: Buffer[] = [];
  let desplazamiento = 0;

  for (const [nombre, datos] of Object.entries(archivos)) {
    const n = Buffer.from(nombre, "utf8");
    const crc = crc32(datos);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versión mínima
    local.writeUInt16LE(0, 6); // sin banderas
    local.writeUInt16LE(0, 8); // sin compresión
    local.writeUInt16LE(0, 10); // hora
    local.writeUInt16LE(0, 12); // fecha
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(datos.length, 18);
    local.writeUInt32LE(datos.length, 22);
    local.writeUInt16LE(n.length, 26);
    local.writeUInt16LE(0, 28);
    entradas.push(local, n, datos);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0, 8);
    dir.writeUInt16LE(0, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(0, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(datos.length, 20);
    dir.writeUInt32LE(datos.length, 24);
    dir.writeUInt16LE(n.length, 28);
    dir.writeUInt16LE(0, 30);
    dir.writeUInt16LE(0, 32);
    dir.writeUInt16LE(0, 34);
    dir.writeUInt16LE(0, 36);
    dir.writeUInt32LE(0, 38);
    dir.writeUInt32LE(desplazamiento, 42);
    central.push(dir, n);

    desplazamiento += local.length + n.length + datos.length;
  }

  const cuerpo = Buffer.concat(entradas);
  const directorio = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(0, 4);
  fin.writeUInt16LE(0, 6);
  fin.writeUInt16LE(Object.keys(archivos).length, 8);
  fin.writeUInt16LE(Object.keys(archivos).length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(cuerpo.length, 16);
  fin.writeUInt16LE(0, 20);

  return Buffer.concat([cuerpo, directorio, fin]);
}

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = TABLA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// --------------------------------------------------------------- Google ----
