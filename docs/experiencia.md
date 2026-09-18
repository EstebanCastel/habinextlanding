# La experiencia del asistente (`/experiencia`)

La página que vive en el celular de cada persona que va a Habi Next: arma su
carnet oficial con su foto y su nombre, y completa una serie de misiones que
la llevan a contar el evento en sus redes. Todo lo que pasa ahí queda en el
panel (`/admin`, sección **La experiencia**) con el enlace a cada publicación.

## Qué hace, en orden

1. **El carnet.** Nombre, apellido y foto. Se dibuja en el navegador (canvas)
   mientras la persona escribe, con la composición de la pieza oficial: Bogotá
   en blanco y negro, la trama de puntos morados, el lockup «Habi Next
   Colombia», la foto en blanco y negro, los dos asteriscos y «UN EVENTO DE
   habi». Se guarda en dos formatos: publicación (1080×1350) e historia
   (1080×1920). Al guardar se marca la primera misión.
2. **Las misiones antes del evento.** Cuéntalo en LinkedIn (publicación en un
   clic con el carnet y un texto escrito), súbelo a historias (Instagram, por
   la hoja de compartir del celular), invita a un colega (link personal por
   WhatsApp, `/i/<id>`).
3. **Las misiones del día del evento.** Se abren solas el 20 de octubre: sube
   tus fotos, publícalas en LinkedIn (hasta nueve, texto listo), compártelas en
   Instagram, y «Lo que te llevas» (una frase que se convierte en pieza).
4. **Puntos y nivel.** Cada misión suma; el premio se anuncia en
   `src/config/experiencia.ts` (`PREMIO`). Ahí también están los textos de
   cada publicación y los puntajes.

## Cómo se guarda la sesión

No hay usuario ni clave. La primera vez que la persona guarda algo, el
servidor le crea un participante y le deja una cookie firmada (`hn_exp`, 180
días, `HttpOnly`, `SameSite=Lax`). Con eso, al volver desde el mismo navegador
encuentra su carnet, sus fotos y su avance.

**Conectar LinkedIn** hace dos cosas más: permite publicar en su nombre y
recupera el avance desde otro aparato (se indexa por el `sub` de LinkedIn; si
había avance en los dos lados, se suman). Si su correo de LinkedIn coincide con
un registro de boletería, se le vincula la entrada y la página se lo dice.

Instagram no tiene inicio de sesión para cuentas personales (Meta cerró la API
Basic Display en diciembre de 2024 y la de publicación es solo para cuentas de
empresa). Por eso Instagram va por la hoja de compartir del sistema: el carnet
o las fotos se pasan como archivos y el texto se copia al portapapeles, porque
Instagram no acepta texto prellenado.

## LinkedIn

Misma app de LinkedIn que usa habipublicador (`LINKEDIN_CLIENT_ID` /
`LINKEDIN_CLIENT_SECRET`), con los productos «Sign In with LinkedIn using
OpenID Connect» y «Share on LinkedIn». El login pide
`openid profile email w_member_social` en un solo paso.

- **Hay que registrar la URL de vuelta en la app de LinkedIn**
  (developer portal → la app → Auth → Authorized redirect URLs):
  `https://www.habinext.com/api/experiencia/linkedin/callback`. Sin eso
  LinkedIn responde «redirect_uri does not match» y la conexión falla.
- El token dura 60 días y no hay refresh para apps que no son partner: al
  vencer, la página pide reconectar (respuesta `428` de `/api/experiencia/publicar`).
- El token se guarda **cifrado** (AES-256-GCM con una llave derivada de
  `EXPERIENCIA_SECRET`) dentro del documento de la persona. Nunca sale al
  navegador.
- Publicación: `POST /rest/posts` con `LinkedIn-Version` =
  `LINKEDIN_API_VERSION` (hoy `202606`). LinkedIn retira cada versión al año;
  si empieza a responder 426, se sube la variable. Las imágenes se registran
  con `/rest/images?action=initializeUpload`, se suben los bytes y se
  referencian por URN; con dos o más va `multiImage`.
- El texto se escapa al formato «little text» (`\` antes de `()[]{}<>@|~_*#`)
  y las etiquetas se vuelven `{hashtag|\#|nombre}`. Sin eso LinkedIn devuelve 422.
- Quien no quiere conectar puede compartir el enlace público de su carnet
  (`/c/<id>`). LinkedIn viene a buscar la vista previa con su robot
  (`LinkedInBot`) y esa visita marca la misión sola. WhatsApp hace lo mismo
  con `/i/<id>`.

## Archivos y privacidad

Todo va al mismo store privado de Vercel Blob de la boletería:

- `experiencia/personas/<id>.json` — el participante (misiones, publicaciones, bitácora).
- `experiencia/indice/linkedin/<sub>.json` — de LinkedIn al participante.
- `experiencia/carnets/<id>/feed.jpg` y `story.jpg`.
- `experiencia/archivos/<id>/<foto>.<ext>` — fotos subidas, foto de perfil de LinkedIn y piezas de frase.

Las fotos se sirven solo por `/api/experiencia/archivo`, que comprueba que
sean de quien las pide. Lo único público es el carnet (`/api/experiencia/publico/<id>.jpg`),
porque se hizo para compartirse. Se aceptan JPG, PNG y WebP por sus primeros
bytes, no por el nombre; se reducen en el navegador antes de subir (1800 px,
menos de 1 MB) y hay tope de 30 fotos por persona.

Los endpoints que escriben exigen que la petición venga de la propia página
(`Sec-Fetch-Site: same-origin` u `Origin` igual al del sitio) y llevan límite
por IP. Publicar en LinkedIn tiene además un tope por persona (6 por hora y
nunca dos en dos minutos) para no volverse spam.

## Medición

- Panel: participantes, carnets, publicaciones en LinkedIn (con enlace),
  compartidos a Instagram, invitaciones abiertas, quién completó todo, y el
  avance por misión. Descarga en `/api/admin/experiencia.csv`.
- Rastro: los clics `experiencia:entrar`, `experiencia:linkedin`,
  `experiencia:invitar` y `experiencia:compartir-linkedin`; las visitas que
  llegan por `/i/<id>` traen `utm_source=experiencia` y `utm_content=<id>`, y
  los registros de Luma guardan ese `utm_content` en `luma.contenido`.

## Probar las misiones del evento antes del 20

Con sesión de panel abierta, `/experiencia?fase=evento` muestra las misiones
del día del evento. Para que el servidor también las acepte (subir fotos,
frase) hay que poner `EXPERIENCIA_FASE=evento` en el entorno; sin eso, la
subida responde «Las fotos se suben desde el día del evento».

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `EXPERIENCIA_SECRET` | Firma la cookie de sesión y deriva la llave que cifra los tokens. 64 hex. |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | La app de LinkedIn (la misma de habipublicador). |
| `LINKEDIN_API_VERSION` | Versión de la Posts API. `202606`. |
| `EXPERIENCIA_FASE` | `antes` o `evento`, para forzar la fase. Sin valor, decide la fecha. |

## Referencias que guiaron el diseño

- Supabase Launch Week: ticket personal con imagen OG y verificación pasiva de
  que se compartió, detectando el robot de la red que viene por la vista previa.
- Premagic (GITEX, G2 Live): póster personalizado al registrarse + compartir en
  un toque + link de referido; reportan que entre 15 % y 50 % del público
  publica cuando el material está listo y es suyo.
- Attendir (2025–26): el texto prellenado y personalizado dobla la tasa de
  compartido frente a un enlace pelado (14–20 % vs 6–10 %).
- Figma Config: la «virtual badge» que cada asistente personaliza y publica
  (2.600+ en una edición).
