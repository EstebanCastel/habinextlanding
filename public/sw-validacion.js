/**
 * El service worker de la puerta.
 *
 * Sirve para una sola cosa: que `/validacion` abra aunque no haya internet.
 * El padrón ya vive en el almacén del navegador y el lector sabe decidir solo,
 * pero nada de eso vale si al recargar la página el teléfono muestra el
 * dinosaurio. En un recinto lleno, alguien recarga: se le traba la cámara, le
 * entra una llamada, bloquea el teléfono y vuelve.
 *
 * La estrategia es «red primero, caja fuerte después»: siempre intenta traer
 * la versión de verdad, y solo si falla devuelve la última que guardó. Así
 * nadie se queda con una versión vieja mientras haya señal, que es el defecto
 * clásico de cachear agresivamente.
 *
 * Lo que NO cachea: `/api/validacion`. Un conteo viejo en la puerta es peor
 * que no tener conteo, y una validación servida desde la caja fuerte diría
 * «adelante» sin que nadie lo haya anotado.
 */

const CAJA = "habinext-puerta-v1";
const ESENCIALES = ["/validacion", "/js/jsqr.js"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CAJA)
      .then((c) => c.addAll(ESENCIALES).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CAJA).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;

  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  // Solo la puerta. El resto del sitio sigue como siempre.
  const esDeLaPuerta =
    url.pathname === "/validacion" ||
    url.pathname.startsWith("/validacion/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/js/") ||
    url.pathname.startsWith("/img/");
  if (!esDeLaPuerta) return;

  // El padrón y el conteo nunca salen de la caja fuerte: el lector ya guarda
  // el padrón por su cuenta y sabe qué hacer cuando la petición falla.
  if (url.pathname.startsWith("/api/")) return;

  evento.respondWith(
    fetch(pedido)
      .then((respuesta) => {
        if (respuesta && respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CAJA).then((c) => c.put(pedido, copia).catch(() => null));
        }
        return respuesta;
      })
      .catch(() =>
        caches.match(pedido).then(
          (guardada) =>
            guardada ||
            caches.match("/validacion") ||
            new Response("Sin conexión y sin copia guardada.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
        )
      )
  );
});
