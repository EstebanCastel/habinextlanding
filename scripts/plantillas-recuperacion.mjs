// Registra en Meta (vía Infobip) las dos plantillas del recordatorio de pago.
//
//   node --env-file=.env.local scripts/plantillas-recuperacion.mjs
//
// Meta veda reusar un nombre durante cuatro semanas, así que el nombre lleva la
// fecha. Cuando queden APPROVED (suele tardar unos minutos), sus nombres van a
// INFOBIP_TPL_RECUPERA_GENERAL e INFOBIP_TPL_RECUPERA_VIP en Vercel.
//
// La cabecera es de imagen: Meta exige una imagen de ejemplo pública al
// registrar (`header.example`), y la pieza real viaja en cada envío como
// `mediaUrl`. El botón URL no se usa porque Meta rechaza botones hacia un
// dominio sin verificar; el link va escrito en el cuerpo con el token al final.

const base = (() => {
  const b = String(process.env.INFOBIP_BASE_URL || "").replace(/\/+$/, "");
  return b.startsWith("http") ? b : `https://${b}`;
})();
const linea = process.env.INFOBIP_LINEA_CO;
const sitio = process.env.NEXT_PUBLIC_SITE_URL || "https://www.habinext.com";
const fecha = new Date().toISOString().slice(2, 10).split("-").reverse().join(""); // ddmmyy

const cuerpo = (tier) => {
  const esVip = tier === "vip";
  const sube = esVip
    ? "Pero el precio no espera: el *5 de octubre* la entrada VIP sube de *$350.000 a $450.000*."
    : "Pero el precio no espera: el *5 de octubre* la entrada General sube de *$220.000 a $290.000*.";
  const que = esVip
    ? "Solo hay 250 cupos VIP: primeras filas, zona VIP con barra de snacks y bebidas, almuerzo, kit premium, material exclusivo y tu avatar digital."
    : "Un día completo para aprender a usar Inteligencia Artificial en tu negocio inmobiliario: atraer más clientes, crear contenido, organizar tus oportunidades y construir un asistente que trabaje por ti 24/7.";
  return [
    `Hola {{1}} 👋 Tu cupo ${esVip ? "VIP" : "General"} en Habi Next Colombia sigue reservado 🎟️`,
    "",
    sube,
    "",
    "📅 Martes 20 de octubre de 2026 · Centro de Convenciones Avenida 68, Bogotá",
    que,
    "",
    "Asegura tu entrada con tu link personal de pago 👇",
    `${sitio}/p/{{2}}`,
    "",
    "Apenas pagues, mándanos el comprobante por acá y te aprobamos en el momento.",
  ].join("\n");
};

const plantillas = [
  {
    tier: "general",
    name: `habinext_recupera_general_co_${fecha}`,
    buttons: [
      { type: "QUICK_REPLY", text: "Ya pagué" },
      { type: "QUICK_REPLY", text: "Quiero pasar a VIP" },
      { type: "QUICK_REPLY", text: "Tengo una duda" },
    ],
  },
  {
    tier: "vip",
    name: `habinext_recupera_vip_co_${fecha}`,
    buttons: [
      { type: "QUICK_REPLY", text: "Ya pagué" },
      { type: "QUICK_REPLY", text: "Tengo una duda" },
    ],
  },
];

for (const p of plantillas) {
  const payload = {
    name: p.name,
    language: "es_CO",
    category: "MARKETING",
    structure: {
      header: { format: "IMAGE", example: `${sitio}/img/recupera-${p.tier}.jpg` },
      body: { text: cuerpo(p.tier), examples: ["Felipe", "AbCdEfGhIjKlMnOpQrStUvWxYz1"] },
      buttons: p.buttons,
      type: "MEDIA",
    },
  };
  const res = await fetch(`${base}/whatsapp/2/senders/${encodeURIComponent(linea)}/templates`, {
    method: "POST",
    headers: { Authorization: `App ${process.env.INFOBIP_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  console.log(p.tier, "→", p.name, res.ok ? `OK (${data?.status ?? "creada"})` : `FALLO ${res.status}`);
  if (!res.ok) console.log("   ", JSON.stringify(data).slice(0, 400));
}
