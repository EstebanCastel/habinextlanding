import { get, list, put } from "@vercel/blob";

/**
 * Persistencia del embudo de boletería sobre un store **privado** de Vercel
 * Blob (`habinext-datos`). Privado importa: aquí viven nombre, correo y
 * celular de cada persona que se registra, y en un store público bastaría
 * conocer la ruta para leerlos.
 *
 * No es una base de datos y no se pretende que lo sea. Para un evento de un
 * día, con miles de registros como techo, alcanza: las lecturas son por clave,
 * las escrituras son por registro y la única concurrencia real —dos webhooks
 * tocando a la misma persona— se resuelve con escrituras condicionales.
 *
 * Todo pasa por `leer`/`escribir`/`modificar`, así que cambiar el motor (a
 * Redis o Postgres) es reemplazar este archivo y nada más.
 */

const OPCIONES = { access: "private" } as const;

/** Reintentos de `modificar` cuando otra petición escribió primero. */
const REINTENTOS = 4;

type Registro = Record<string, unknown>;

/**
 * Lee un documento. `useCache: false` es obligatorio, no una optimización:
 * la CDN de Blob puede servir hasta 60 segundos de contenido viejo, y en ese
 * hueco un webhook de Wompi leería el registro *antes* de que el redirector
 * marcara el clic y lo escribiría de vuelta pisando el avance.
 */
export async function leer<T = Registro>(ruta: string): Promise<T | null> {
  const res = await get(ruta, { ...OPCIONES, useCache: false }).catch(() => null);
  if (!res || res.statusCode !== 200 || !res.stream) return null;
  try {
    return JSON.parse(await new Response(res.stream).text()) as T;
  } catch {
    return null;
  }
}

/** Lee el documento junto con su ETag, para poder escribirlo condicionalmente. */
async function leerConEtag<T = Registro>(ruta: string): Promise<{ dato: T | null; etag?: string }> {
  const res = await get(ruta, { ...OPCIONES, useCache: false }).catch(() => null);
  if (!res || res.statusCode !== 200 || !res.stream) return { dato: null };
  try {
    return { dato: JSON.parse(await new Response(res.stream).text()) as T, etag: res.blob.etag };
  } catch {
    return { dato: null, etag: res.blob.etag };
  }
}

export async function escribir(ruta: string, dato: unknown, etag?: string): Promise<void> {
  await put(ruta, JSON.stringify(dato), {
    ...OPCIONES,
    addRandomSuffix: false,
    contentType: "application/json",
    // Sin caché: cada lectura tiene que ver lo último escrito.
    cacheControlMaxAge: 0,
    ...(etag ? { ifMatch: etag } : { allowOverwrite: true }),
  });
}

/**
 * Lee, transforma y vuelve a escribir con control de concurrencia optimista.
 * Si entre la lectura y la escritura otro webhook tocó el mismo registro, el
 * `ifMatch` falla y se reintenta sobre el estado nuevo — que es lo correcto:
 * el DLR de Infobip y el clic en el link de pago llegan con segundos de
 * diferencia y ninguno de los dos debe borrar lo que anotó el otro.
 */
export async function modificar<T extends Registro>(
  ruta: string,
  transformar: (actual: T | null) => T | null
): Promise<T | null> {
  for (let intento = 0; intento < REINTENTOS; intento += 1) {
    const { dato, etag } = await leerConEtag<T>(ruta);
    const nuevo = transformar(dato);
    if (nuevo === null) return null;
    try {
      await escribir(ruta, nuevo, dato ? etag : undefined);
      return nuevo;
    } catch (error) {
      // Choque de ETag (o carrera en la creación): releer y volver a aplicar.
      const esConflicto =
        error instanceof Error &&
        /precondition|already exists|conflict/i.test(`${error.name} ${error.message}`);
      if (!esConflicto || intento === REINTENTOS - 1) throw error;
      await new Promise((r) => setTimeout(r, 40 * (intento + 1)));
    }
  }
  return null;
}

/**
 * Rutas de todos los documentos bajo un prefijo, para el panel de operación.
 * `list` no recibe `access`: el modo lo define el store, y aquí es privado.
 */
export async function listarRutas(prefijo: string, tope = 1000): Promise<string[]> {
  const rutas: string[] = [];
  let cursor: string | undefined;
  do {
    const pagina = await list({ prefix: prefijo, limit: 1000, cursor });
    for (const b of pagina.blobs) rutas.push(b.pathname);
    cursor = pagina.hasMore ? pagina.cursor : undefined;
  } while (cursor && rutas.length < tope);
  return rutas;
}
