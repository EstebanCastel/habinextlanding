import { randomUUID } from "node:crypto";
import { escribir, leer, listarRutas } from "./almacen";
import { completa, type Respuesta } from "@/config/encuesta";

/**
 * Las respuestas de la encuesta de cierre.
 *
 * Un documento por persona, con el id del participante cuando entró con su
 * correo y su cédula, y con un id suelto cuando contestó por el enlace sin
 * identificarse. Las dos cuentan para el NPS; solo las primeras se pueden
 * cruzar con lo que esa persona hizo en el día.
 *
 * Se guarda la última respuesta, no la primera: quien vuelve a abrir la
 * encuesta y cambia algo quiso cambiarlo.
 */

const RUTA = (id: string) => `encuesta/${id.replace(/[^A-Za-z0-9._@-]/g, "_")}.json`;

export type Guardada = {
  id: string;
  /** El participante, cuando lo hay. */
  participante?: string;
  nombre?: string;
  email?: string;
  tier?: string;
  /** De dónde vino: la app, el enlace con sesión, o el enlace anónimo. */
  via: "app" | "enlace" | "anonimo";
  respuesta: Respuesta;
  en: string;
  /** Para cruzar el envío con la respuesta sin pedirle nada a la persona. */
  campana?: string;
};

export async function guardada(id: string): Promise<Guardada | null> {
  return leer<Guardada>(RUTA(id));
}

export async function guardar(entrada: Omit<Guardada, "en" | "id"> & { id?: string }): Promise<Guardada> {
  if (!completa(entrada.respuesta)) throw new Error("respuesta incompleta");
  const id = entrada.id || `anon-${randomUUID()}`;
  const doc: Guardada = { ...entrada, id, en: new Date().toISOString() };
  await escribir(RUTA(id), doc);
  return doc;
}

export async function todas(): Promise<Guardada[]> {
  const rutas = await listarRutas("encuesta/", 5000).catch(() => [] as string[]);
  const docs = await Promise.all(rutas.map((r) => leer<Guardada>(r).catch(() => null)));
  return docs.filter((d): d is Guardada => Boolean(d?.respuesta));
}
