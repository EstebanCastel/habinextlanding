# Boletería de Habi Next

Cómo una persona pasa de ver la landing a tener su entrada en el correo, y qué
hace cada pieza del repo en ese recorrido.

## El recorrido

```
Landing                Luma                  Este servicio            WhatsApp / Wompi
───────                ────                  ─────────────            ────────────────
"Comprar General"  →   se registra       →   POST /webhook        →   plantilla con
"Quiero ser VIP"       (queda pendiente)     verifica la firma        link personal
                                             crea el registro
                                                    ↓
                                             GET /p/<token>       ←   toca el link
                                             anota "abrió pago"
                                             302 con UTM propia   →   checkout Wompi
                                                    ↓
                                             POST /api/wompi      ←   pago aprobado
                                             verifica el checksum
                                             aprueba en Luma      →   Luma manda
                                                    ↓                  la entrada + QR
                                             POST /api/infobip    ←   comprobante o
                                             anota y responde         duda por WhatsApp
                                                    ↓
                                             Google Sheets (espejo de todo)
```

Las dos entradas se cobran, pero **el cobro no pasa por Luma**: los eventos
tienen un ticket gratuito con aprobación obligatoria y el dinero entra por
Wompi. Aprobar en Luma es, literalmente, el acto de entregar la entrada, y por
eso ocurre solo después de que el pago está confirmado.

## Las piezas

| Ruta | Qué hace | Cómo se protege |
| --- | --- | --- |
| `POST /webhook` | Registro nuevo en Luma → crea el registro y manda el WhatsApp | HMAC-SHA256 sobre el cuerpo crudo (`Webhook-Signature`) + ventana de 5 min |
| `GET /p/[token]` | Link personal de pago: anota el clic y redirige a Wompi con UTM propia | El token es de 160 bits; no expone datos ni permite escribir |
| `POST /api/infobip` | Reportes de entrega y mensajes entrantes (comprobantes) | Token en la query (`?k=…`), comparado en tiempo constante |
| `POST /api/wompi` | Pago confirmado → aprueba en Luma y avisa por WhatsApp | Checksum SHA-256 de Wompi sobre las propiedades que él mismo lista |
| `/admin` | Panel de operación: ver, aprobar, rechazar, reenviar | Clave del equipo en cookie `HttpOnly` + `SameSite=Strict` |

Los datos viven en un store **privado** de Vercel Blob (`habinext-datos`),
conectado al proyecto. Privado importa: ahí están nombre, correo y celular de
cada persona, y en un store público bastaría con conocer la ruta para leerlos.

## Las ocho etapas

`registrado` → `mensaje_enviado` → `mensaje_entregado` → `mensaje_leido` →
`pago_abierto` → `comprobante_recibido` → `pago_confirmado` → `aprobado`

Solo se avanza, nunca se retrocede: los reportes de entrega de Infobip llegan
fuera de orden con frecuencia, y sin esa regla un reporte viejo devolvería a
alguien de «leído» a «entregado».

## Lo que hay que hacer a mano

Tres cosas no se pudieron dejar corriendo desde acá porque necesitan una sesión
en el navegador:

**1. Publicar el Apps Script de la hoja.** Está escrito en `docs/hoja.gs` con
las instrucciones adentro. Al publicarlo queda una URL `/exec` que va en
`SHEETS_WEBHOOK_URL`. Hasta entonces todo el resto funciona y la hoja
simplemente no se llena — el espejo nunca bloquea un webhook.

**2. Conectar el webhook de Wompi.** En el panel de Wompi → Desarrolladores,
apuntar los eventos a `https://www.habinext.com/api/wompi` y copiar el secreto
de eventos a `WOMPI_EVENTS_SECRET`. Sin esa variable el endpoint rechaza todo
por firma inválida, que es el comportamiento correcto: es preferible no aprobar
a nadie que aprobar por un evento que nadie firmó. Mientras tanto la aprobación
se hace desde `/admin`, mirando el comprobante.

**3. Registrar el webhook de mensajes entrantes en Infobip.** En el portal, la
línea `573009110459` tiene que apuntar sus mensajes entrantes a
`https://www.habinext.com/api/infobip?k=<INFOBIP_WEBHOOK_TOKEN>`. Los reportes
de entrega no necesitan configuración: viajan en el `notifyUrl` de cada envío.

## Cambiar el precio o la etapa

Todo está en `src/config/event.ts`. La etapa vigente se calcula sola por fecha,
y el precio que se le cobra a alguien queda congelado en su registro el día que
se inscribe: quien entró en preventa paga preventa aunque la apruebes en
octubre.

## Cuando algo se rompe

- **«No le llegó el WhatsApp».** Buscar la persona en `/admin`. Si dice «sin
  celular», el registro de Luma llegó sin número usable. Si hay error de
  Infobip, aparece el texto exacto. El botón *Reenviar WhatsApp* vuelve a
  mandar la plantilla con el mismo link.
- **«Pagó pero no le llegó la entrada».** Si el webhook de Wompi no está
  conectado, esto es lo esperado: aprobar desde `/admin`. Si sí está conectado,
  la bitácora del registro dice si Luma rechazó la aprobación y con qué código.
- **«La hoja está desfasada».** El botón *Reconstruir la hoja* la reescribe
  entera desde el almacén.
- **Un pago que no se pudo conciliar** queda en los logs de la función con su
  referencia. Se cruza a mano en el panel.
