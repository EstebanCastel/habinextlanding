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
