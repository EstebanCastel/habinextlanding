import { NextResponse } from "next/server";
import { pasarAVip } from "@/lib/bot";
import { nuevoId } from "@/lib/experiencia";
import { agregarInvitadoConRespaldo, buscarInvitadoPorEmail, eventoDeTier, listarInvitadosConQr } from "@/lib/luma";
import { crearCortesia, normalizarCedula, porToken, reservarCorreo, todos as todosLosRegistros, type Tier } from "@/lib/registros";
import { armarPadron, pkDeQr, traerPadron } from "@/lib/validacion";
import { escribir } from "@/lib/almacen";

/**
 * Dar de alta a alguien en la puerta, en el acto.
 *
 * El día del evento llega gente que debería estar y no está: el código se
 * perdió en un correo, el acompañante que nadie anotó, el aliado que invitaron
 * por teléfono. Hasta ahora eso se resolvía creando un código a mano con un
 * script, o peor, con un deploy. Veinte minutos con la persona esperando en
 * la puerta.
 *
 * Esto lo hace en diez segundos: crea al invitado en Luma **ya aprobado**,
 * le deja su registro para que entre a la experiencia con su cédula, y lo
 * mete en el padrón de la puerta de una vez, sin esperar al refresco de los
 * diez minutos. Devuelve su QR para que pase ahí mismo.
 *
 * Pide llave. Es lo único de `/validacion` que la pide, y es por lo que hace:
 * leer un QR no crea nada, pero esto emite una entrada de verdad y ocupa una
 * silla. La llave va en el enlace, así que para quien la usa sigue siendo un
 * marcador que se abre y ya.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sinCache = { "Cache-Control": "no-store" };
const responder = (dato: unknown, status = 200) => NextResponse.json(dato, { status, headers: sinCache });

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function autorizado(request: Request): boolean {
  const esperado = process.env.ADMIN_TOKEN ?? "";
  if (!esperado) return false;
  const u = new URL(request.url);
  return u.searchParams.get("k") === esperado;
}

export async function POST(request: Request) {
  if (!autorizado(request)) return responder({ ok: false, error: "Falta la llave." }, 401);

  const crudo = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  // Pasar a VIP a alguien que ya tiene su General. No crea una entrada nueva:
  // mueve la que ya tiene, le da de baja la General para que no ocupe dos
  // sillas, y le deja el QR del evento VIP.
  if (String(crudo?.accion ?? "") === "upgrade") {
    const correo = String(crudo?.email ?? "").trim().toLowerCase();
    const cedula = normalizarCedula(crudo?.cedula);
    if (!correo && !cedula) return responder({ ok: false, error: "Dame el correo o la cédula." }, 400);

    const todos = await todosLosRegistros().catch(() => []);
    const suyos = todos
      .filter((r) => {
        const porCorreo = correo && (r.luma.email ?? "").toLowerCase() === correo;
        const porCedula = cedula && r.luma.cedula === cedula;
        return (porCorreo || porCedula) && r.etapa !== "rechazado";
      })
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));

    // El que de verdad tiene entrada: aprobado y con invitado en Luma. Un
    // registro de «pago abierto» que nunca se completó no es su entrada.
    const suyo = suyos.find((r) => r.etapa === "aprobado" && r.luma.guestId) ?? suyos[0];
    if (!suyo) return responder({ ok: false, error: "No encontramos a esa persona." }, 404);
    if (suyo.tier === "vip") {
      return responder({ ok: true, yaEraVip: true, nombre: suyo.luma.nombre, email: suyo.luma.email, nota: "Ya era VIP." });
    }

    const r = await pasarAVip(suyo, { pagado: true, decididoPor: `puerta · ${String(crudo?.por ?? "upgrade")}` });
    if (!r.ok) return responder({ ok: false, error: r.nota }, 502);

    const despues = await porToken(suyo.token).catch(() => null);
    const qr = despues?.luma.guestId
      ? (await listarInvitadosConQr(eventoDeTier("vip") ?? "").catch(() => [])).find((g) => g.id === despues.luma.guestId)?.qr ?? ""
      : "";

    // Que la puerta lo vea VIP de inmediato, sin esperar el refresco.
    const padron = await traerPadron().catch(() => null);
    const id = pkDeQr(qr);
    if (padron && id) {
      padron.gente = padron.gente.filter((g) => (g.correo ?? "").toLowerCase() !== (suyo.luma.email ?? "").toLowerCase());
      padron.gente.push({ id, tipo: "vip", nombre: suyo.luma.nombre, correo: suyo.luma.email });
      await escribir("validacion/padron.json", padron).catch(() => null);
    }

    return responder({
      ok: true,
      upgrade: true,
      nombre: suyo.luma.nombre,
      email: suyo.luma.email,
      tier: "vip",
      qr,
      nota: `${r.nota}. Ya es VIP y le quitamos la General.`,
    });
  }

  const cuerpo = crudo as {
    nombre?: unknown;
    email?: unknown;
    tier?: unknown;
    telefono?: unknown;
    cedula?: unknown;
    por?: unknown;
  } | null;

  const nombre = String(cuerpo?.nombre ?? "").trim().slice(0, 80);
  const email = String(cuerpo?.email ?? "").trim().toLowerCase();
  const tier: Tier = cuerpo?.tier === "vip" ? "vip" : "general";
  const telefonoCrudo = String(cuerpo?.telefono ?? "").trim() || null;
  const cedula = normalizarCedula(cuerpo?.cedula);
  const por = String(cuerpo?.por ?? "").trim().slice(0, 40) || "puerta";

  if (nombre.length < 3) return responder({ ok: false, error: "Escribe el nombre completo." }, 400);
  if (!CORREO.test(email)) return responder({ ok: false, error: "Ese correo no se ve bien." }, 400);

  const eventId = eventoDeTier(tier);
  if (!eventId) return responder({ ok: false, error: `No está configurado el evento ${tier}.` }, 500);

  // ¿Ya estaba? Entonces no se crea otro: se le devuelve el suyo. En la puerta
  // esto pasa todo el tiempo —la persona no se acuerda de si redimió— y
  // duplicarla en Luma le parte la entrada en dos.
  const previo = await buscarInvitadoPorEmail(eventId, email).catch(() => null);
  if (previo) {
    const conQr = (await listarInvitadosConQr(eventId).catch(() => [])).find((g) => g.id === previo.id);
    return responder({
      ok: true,
      yaEstaba: true,
      tier,
      email,
      estado: previo.estado,
      qr: conQr?.qr ?? "",
      nota:
        previo.estado === "approved"
          ? "Ya tenía su entrada aprobada. Este es su QR."
          : `Ya estaba en Luma, en estado ${previo.estado}.`,
    });
  }

  // El correo se reserva antes del alta: ese alta dispara un webhook de Luma
  // que, sin la reserva, abriría un registro paralelo y partiría a la persona.
  const token = nuevoId();
  await reservarCorreo(email, token).catch(() => null);

  const alta = await agregarInvitadoConRespaldo(eventId, {
    email,
    nombre,
    aprobado: true,
    ...(cedula ? { respuestas: [{ id: "cedula", tipo: "text", valor: cedula }] } : {}),
  }).catch(() => null);

  if (!alta?.ok) {
    return responder({ ok: false, error: "Luma no aceptó el alta. Intenta otra vez o créalo desde Luma." }, 502);
  }

  const invitado = await buscarInvitadoPorEmail(eventId, alta.email).catch(() => null);
  if (!invitado) {
    return responder({ ok: false, error: "Se creó en Luma pero no lo encontramos de vuelta. Míralo en el panel." }, 502);
  }

  const ahora = new Date().toISOString();
  await crearCortesia({
    token,
    tier,
    codigo: `puerta:${por}`,
    guestId: invitado.id,
    eventId,
    email: alta.email,
    nombre,
    telefonoCrudo,
    ...(cedula ? { cedula } : {}),
    origen: "puerta",
    redimidoEn: ahora,
  }).catch(() => null);

  // Su QR, y el padrón al día en el acto: si espera al refresco de los diez
  // minutos, la persona que acabamos de crear no pasa por la puerta.
  const conQr = (await listarInvitadosConQr(eventId).catch(() => [])).find((g) => g.id === invitado.id);
  const qr = conQr?.qr ?? "";

  const padron = await traerPadron().catch(() => null);
  const id = pkDeQr(qr) || invitado.id;
  if (padron && id && !padron.gente.some((g) => g.id === id)) {
    padron.gente.push({ id, tipo: tier, nombre, correo: alta.email });
    await escribir("validacion/padron.json", padron).catch(() => null);
  } else if (!padron) {
    await armarPadron().catch(() => null);
  }

  return responder({
    ok: true,
    creado: true,
    tier,
    email: alta.email,
    conAlias: alta.conAlias,
    nombre,
    qr,
    enPadron: Boolean(id),
    nota: alta.conAlias
      ? `Luma no aceptó ${email} y quedó como ${alta.email}. Avísale con cuál entra.`
      : "Listo. Ya puede pasar por la puerta y entrar a la experiencia con su cédula.",
  });
}
