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
 * que hay que conseguir, y la pantalla lo muestra en vez de fallar en blanco.
 * Preferimos eso a esconder el botón: así queda a la vista lo que falta para
 * que la entrada viva en el teléfono.
 */

import { zip } from "./zip";
import crypto from "node:crypto";
import forge from "node-forge";
import { EVENT } from "@/config/event";
import type { Entrada } from "./entrada";

const COLOR_FONDO = "rgb(7,4,13)";
const COLOR_TEXTO = "rgb(255,255,255)";
const COLOR_ETIQUETA = "rgb(186,157,250)";

const etiquetaTier = (t: Entrada["tier"]) => (t === "vip" ? "VIP" : "General");

// ---------------------------------------------------------------- Apple ----

type FaltaApple = { ok: false; falta: string };
type PaseApple = { ok: true; archivo: Buffer };

/**
 * Arma y firma el `.pkpass`.
 *
 * Un pase es un zip con `pass.json`, las imágenes, un `manifest.json` con el
 * SHA-1 de cada archivo y una firma PKCS#7 separada de ese manifiesto. Sin el
 * certificado de Apple no hay forma de firmarlo, y un pase sin firma el
 * teléfono lo rechaza sin decir por qué.
 */
export async function paseApple(e: Entrada, sitio: string): Promise<PaseApple | FaltaApple> {
  const p12 = process.env.APPLE_PASS_P12_BASE64;
  const clave = process.env.APPLE_PASS_P12_PASSWORD ?? "";
  const wwdr = process.env.APPLE_WWDR_PEM;
  const tipo = process.env.APPLE_PASS_TYPE_ID;
  const equipo = process.env.APPLE_TEAM_ID;

  if (!p12 || !wwdr || !tipo || !equipo) {
    return {
      ok: false,
      falta:
        "Apple Wallet necesita el certificado de Habi. Pídelo en el portal de Apple Developer (Pass Type ID) y guárdalo en las variables APPLE_PASS_P12_BASE64, APPLE_PASS_P12_PASSWORD, APPLE_WWDR_PEM, APPLE_PASS_TYPE_ID y APPLE_TEAM_ID.",
    };
  }
  if (!e.qr) return { ok: false, falta: "Tu entrada todavía no tiene QR." };

  const pass = {
    formatVersion: 1,
    passTypeIdentifier: tipo,
    teamIdentifier: equipo,
    organizationName: "Habi",
    description: `${EVENT.fullName} · Entrada ${etiquetaTier(e.tier)}`,
    serialNumber: e.token,
    backgroundColor: COLOR_FONDO,
    foregroundColor: COLOR_TEXTO,
    labelColor: COLOR_ETIQUETA,
    logoText: EVENT.name,
    relevantDate: EVENT.startsAt,
    locations: [{ latitude: 4.66016, longitude: -74.0993, relevantText: `Estás en ${EVENT.venue}` }],
    barcodes: [{ format: "PKBarcodeFormatQR", message: e.qr, messageEncoding: "iso-8859-1", altText: etiquetaTier(e.tier) }],
    eventTicket: {
      headerFields: [{ key: "tier", label: "ENTRADA", value: etiquetaTier(e.tier) }],
      primaryFields: [{ key: "evento", label: "EVENTO", value: EVENT.fullName }],
      secondaryFields: [
        { key: "nombre", label: "ASISTENTE", value: e.nombre },
        { key: "fecha", label: "FECHA", value: "20 oct 2026" },
      ],
      auxiliaryFields: [
        { key: "sede", label: "LUGAR", value: EVENT.venue },
        { key: "hora", label: "HORA", value: "9:00 a. m." },
      ],
      backFields: [
        { key: "correo", label: "Correo", value: e.correo },
        ...(e.cedula ? [{ key: "cedula", label: "Documento", value: e.cedula }] : []),
        { key: "agenda", label: "La agenda", value: `${sitio}/experiencia/agenda` },
        { key: "ayuda", label: "¿Dudas?", value: "Escríbenos por WhatsApp al +57 300 911 0459" },
      ],
    },
  };

  const archivos: Record<string, Buffer> = { "pass.json": Buffer.from(JSON.stringify(pass)) };
  for (const [nombre, env] of [
    ["icon.png", "APPLE_PASS_ICON_BASE64"],
    ["icon@2x.png", "APPLE_PASS_ICON2X_BASE64"],
    ["logo.png", "APPLE_PASS_LOGO_BASE64"],
    ["logo@2x.png", "APPLE_PASS_LOGO2X_BASE64"],
  ] as const) {
    const b64 = process.env[env];
    if (b64) archivos[nombre] = Buffer.from(b64, "base64");
  }
  if (!archivos["icon.png"]) {
    return { ok: false, falta: "Falta el ícono del pase (APPLE_PASS_ICON_BASE64): Apple lo exige, de 29×29 px." };
  }

  const manifest: Record<string, string> = {};
  for (const [nombre, contenido] of Object.entries(archivos)) {
    manifest[nombre] = crypto.createHash("sha1").update(contenido).digest("hex");
  }
  const manifestBuf = Buffer.from(JSON.stringify(manifest));

  // Firma PKCS#7 separada, que es lo que Apple valida en el teléfono.
  const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(Buffer.from(p12, "base64").toString("binary")));
  const p12Obj = forge.pkcs12.pkcs12FromAsn1(p12Asn1, clave);
  const bolsaCert = p12Obj.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
  const bolsaClave = p12Obj.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
    forge.pki.oids.pkcs8ShroudedKeyBag
  ]?.[0];
  if (!bolsaCert?.cert || !bolsaClave?.key) {
    return { ok: false, falta: "El certificado de Apple no se pudo abrir: revisa APPLE_PASS_P12_PASSWORD." };
  }

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifestBuf.toString("binary"));
  p7.addCertificate(bolsaCert.cert);
  p7.addCertificate(forge.pki.certificateFromPem(wwdr));
  p7.addSigner({
    key: bolsaClave.key as forge.pki.rsa.PrivateKey,
    certificate: bolsaCert.cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date().toISOString() },
    ],
  });
  p7.sign({ detached: true });
  const firma = Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), "binary");

  return { ok: true, archivo: zip({ ...archivos, "manifest.json": manifestBuf, "signature": firma }) };
}

type FaltaGoogle = { ok: false; falta: string };
type PaseGoogle = { ok: true; url: string };

/**
 * El enlace de «Guardar en Google Wallet».
 *
 * Google acepta el objeto del pase incrustado en el JWT, así que no hace falta
 * llamar a su API antes: se firma con la cuenta de servicio y se manda a la
 * persona al enlace. Si el objeto ya existe, Google lo reconoce por su id.
 */

export function paseGoogle(e: Entrada, sitio: string): PaseGoogle | FaltaGoogle {
  const emisor = process.env.GOOGLE_WALLET_ISSUER_ID;
  const cuentaCruda = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT;
  if (!emisor || !cuentaCruda) {
    return {
      ok: false,
      falta:
        "Google Wallet necesita la cuenta de la consola de Google Wallet. Crea el emisor, descarga la cuenta de servicio y guárdala en GOOGLE_WALLET_ISSUER_ID y GOOGLE_WALLET_SERVICE_ACCOUNT.",
    };
  }
  if (!e.qr) return { ok: false, falta: "Tu entrada todavía no tiene QR." };

  let cuenta: { client_email?: string; private_key?: string };
  try {
    cuenta = JSON.parse(cuentaCruda);
  } catch {
    return { ok: false, falta: "GOOGLE_WALLET_SERVICE_ACCOUNT no es un JSON válido." };
  }
  if (!cuenta.client_email || !cuenta.private_key) {
    return { ok: false, falta: "A la cuenta de servicio de Google le faltan client_email o private_key." };
  }

  const clase = `${emisor}.habinext2026`;
  const objeto = {
    id: `${emisor}.${e.token}`,
    classId: clase,
    state: "ACTIVE",
    hexBackgroundColor: "#07040d",
    barcode: { type: "QR_CODE", value: e.qr, alternateText: etiquetaTier(e.tier) },
    ticketHolderName: e.nombre,
    ticketType: { defaultValue: { language: "es", value: `Entrada ${etiquetaTier(e.tier)}` } },
    linksModuleData: {
      uris: [
        { uri: `${sitio}/experiencia/agenda`, description: "La agenda del día" },
        { uri: "https://wa.me/573009110459", description: "Escríbenos por WhatsApp" },
      ],
    },
    textModulesData: [
      { header: "Lugar", body: `${EVENT.venue}, ${EVENT.city}`, id: "lugar" },
      ...(e.cedula ? [{ header: "Documento", body: e.cedula, id: "cedula" }] : []),
    ],
  };

  const claseDef = {
    id: clase,
    issuerName: "Habi",
    reviewStatus: "UNDER_REVIEW",
    eventName: { defaultValue: { language: "es", value: EVENT.fullName } },
    venue: {
      name: { defaultValue: { language: "es", value: EVENT.venue } },
      address: { defaultValue: { language: "es", value: `${EVENT.venue}, ${EVENT.city}` } },
    },
    dateTime: { start: EVENT.startsAt },
  };

  const ahora = Math.floor(Date.now() / 1000);
  const carga = {
    iss: cuenta.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: ahora,
    origins: [sitio],
    payload: { eventTicketClasses: [claseDef], eventTicketObjects: [objeto] },
  };

  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const cabezaYcuerpo = `${b64({ alg: "RS256", typ: "JWT" })}.${b64(carga)}`;
  const firma = crypto
    .createSign("RSA-SHA256")
    .update(cabezaYcuerpo)
    .sign(cuenta.private_key.replace(/\\n/g, "\n"), "base64url");

  return { ok: true, url: `https://pay.google.com/gp/v/save/${cabezaYcuerpo}.${firma}` };
}
