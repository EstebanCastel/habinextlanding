import { after, NextResponse } from "next/server";
import { darLaBienvenida, pasarAVip } from "@/lib/bot";
import {
  CANALES,
  correrCampana,
  crearCampana,
  enviarRecordatorio,
  pendientesDePago,
  type Canal,
} from "@/lib/recuperacion";
import { cambiarEstado, crear as crearCodigo } from "@/lib/codigos";
import { crear as crearEnlace } from "@/lib/enlaces";
import { anotar, porToken, todos as todosLosRegistros } from "@/lib/registros";
import { igualSeguro } from "@/lib/seguridad";
import { cabecerasDeCookie, claveAdmin, haySesion } from "@/lib/sesion";

/**
 * Acciones del panel de operación. Todo entra por formularios del propio panel
 * (`SameSite=Strict` y sesión obligatoria) y vuelve al panel con un redirect,
 * para que recargar la página no repita la acción.
 *
 * **Aquí no se aprueba a nadie.** Aprobar y rechazar se hacen desde Luma, que
 * es donde está la lista de invitados y donde el botón existe de verdad; este
 * servicio se entera por el webhook `guest.updated` y le avisa a la persona por
 * WhatsApp. Lo que queda acá son las dos cosas que Luma no puede hacer: volver
 * a mandar el mensaje y pasar a alguien de General a VIP.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** La campaña de recordatorios corre en `after()` y necesita más que el tiempo por defecto. */
export const maxDuration = 300;

function sitio(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
}

function volver(mensaje: string) {
  return NextResponse.redirect(`${sitio()}/admin?aviso=${encodeURIComponent(mensaje)}`, {
    status: 303,
  });
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "petición inválida" }, { status: 400 });

  const accion = String(form.get("accion") ?? "");

  // ---------- entrar / salir ----------
  if (accion === "entrar") {
    const clave = claveAdmin();
    const dada = String(form.get("clave") ?? "");
    if (!clave || !igualSeguro(dada, clave)) {
      // Espera fija ante el fallo: no acelera un ataque por fuerza bruta, pero
      // sí lo vuelve caro contra una función serverless.
      await new Promise((r) => setTimeout(r, 700));
      return NextResponse.redirect(`${sitio()}/admin?error=1`, { status: 303 });
    }
    return NextResponse.redirect(`${sitio()}/admin`, {
      status: 303,
      headers: cabecerasDeCookie(clave, 60 * 60 * 12),
    });
  }

  if (accion === "salir") {
    return NextResponse.redirect(`${sitio()}/admin`, {
      status: 303,
      headers: cabecerasDeCookie("", 0),
    });
  }

  // ---------- de aquí en adelante hace falta sesión ----------
  if (!(await haySesion())) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  // ---------- códigos de invitación ----------
  if (accion === "crear-codigo") {
    const vence = String(form.get("vence") ?? "").trim();
    const res = await crearCodigo({
      codigo: String(form.get("codigo") ?? ""),
      sirvePara: (["general", "vip", "ambos"] as const).includes(
        String(form.get("sirve") ?? "") as "general" | "vip" | "ambos"
      )
        ? (String(form.get("sirve")) as "general" | "vip" | "ambos")
        : "ambos",
      usosMaximos: Number(form.get("usos") ?? 1) || 0,
      // El día que se elige vale entero: vence al final de esa jornada en
      // Bogotá, no a la medianoche del día anterior en UTC.
      venceEl: vence ? `${vence}T23:59:59-05:00` : null,
      nota: String(form.get("nota") ?? "").trim() || undefined,
    });
    return volver(res.nota);
  }

  if (accion === "codigo-estado") {
    const codigo = String(form.get("codigo") ?? "");
    const activar = String(form.get("activo") ?? "") === "1";
    const ok = await cambiarEstado(codigo, activar);
    return volver(
      ok
        ? `${codigo.toUpperCase()} quedó ${activar ? "activo" : "desactivado"}`
        : "No encontramos ese código"
    );
  }

  // ---------- enlaces cortos ----------
  if (accion === "crear-enlace") {
    const res = await crearEnlace({
      slug: String(form.get("slug") ?? ""),
      destino: String(form.get("destino") ?? "/"),
      source: String(form.get("source") ?? ""),
      medium: String(form.get("medium") ?? "social"),
      campaign: String(form.get("campaign") ?? "habinext-2026"),
      content: String(form.get("content") ?? ""),
      nota: String(form.get("nota") ?? ""),
      metaGeneral: Number(form.get("metaGeneral") ?? 0) || 0,
      metaVip: Number(form.get("metaVip") ?? 0) || 0,
      ...(String(form.get("persona") ?? "").trim()
        ? {
            persona: {
              nombre: String(form.get("persona")).trim(),
              email: String(form.get("email") ?? "").trim(),
            },
          }
        : {}),
    });
    return volver(res.nota);
  }

  // ---------- recuperación de pago ----------
  if (accion === "recuperar-probar" || accion === "recuperar-enviar" || accion === "recuperar-continuar") {
    if (!(await haySesion())) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
    const canales = form.getAll("canal").map(String).filter((c): c is Canal => (CANALES as string[]).includes(c));
    const ancla = "#recuperacion";

    if (accion === "recuperar-continuar") {
      const id = String(form.get("campana") ?? "");
      if (!id) return volver("No sé qué campaña continuar" + ancla);
      after(() => correrCampana(id).catch((e: Error) => console.error("[recuperacion] continuar:", e.message)));
      return volver("Continuando la campaña. Recarga en un minuto para ver el avance." + ancla);
    }

    if (!canales.length) return volver("Elige al menos un canal" + ancla);
    const registros = await todosLosRegistros();
    const pendientes = pendientesDePago(registros);

    if (accion === "recuperar-probar") {
      const tier = String(form.get("tier") ?? "general") === "vip" ? "vip" : "general";
      const muestra = pendientes.find((r) => r.tier === tier) ?? pendientes[0];
      if (!muestra) return volver("No hay ningún pendiente con el que armar la prueba" + ancla);
      const telefono = (process.env.WHATSAPP_ESCALAMIENTO || "").replace(/\D/g, "") || undefined;
      const email = process.env.CAMPANA_REPLY_TO || undefined;
      const res = await enviarRecordatorio(muestra, canales, { telefono, email });
      const partes = canales.map((c) => {
        const x = res[c];
        return `${c}: ${x?.ok ? "enviado" : x?.omitido || x?.error || "sin resultado"}`;
      });
      return volver(`Prueba con los datos de ${muestra.luma.nombreCorto} (${tier}) → ${partes.join(" · ")}` + ancla);
    }

    // recuperar-enviar
    if (String(form.get("seguro") ?? "") !== "1") return volver("Marca la casilla de confirmación para enviar" + ancla);
    if (!pendientes.length) return volver("No hay pendientes a quienes recordarles" + ancla);
    const campana = await crearCampana(canales, pendientes.map((r) => r.token));
    after(() => correrCampana(campana.id).catch((e: Error) => console.error("[recuperacion] campaña:", e.message)));
    return volver(
      `Campaña en marcha: ${pendientes.length} personas por ${canales.join(", ")}. Recarga en un par de minutos para ver el avance.` + ancla
    );
  }

  const token = String(form.get("token") ?? "");
  const registro = token ? await porToken(token) : null;
  if (!registro) return volver("No encontramos ese registro");

  // ---------- reenviar el mensaje ----------
  if (accion === "reenviar") {
    if (!registro.telefono) return volver("Ese registro no tiene un celular usable");

    // `darLaBienvenida` no reescribe si ya se mandó, así que se limpia la marca
    // para forzar el reenvío: es justo lo que se le pide al botón.
    await anotar(registro.token, "reenvío pedido desde el panel", (r) => ({
      whatsapp: { ...r.whatsapp, enviadoEn: undefined },
    }));
    const refrescado = await porToken(registro.token);
    if (refrescado) await darLaBienvenida(refrescado);

    const final = await porToken(registro.token);
    return volver(
      final?.whatsapp.enviadoEn && !final.whatsapp.error
        ? `Mensaje reenviado a ${registro.luma.nombre}`
        : `No se pudo reenviar: ${final?.whatsapp.error ?? "sin detalle"}`
    );
  }

  // ---------- pasar a VIP a mano ----------
  if (accion === "pasar-a-vip") {
    if (registro.tier === "vip") return volver("Esa persona ya es VIP");
    const res = await pasarAVip(registro);
    return volver(
      res.ok
        ? `${registro.luma.nombre} pasó a VIP y ya tiene su link de pago`
        : `No se pudo pasar a VIP: ${res.nota}`
    );
  }

  return volver("Acción desconocida");
}
