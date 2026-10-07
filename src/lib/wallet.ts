/**
 * La entrada en la billetera del teléfono: Apple Wallet y Google Wallet.
 *
 * Las dos guardan lo mismo —el QR de Luma, el nombre, el tipo de entrada y la
 * fecha— pero por caminos muy distintos: Apple quiere un archivo `.pkpass`
 * firmado con un certificado propio, y Google quiere un enlace con un JWT
 * firmado por una cuenta de servicio.
 *
 * Las dos necesitan credenciales que se piden una sola vez y que no se pueden
 * inventar. Mientras no estén puestas, cada función devuelve `falta` con lo
 * que hay que conseguir, y `disponibilidad()` le dice a la pantalla qué botón
 * atenuar. Preferimos eso a esconder el botón: así queda a la vista lo que
 * falta para que la entrada viva en el teléfono. Qué conseguir y dónde está
 * en `docs/experiencia.md`, sección «Billetera».
 */

import { zip } from "./zip";
import crypto from "node:crypto";
import forge from "node-forge";
import { EVENT } from "@/config/event";
import type { Entrada } from "./entrada";
import { RECURSOS_PASE } from "./wallet-recursos";

const COLOR_FONDO = "rgb(7,4,13)";
const COLOR_TEXTO = "rgb(255,255,255)";
const COLOR_ETIQUETA = "rgb(186,157,250)";

/**
 * Hasta cuándo vale el pase: la madrugada siguiente al evento. Con esto el
 * teléfono lo archiva solo y no queda una entrada vencida arriba del todo.
 */
const VENCE = "2026-10-21T06:00:00-05:00";

const etiquetaTier = (t: Entrada["tier"]) => (t === "vip" ? "VIP" : "General");

/** Una variable pegada desde un archivo suele llegar con `\n` literal. */
const conSaltos = (s: string) => s.replace(/\\n/g, "\n");

// ------------------------------------------------------- credenciales ----

export type Disponibilidad = { apple: boolean; google: boolean };

function credencialesApple() {
  const p12 = process.env.APPLE_PASS_P12_BASE64;
  // La clave del .p12 puede ser vacía: Llavero deja exportar sin contraseña.
  const clave = process.env.APPLE_PASS_P12_PASSWORD ?? "";
  const wwdr = process.env.APPLE_WWDR_PEM;
  const tipo = process.env.APPLE_PASS_TYPE_ID;
  const equipo = process.env.APPLE_TEAM_ID;
  if (!p12 || !wwdr || !tipo || !equipo) return null;
  return { p12, clave, wwdr: conSaltos(wwdr), tipo, equipo };
}

function credencialesGoogle() {
  const emisor = process.env.GOOGLE_WALLET_ISSUER_ID;
  const cuenta = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT;
  if (!emisor || !cuenta) return null;
  return { emisor, cuenta };
}

/**
 * Qué billetera se puede ofrecer hoy, según las variables que haya. Se lee en
 * el servidor y se le pasa a la pantalla, que atenúa el botón que no esté y
 * dice que viene pronto en vez de mandar a la persona a un error.
 */
export function disponibilidad(): Disponibilidad {
  return { apple: credencialesApple() !== null, google: credencialesGoogle() !== null };
}

// ---------------------------------------------------------------- Apple ----

type FaltaApple = { ok: false; falta: string };
type PaseApple = { ok: true; archivo: Buffer };

const FALTA_APPLE =
  "Apple Wallet necesita el certificado de Habi. Pídelo en el portal de Apple Developer (Pass Type ID) y guárdalo en las variables APPLE_PASS_P12_BASE64, APPLE_PASS_P12_PASSWORD, APPLE_WWDR_PEM, APPLE_PASS_TYPE_ID y APPLE_TEAM_ID.";

/**
 * Arma y firma el `.pkpass`.
 *
 * Un pase es un zip con `pass.json`, las imágenes, un `manifest.json` con el
 * SHA-1 de cada archivo y una firma PKCS#7 separada de ese manifiesto. Sin el
 * certificado de Apple no hay forma de firmarlo, y un pase sin firma el
 * teléfono lo rechaza sin decir por qué.
 *
 * El número de serie es el token del registro: así, si la persona vuelve a
 * bajar el pase, el teléfono lo reconoce como el mismo y lo reemplaza en vez
 * de duplicarlo.
 */
export async function paseApple(e: Entrada, sitio: string): Promise<PaseApple | FaltaApple> {
  const c = credencialesApple();
  if (!c) return { ok: false, falta: FALTA_APPLE };
  if (!e.qr) return { ok: false, falta: "Tu entrada todavía no tiene QR." };

  const pass = {
    formatVersion: 1,
    passTypeIdentifier: c.tipo,
    teamIdentifier: c.equipo,
    organizationName: "Habi",
    description: `${EVENT.fullName} · Entrada ${etiquetaTier(e.tier)}`,
    serialNumber: e.token,
    backgroundColor: COLOR_FONDO,
    foregroundColor: COLOR_TEXTO,
    labelColor: COLOR_ETIQUETA,
    relevantDate: EVENT.startsAt,
    expirationDate: VENCE,
    // La entrada es personal: sin esto, iOS ofrece «Compartir pase» y el QR
    // de una persona termina en el teléfono de otra.
    sharingProhibited: true,
    locations: [{ latitude: 4.66016, longitude: -74.0993, relevantText: `Estás en ${EVENT.venue}` }],
    // El mensaje del código es el QR de Luma tal cual: es lo que lee la puerta.
    barcodes: [{ format: "PKBarcodeFormatQR", message: e.qr, messageEncoding: "iso-8859-1", altText: etiquetaTier(e.tier) }],
    // Lo que Wallet usa para sugerir el pase a la hora y en el lugar del evento.
    semantics: {
      eventType: "PKEventTypeGeneric",
      eventName: EVENT.fullName,
      eventStartDate: EVENT.startsAt,
      venueName: EVENT.venue,
      venueLocation: { latitude: 4.66016, longitude: -74.0993 },
      attendeeName: e.nombre,
    },
    // Con `strip.png` la tarjeta lleva la franja de marca debajo de la
    // cabecera: la fecha, Bogotá y los asteriscos van pintados ahí. No hay
    // campo principal a propósito: Wallet lo pinta enorme sobre la franja y
    // un nombre largo se montaba sobre los asteriscos. El nombre va debajo,
    // a tamaño normal; el tipo de entrada arriba a la derecha.
    eventTicket: {
      headerFields: [{ key: "tier", label: "ENTRADA", value: etiquetaTier(e.tier) }],
      secondaryFields: [{ key: "nombre", label: "ASISTENTE", value: e.nombre }],
      // Sin hora: el horario del día todavía se está cerrando.
      auxiliaryFields: [
        { key: "sede", label: "LUGAR", value: "Centro de Convenciones Av. 68" },
        { key: "fecha", label: "FECHA", value: "20 oct 2026", textAlignment: "PKTextAlignmentRight" },
      ],
      backFields: [
        { key: "correo", label: "Correo", value: e.correo },
        // Sin la cédula: es la clave con la que se entra a la experiencia.
        {
          key: "credencial",
          label: "Tu credencial y tu carnet",
          value: `${sitio}/experiencia/carnet`,
        },
        { key: "agenda", label: "La agenda", value: `${sitio}/experiencia/agenda` },
        { key: "ayuda", label: "¿Dudas?", value: "Escríbenos por WhatsApp al +57 300 911 0459" },
      ],
    },
  };

  const archivos: Record<string, Buffer> = { "pass.json": Buffer.from(JSON.stringify(pass)) };
  for (const [nombre, b64] of Object.entries(RECURSOS_PASE)) archivos[nombre] = Buffer.from(b64, "base64");

  const manifest: Record<string, string> = {};
  for (const [nombre, contenido] of Object.entries(archivos)) {
    manifest[nombre] = crypto.createHash("sha1").update(contenido).digest("hex");
  }
  const manifestBuf = Buffer.from(JSON.stringify(manifest));

  // Firma PKCS#7 separada, que es lo que Apple valida en el teléfono.
  let bolsaCert: forge.pkcs12.Bag | undefined;
  let bolsaClave: forge.pkcs12.Bag | undefined;
  try {
    const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(Buffer.from(c.p12, "base64").toString("binary")));
    const p12Obj = forge.pkcs12.pkcs12FromAsn1(p12Asn1, c.clave);
    bolsaCert = p12Obj.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
    bolsaClave = p12Obj.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  } catch {
    return { ok: false, falta: "El certificado de Apple no se pudo abrir: revisa APPLE_PASS_P12_BASE64 y APPLE_PASS_P12_PASSWORD." };
  }
  if (!bolsaCert?.cert || !bolsaClave?.key) {
    return { ok: false, falta: "El certificado de Apple no se pudo abrir: revisa APPLE_PASS_P12_PASSWORD." };
  }

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifestBuf.toString("binary"));
  p7.addCertificate(bolsaCert.cert);
  p7.addCertificate(forge.pki.certificateFromPem(c.wwdr));
  p7.addSigner({
    key: bolsaClave.key as forge.pki.rsa.PrivateKey,
    certificate: bolsaCert.cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign({ detached: true });
  const firma = Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), "binary");

  return { ok: true, archivo: zip({ ...archivos, "manifest.json": manifestBuf, "signature": firma }) };
}

// --------------------------------------------------------------- Google ----

type FaltaGoogle = { ok: false; falta: string; transitorio?: boolean };
type PaseGoogle = { ok: true; url: string };

const FALTA_GOOGLE =
  "Google Wallet necesita la cuenta de la consola de Google Wallet. Crea el emisor, descarga la cuenta de servicio y guárdala en GOOGLE_WALLET_ISSUER_ID y GOOGLE_WALLET_SERVICE_ACCOUNT.";

const API_GOOGLE = "https://walletobjects.googleapis.com/walletobjects/v1";
const ALCANCE_GOOGLE = "https://www.googleapis.com/auth/wallet_object.issuer";
const ESPERA_GOOGLE = 8_000;
/** Tope para todo el diálogo con Google (token, clase y objeto): más allá, se le dice a la persona que reintente. */
const TOPE_GOOGLE = 20_000;

/** Solo letras, dígitos, `.`, `_` y `-`: lo que Google admite en un id. */
const ID_GOOGLE = /^[A-Za-z0-9._-]+$/;

type CuentaGoogle = { client_email: string; private_key: string; token_uri?: string };

/**
 * El id del objeto en Google, derivado del token y no el token mismo.
 *
 * Los tokens son base64url (`nuevoToken` en `seguridad.ts`), así que ya
 * cumplirían el patrón; pero el token es la llave del registro (abre `/p/` y
 * firma la bajada de la entrada) y el id del pase queda a la vista en la
 * consola de Google y en el teléfono. Un hash es igual de estable —la misma
 * persona siempre obtiene el mismo pase— sin regalar la llave.
 */
export function idObjetoGoogle(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex").slice(0, 40);
}

/** Un JWT RS256 firmado con la llave de la cuenta de servicio. */
function firmarJwtGoogle(cuenta: CuentaGoogle, carga: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const cabezaYcuerpo = `${b64({ alg: "RS256", typ: "JWT" })}.${b64(carga)}`;
  const firma = crypto.createSign("RSA-SHA256").update(cabezaYcuerpo).sign(conSaltos(cuenta.private_key), "base64url");
  return `${cabezaYcuerpo}.${firma}`;
}

/** Un 5xx, un 429 o un 408 de Google son pasajeros; lo demás es algo que corregir. */
const esPasajero = (status: number) => status >= 500 || status === 429 || status === 408;

/** Un tropiezo hablando con Google: `transitorio` si vale la pena reintentar. */
class ErrorGoogle extends Error {
  constructor(
    mensaje: string,
    readonly transitorio: boolean
  ) {
    super(mensaje);
  }
}

/**
 * El token OAuth2 de la cuenta de servicio, guardado en memoria mientras
 * valga: Google lo da por una hora y cada pase que se arma necesita dos o
 * tres llamadas, así que no tiene sentido pedir uno nuevo cada vez.
 */
let tokenGoogle: { valor: string; cuenta: string; vence: number } | null = null;

async function tokenDeAccesoGoogle(cuenta: CuentaGoogle, tope: AbortSignal): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  if (tokenGoogle && tokenGoogle.cuenta === cuenta.client_email && tokenGoogle.vence > ahora + 60) return tokenGoogle.valor;

  const tokenUri = cuenta.token_uri || "https://oauth2.googleapis.com/token";
  const afirmacion = firmarJwtGoogle(cuenta, { iss: cuenta.client_email, scope: ALCANCE_GOOGLE, aud: tokenUri, iat: ahora, exp: ahora + 600 });
  let res: Response;
  try {
    res = await fetch(tokenUri, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: afirmacion }),
      signal: AbortSignal.any([tope, AbortSignal.timeout(ESPERA_GOOGLE)]),
    });
  } catch {
    throw new ErrorGoogle("Google no respondió al pedir el token de la cuenta de servicio.", true);
  }
  const cuerpo = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !cuerpo.access_token) {
    // Un 200 sin token es una respuesta cortada o ilegible: pasajero.
    throw new ErrorGoogle(
      res.ok ? "Google no entregó el token de la cuenta de servicio." : `Google rechazó la cuenta de servicio: ${cuerpo.error_description ?? cuerpo.error ?? res.status}.`,
      res.ok || esPasajero(res.status)
    );
  }
  tokenGoogle = { valor: cuerpo.access_token, cuenta: cuenta.client_email, vence: ahora + (cuerpo.expires_in ?? 3600) };
  return cuerpo.access_token;
}

/** Una llamada a la API de Wallet; devuelve el estado y el cuerpo leído. */
async function llamarGoogle(token: string, metodo: "GET" | "POST" | "PUT", ruta: string, cuerpo: unknown, tope: AbortSignal): Promise<{ status: number; json: Record<string, unknown> }> {
  let res: Response;
  try {
    res = await fetch(`${API_GOOGLE}/${ruta}`, {
      method: metodo,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: AbortSignal.any([tope, AbortSignal.timeout(ESPERA_GOOGLE)]),
    });
  } catch {
    throw new ErrorGoogle("Google Wallet no respondió.", true);
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

function mensajeDeGoogle(json: Record<string, unknown>, status: number): string {
  const error = json.error as { message?: string } | undefined;
  return error?.message ?? `HTTP ${status}`;
}

/**
 * Crea o actualiza un recurso (clase u objeto): `POST` para crearlo y, si ya
 * existe (409), `PUT` para que lo que haya cambiado en el código llegue a
 * Google. Un 4xx distinto es un error de definición y se devuelve tal cual,
 * que es lo que hace falta leer para corregirlo; un 5xx o un 429 es pasajero.
 */
async function guardarEnGoogle(token: string, tipo: "eventTicketClass" | "eventTicketObject", recurso: { id: string }, tope: AbortSignal): Promise<void> {
  let r = await llamarGoogle(token, "POST", tipo, recurso, tope);
  if (r.status === 409) r = await llamarGoogle(token, "PUT", `${tipo}/${recurso.id}`, recurso, tope);
  if (r.status >= 200 && r.status < 300) return;
  if (r.status === 401) {
    // El token guardado ya no sirve (revocado o vencido antes de tiempo): se descarta y el siguiente intento pide otro.
    tokenGoogle = null;
    throw new ErrorGoogle("Google Wallet no aceptó el token de la cuenta de servicio; se pedirá uno nuevo.", true);
  }
  throw new ErrorGoogle(`Google Wallet rechazó ${tipo === "eventTicketClass" ? "la clase" : "el pase"}: ${mensajeDeGoogle(r.json, r.status)}`, esPasajero(r.status));
}

/** Qué clase ya quedó guardada en este proceso, para no repetir la llamada en cada pase. */
let claseGoogleLista: string | null = null;

/**
 * La clase del evento: lo que comparten todas las entradas (nombre, sede,
 * fecha, logo y color). Google la muestra tal cual en la tarjeta.
 */
function claseGoogle(id: string, sitio: string) {
  return {
    id,
    issuerName: "Habi",
    reviewStatus: "UNDER_REVIEW",
    // Como `sharingProhibited` en Apple: la primera cuenta que lo guarda es
    // la única; si no, el QR de una persona termina en el teléfono de otra.
    multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
    eventName: { defaultValue: { language: "es", value: EVENT.fullName } },
    // Google lo recorta en círculo: el asterisco va centrado con aire.
    logo: {
      sourceUri: { uri: `${sitio}/img/wallet/logo-pase.png` },
      contentDescription: { defaultValue: { language: "es", value: EVENT.name } },
    },
    hexBackgroundColor: "#07040d",
    venue: {
      name: { defaultValue: { language: "es", value: EVENT.venue } },
      address: { defaultValue: { language: "es", value: `${EVENT.venue}, ${EVENT.city}` } },
    },
    dateTime: { start: EVENT.startsAt },
  };
}

/** La entrada de una persona: su nombre, su tipo y el QR de Luma tal cual. */
function objetoGoogle(id: string, clase: string, e: Entrada, sitio: string) {
  return {
    id,
    classId: clase,
    state: "ACTIVE",
    hexBackgroundColor: "#07040d",
    // El valor del código es el QR de Luma tal cual: es lo que lee la puerta.
    barcode: { type: "QR_CODE", value: e.qr, alternateText: etiquetaTier(e.tier) },
    ticketHolderName: e.nombre,
    ticketType: { defaultValue: { language: "es", value: `Entrada ${etiquetaTier(e.tier)}` } },
    linksModuleData: {
      uris: [
        { uri: `${sitio}/experiencia/carnet`, description: "Tu credencial y tu carnet", id: "carnet" },
        { uri: `${sitio}/experiencia/agenda`, description: "La agenda del día", id: "agenda" },
        { uri: "https://wa.me/573009110459", description: "Escríbenos por WhatsApp", id: "whatsapp" },
      ],
    },
    // Sin la cédula: en la puerta se lee el QR, y la cédula es la clave con
    // la que se entra a la experiencia; no va en algo que se muestra.
    textModulesData: [{ header: "Lugar", body: `${EVENT.venue}, ${EVENT.city}`, id: "lugar" }],
  };
}

/**
 * El enlace de «Guardar en Google Wallet».
 *
 * Google acepta el pase incrustado en el enlace, pero con la clase y el
 * objeto completos el JWT pasa de los 1800 caracteres que Google da por
 * seguros y el guardado puede fallar sin decir nada. Por eso primero se
 * guardan la clase y el objeto con la API de Wallet —que además valida cada
 * campo y responde con el error exacto— y el enlace lleva solo el id del
 * objeto firmado. Si la persona vuelve a pedir el pase, el objeto se actualiza
 * (mismo id) y el teléfono lo reconoce como el mismo pase.
 */
export async function paseGoogle(e: Entrada, sitio: string): Promise<PaseGoogle | FaltaGoogle> {
  const c = credencialesGoogle();
  if (!c) return { ok: false, falta: FALTA_GOOGLE };
  if (!e.qr) return { ok: false, falta: "Tu entrada todavía no tiene QR." };

  let cuenta: Partial<CuentaGoogle>;
  try {
    cuenta = JSON.parse(c.cuenta);
  } catch {
    return { ok: false, falta: "GOOGLE_WALLET_SERVICE_ACCOUNT no es un JSON válido." };
  }
  if (!cuenta.client_email || !cuenta.private_key) {
    return { ok: false, falta: "A la cuenta de servicio de Google le faltan client_email o private_key." };
  }
  const cuentaCompleta = cuenta as CuentaGoogle;

  const clase = `${c.emisor}.habinext2026`;
  const idObjeto = `${c.emisor}.${idObjetoGoogle(e.token)}`;
  if (!ID_GOOGLE.test(idObjeto) || !ID_GOOGLE.test(clase)) {
    return { ok: false, falta: "GOOGLE_WALLET_ISSUER_ID trae caracteres que Google no admite en un id." };
  }

  const tope = AbortSignal.timeout(TOPE_GOOGLE);
  try {
    const token = await tokenDeAccesoGoogle(cuentaCompleta, tope);
    if (claseGoogleLista !== clase) {
      await guardarEnGoogle(token, "eventTicketClass", claseGoogle(clase, sitio), tope);
      claseGoogleLista = clase;
    }
    await guardarEnGoogle(token, "eventTicketObject", objetoGoogle(idObjeto, clase, e, sitio), tope);
  } catch (error) {
    if (error instanceof ErrorGoogle) return { ok: false, falta: error.message, transitorio: error.transitorio };
    // Lo único que firma acá es la llave: si falla, es la llave.
    return { ok: false, falta: "La private_key de GOOGLE_WALLET_SERVICE_ACCOUNT no sirve para firmar: vuelve a pegar el JSON completo." };
  }

  const ahora = Math.floor(Date.now() / 1000);
  let jwt: string;
  try {
    jwt = firmarJwtGoogle(cuentaCompleta, {
      iss: cuentaCompleta.client_email,
      aud: "google",
      typ: "savetowallet",
      iat: ahora,
      origins: [sitio],
      payload: { eventTicketObjects: [{ id: idObjeto }] },
    });
  } catch {
    return { ok: false, falta: "La private_key de GOOGLE_WALLET_SERVICE_ACCOUNT no sirve para firmar: vuelve a pegar el JSON completo." };
  }
  return { ok: true, url: `https://pay.google.com/gp/v/save/${jwt}` };
}
