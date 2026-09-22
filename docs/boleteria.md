# Boletería de Habi Next

Cómo una persona pasa de ver la landing a tener su entrada en el correo, y qué
hace cada pieza del repo en ese recorrido.

## El bot, en dos decisiones

```
se registra en Luma
        │
        ├── eligió VIP ──────► WhatsApp con su link de pago
        │                          │
        └── eligió General ──► WhatsApp con su link de pago
                               + «por X más te pasas a VIP»
                                   │
                                   ├── toca "Prefiero el VIP"
                                   │   └─► se pasa a VIP en Luma
                                   │       y recibe el link del VIP
                                   └── no contesta → sigue en General
                                           │
                                   paga y manda el comprobante
                                           │
                                   alguien lo aprueba EN LUMA
                                           │
                                   Luma manda la entrada con el QR
                                   y el bot avisa por WhatsApp
```

Las dos entradas se cobran, pero **el cobro no pasa por Luma**: los eventos
tienen un ticket gratuito con aprobación obligatoria y el dinero entra por
Wompi. Aprobar en Luma es, literalmente, el acto de entregar la entrada.

**Aprobar se hace en Luma**, en su lista de invitados. Este servicio no aprueba
a nadie: se entera por el webhook `guest.updated` y desde ahí le avisa a la
persona por WhatsApp. El panel muestra a quién le toca y lleva directo.

## Las piezas

| Ruta | Qué hace | Cómo se protege |
| --- | --- | --- |
| `POST /webhook` | Registro nuevo en Luma → manda el WhatsApp de bienvenida. También recibe la aprobación hecha en Luma y avisa a la persona | HMAC-SHA256 sobre el cuerpo crudo (`Webhook-Signature`) + ventana de 5 min |
| `GET /p/[token]` | Link personal de pago: anota el clic y redirige a Wompi con UTM propia | El token es de 160 bits; no expone datos ni permite escribir |
| `POST /api/infobip` | Reportes de entrega, comprobantes, y el botón «Prefiero el VIP» | Token en la query (`?k=…`), comparado en tiempo constante |
| `POST /api/wompi` | Pago confirmado por el banco → lo marca y avisa. No aprueba | Checksum SHA-256 de Wompi sobre las propiedades que él mismo lista |
| `/admin` | Trazabilidad completa, reenviar mensaje, pasar a VIP a mano | Clave del equipo en cookie `HttpOnly` + `SameSite=Strict` |

Los datos viven en un store **privado** de Vercel Blob (`habinext-datos`),
conectado al proyecto. Privado importa: ahí están nombre, correo y celular de
cada persona, y en un store público bastaría con conocer la ruta para leerlos.

No hay hoja de cálculo. El panel es la trazabilidad: cada fila trae las horas de
cada paso y, desplegando **Historia**, la bitácora completa de esa persona.

## Las ocho etapas

`registrado` → `mensaje_enviado` → `mensaje_entregado` → `mensaje_leido` →
`pago_abierto` → `comprobante_recibido` → `pago_confirmado` → `aprobado`

Solo se avanza, nunca se retrocede: los reportes de entrega de Infobip llegan
fuera de orden con frecuencia, y sin esa regla un reporte viejo devolvería a
alguien de «leído» a «entregado».

## El paso de General a VIP

En Luma son dos eventos separados, así que subir de categoría es darse de alta
en el de VIP y bajarse del de General. El orden importa y está en `bot.ts`:

1. Se marca el upgrade por correo. **Esto va primero**: el alta dispara un
   `guest.registered` del evento VIP, y sin esa marca puesta de antemano ese
   webhook crearía un registro nuevo y la persona quedaría partida en dos.
2. Alta en VIP, sin correo y pendiente de aprobación.
3. Se busca su id nuevo por correo (`guests/add` no lo devuelve, y sin ese id no
   se podría relacionar la aprobación que se haga después en Luma).
4. Se recalcula el precio y se le manda el link del VIP.
5. Se le da de baja del evento General, sin correo.

## Lo que hay que hacer a mano

**1. Conectar el webhook de Wompi.** En el panel de Wompi → Desarrolladores,
apuntar los eventos a `https://www.habinext.com/api/wompi` y copiar el secreto
de eventos a `WOMPI_EVENTS_SECRET`. Sin esa variable el endpoint rechaza todo
por firma inválida, que es el comportamiento correcto.

**2. Registrar el webhook de mensajes entrantes en Infobip.** En el portal, la
línea `573009110459` → *Inbound configuration* → **Forwarding action → Forward
to HTTP**:

| Campo | Qué va |
| --- | --- |
| URL | `https://www.habinext.com/api/infobip?k=<INFOBIP_WEBHOOK_TOKEN>` |
| Renderer | `MO_OTT_CONTACT` (el que viene por defecto) |
| Use custom renderer | sin marcar |
| Auto response | **apagado** — responde el bot, no Infobip |
| Conversations | apagado |
| Blocking action | apagado |

El endpoint lee el cuerpo en `message` o en `content`, el texto en `text`,
`content.text` o `cleanText`, y el payload del botón en `payload` o
`button.payload`, porque el renderer decide cuál manda. Además reconoce la
respuesta por el *texto* del botón («Prefiero el VIP», «Tengo una duda») para
el caso en que llegue como texto plano y sin payload.

⚠️ **Ojo con el bot que ya vive en esa línea.** Hoy, quien responde un mensaje
recibe *«Lo siento, no pudimos entenderte… wa.me/573009114406»*: es otro flujo
de Habi escuchando ahí. Mientras eso siga activo, el botón «Prefiero el VIP» y
los comprobantes no llegan a este servicio. Hay que decidir cuál de los dos
atiende la línea, o mover Habi Next a una línea propia.

Los reportes de entrega no necesitan configuración: viajan en el `notifyUrl` de
cada envío.

## Códigos de invitación

Los invitados de la casa —aliados, prensa, equipo, patrocinadores— entran por
otra puerta. En cada boleta hay un enlace discreto, *«Tengo un código de
invitación»*, que lleva a `/codigo`. La persona escribe su código, nombre,
correo y celular, y su entrada sale en el acto:

1. Se descuenta un cupo del código. **Va antes de tocar Luma**: si el alta
   falla sobra un cupo consumido —molesto pero inofensivo, se devuelve solo—,
   mientras que al revés dos personas podrían llevarse la última entrada a la
   vez. La escritura es condicional, así que la segunda relee y ve el cupo
   gastado.
2. Alta en Luma con `approval_status: "approved"` y correo activado: ese correo
   **es** la entrada con el QR, y la persona la está esperando en ese momento.
3. Se crea el registro directo en etapa `aprobado`, con precio `$0` y el código
   con el que entró, y se le manda un WhatsApp de bienvenida sin link de pago.

Es el único camino en que alguien queda aprobado sin que una persona lo mire, y
se sostiene porque **el código es la autorización**: alguien del equipo lo creó
y decidió cuántas entradas regala, para qué boleta y hasta cuándo sirve.

Los códigos se crean y se apagan desde `/admin`. Lo que hay que mirar es el
cupo: un código sin tope que se filtre por ahí es la forma más silenciosa de
llenar el evento de entradas que nadie pagó. El panel muestra cuánto lleva
usado cada uno y quién lo usó.

`/api/codigo` es el único endpoint público que escribe, así que lleva su propio
límite por IP —8 intentos cada 10 minutos— para que nadie pueda probar códigos
al azar hasta acertar uno.

## Por qué el link de pago va en el texto y no en un botón

Un botón «Completar mi pago» sería mejor que un link escrito en el cuerpo, y
está escrito el código para mandarlo. No se usa porque **Meta rechaza toda
plantilla cuyo botón apunte a un dominio sin verificar**, y lo hace en
silencio: la plantilla queda en `REJECTED` y la API no dice la causa.

Está comprobado contra la cuenta real, aislando una variable por vez:

| Plantilla de prueba | Resultado |
| --- | --- |
| Botón → `habinext.com`, texto «Completar mi pago» | RECHAZADA |
| Botón → `habinext.com`, texto neutro «Ver mi entrada» | RECHAZADA |
| Botón → dominio ya verificado, texto «Completar mi pago» | aceptada |
| Sin botón | aceptada |

No es el texto, ni la categoría (`UTILITY` y `MARKETING` fallan igual), ni que
la URL sea dinámica: es el dominio.

**Cómo habilitarlo.** En Meta Business Manager → Configuración del negocio →
Seguridad de la marca → Dominios, agregar `habinext.com` y copiar el código de
verificación a `META_DOMAIN_VERIFICATION`. La etiqueta sale sola en el `<head>`
de la landing. Con el dominio verificado, se crean las plantillas con botón y
se apuntan `INFOBIP_TPL_VIP` e `INFOBIP_TPL_GENERAL_UPSELL` a ellas; en
`bot.ts`, `darLaBienvenida` lleva el comentario de qué cambiar.

Mientras tanto el link va escrito en el cuerpo, que WhatsApp autoenlaza igual y
no pasa por esa validación.

## Cuando el bot no sabe qué hacer

Escala a una persona por WhatsApp (`WHATSAPP_ESCALAMIENTO`), con quién es y qué
pasó, y a quien escribió le dice que lo va a ver alguien del equipo. Escala en
cuatro casos:

- alguien escribe algo que no es un comprobante ni un botón conocido;
- se registra sin un celular usable —una venta que si no se pierde en silencio—;
- falla el envío del mensaje de bienvenida;
- toca «Prefiero el VIP» y el paso a VIP no se pudo completar.

El aviso va por la plantilla `habinext_alerta_operador_co_sep26`, no por texto
libre: quien opera no le escribe a la línea todos los días y la ventana de 24
horas de Meta suele estar cerrada justo cuando más falta hace el aviso.

## Cambiar el precio o la etapa

Todo está en `src/config/event.ts`. La etapa vigente se calcula sola por fecha,
la diferencia que se le ofrece a General sale de restar los dos precios
vigentes, y el precio de cada persona queda congelado el día que se inscribe:
quien entró en preventa paga preventa aunque lo apruebes en octubre.

## Cuando algo se rompe

- **«No le llegó el WhatsApp».** Buscar la persona en el panel. Si dice «sin
  celular», el registro de Luma llegó sin número usable. Si hay error de
  Infobip, aparece el texto exacto. *Reenviar WhatsApp* vuelve a mandarlo.
- **«Pagó pero no le llegó la entrada».** Falta aprobarlo en Luma: el panel lo
  marca en morado y el enlace lleva a su lista de invitados.
- **Un pago que no se pudo conciliar** queda en los logs de la función con su
  referencia. Se cruza a mano.
- **Alguien aparece dos veces.** No debería: la creación reserva el invitado de
  forma atómica. Si pasa, mirar la bitácora de los dos registros.

## La hoja de Google del equipo

La planilla de enlaces (Nombre, Correo, Enlace, Metas, Registros traídos,
Avance, Clics, Visitas…) no se mantiene a mano: un Apps Script en la hoja
llama a `GET /api/hoja/embajadores` cada 5 minutos y reescribe la pestaña.

- El endpoint entrega la misma tabla que «Bajar el marcador» del panel, en
  JSON (`cabecera`, `filas`, `resumen`). Entra con `HOJA_TOKEN` en la cabecera
  `Authorization: Bearer …`; solo lee.
- El script está en `docs/hoja-embajadores.gs` y vive ligado a la hoja
  (subido con clasp desde `~/habinext-hoja`, donde también está `secreto.gs`
  con el token y la clave web, fuera del repo). Está desplegado además como
  dirección web: abrirla con `?k=<CLAVE_WEB>` autoriza el script, refresca la
  pestaña e instala el disparador de 5 minutos, y sirve para forzar una
  actualización desde afuera.
- Si cambia una columna en `CABECERA_HOJA` / `aFilas` (`src/lib/embajadores.ts`),
  cambia en el CSV y en la hoja a la vez.

## Recuperación de pago

A quien se registró y no ha pagado se le vuelve a poner el link de pago
delante por **WhatsApp, SMS y correo**, con el argumento que mueve: el precio
sube en una fecha concreta. Vive en `src/lib/recuperacion.ts` y en la sección
«Recuperación de pago» del panel.

- **A quién:** etapa entre `registrado` y `pago_abierto`, sin cortesía y sin
  decisión en Luma (ni aprobado ni rechazado). Nunca dos veces en 48 horas.
- **WhatsApp:** plantillas MARKETING con cabecera de imagen
  (`INFOBIP_TPL_RECUPERA_GENERAL` / `_VIP`, se crean con
  `scripts/plantillas-recuperacion.mjs`). Marcadores: nombre y token; el link
  va en el cuerpo. Botones: «Ya pagué» (pide el comprobante), «Quiero pasar a
  VIP» (solo General) y «Tengo una duda».
- **SMS:** Infobip `/sms/2/text/advanced`, remitente `INFOBIP_SMS_FROM`; el
  operador lo cambia por un número local. Texto sin tildes para que quepa en
  un segmento GSM.
- **Correo:** Infobip Email v3 desde `notifications.habi.co`, dominio que Habi
  ya tiene verificado en la cuenta (`INFOBIP_EMAIL_FROM`, respuestas a
  `CAMPANA_REPLY_TO`). HTML propio con el mismo link personal.
- **Reportes:** los tres canales avisan a `/api/infobip?dlr=1` con
  `callbackData = {token, canal}`; se anotan en `registro.recordatorio.<canal>`
  (entregado, leído, abierto, clic, fallo) sin tocar la etapa del embudo.
- **Campaña:** «Enviar recordatorio» crea `campanas/<id>.json` y corre en
  `after()` de a tres personas, guardando el avance; si se corta, «Continuar».
  Antes, «Mandarme la prueba» manda los tres mensajes al operador con los
  datos de un pendiente real.

## Pagar primero (desde el 22 de septiembre)

El orden se invirtió: la persona **paga primero** y se da de alta en Luma
después, ya aprobada.

1. Los botones de la landing van a `/comprar?tier=general|vip`: nombre,
   correo, cédula y celular. Se crea el registro en etapa `por_pagar` con
   `via: "compra"`, sin invitado de Luma, se reserva su correo, y se la manda a
   su link personal `/p/<token>`, que abre Wompi.
2. Wompi avisa el pago por `/api/wompi` (exige `WOMPI_EVENTS_SECRET`) y el
   registro pasa a `pago_confirmado`. Si el webhook no está conectado, el pago
   se ve en el tablero de Wompi y el operador lo marca a mano.
3. **Cada día**, en el panel: el aviso de arriba dice cuántos pagaron y esperan
   alta. «Dar de alta y confirmarles» los crea en Luma **aprobados**
   (`guests/add` con `approval_status: approved`, Luma manda el QR) y les envía
   la confirmación por correo (Infobip, desde notifications.habi.co), SMS y
   WhatsApp (plantilla UTILITY `INFOBIP_TPL_CONFIRMACION`). Cada fila tiene
   también «Dar de alta en Luma» con la casilla «Vi el pago en Wompi» para los
   que Wompi no confirmó por webhook.
4. La confirmación queda en `registro.confirmacion.<canal>` con sus reportes de
   entrega; el webhook `guest.updated` de Luma reconoce el registro por el
   correo reservado y no repite el aviso.

Los eventos de Luma siguen abiertos: quien llegue directo a luma.com sigue el
flujo viejo (registro → WhatsApp con link de pago → aprobación en Luma).
