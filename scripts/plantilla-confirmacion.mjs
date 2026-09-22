// Registra la plantilla UTILITY de confirmación de entrada (flujo «pagar primero»).
//   node --env-file=.env.local scripts/plantilla-confirmacion.mjs
// Cuando quede APPROVED, su nombre va en INFOBIP_TPL_CONFIRMACION.
const base = (() => { const b = String(process.env.INFOBIP_BASE_URL || "").replace(/\/+$/, ""); return b.startsWith("http") ? b : `https://${b}`; })();
const linea = process.env.INFOBIP_LINEA_CO;
const fecha = new Date().toISOString().slice(2, 10).split("-").reverse().join("");
const name = `habinext_entrada_confirmada_co_${fecha}`;
const body = [
  "¡Hola {{1}}! 🎉",
  "",
  "Tu entrada *{{2}}* para *Habi Next Colombia* ya está confirmada. Recibimos tu pago y quedaste dentro.",
  "",
  "Acabamos de mandarte la entrada al correo con el que compraste: ahí va tu código QR, que es lo que te van a pedir en la puerta. Si no la ves, revisa la carpeta de spam.",
  "",
  "Te esperamos el *martes 20 de octubre* en el Centro de Convenciones Avenida 68, Bogotá. Mientras llega el día, arma tu carnet en habinext.com/experiencia y empieza a sumar puntos. 💜",
].join("\n");
const res = await fetch(`${base}/whatsapp/2/senders/${encodeURIComponent(linea)}/templates`, {
  method: "POST",
  headers: { Authorization: `App ${process.env.INFOBIP_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ name, language: "es_CO", category: "UTILITY", structure: { body: { text: body, examples: ["Felipe", "General"] }, buttons: [{ type: "QUICK_REPLY", text: "No me llegó" }], type: "TEXT" } }),
});
const data = await res.json().catch(() => null);
console.log(name, res.ok ? `OK (${data?.status ?? "creada"})` : `FALLO ${res.status}`, res.ok ? "" : JSON.stringify(data).slice(0, 300));
