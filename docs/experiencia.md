# La experiencia del asistente (`/experiencia`)

La página que vive en el celular de cada persona que va a Habi Next: arma su
carnet oficial con su foto y su nombre, y completa una serie de misiones que
la llevan a contar el evento en sus redes. Todo lo que pasa ahí queda en el
panel (`/admin`, sección **La experiencia**) con el enlace a cada publicación.

## Las tres experiencias (desde el 22 de septiembre)

La portada (`/experiencia`) muestra el puntaje, el podio de los tres
primeros y tres tarjetas. Tocar una tarjeta sin sesión abre la ventana de
entrada; al entrar se cae en esa experiencia y la sesión se mantiene 180 días.

- **Entrar** (`POST /api/experiencia/entrar`): solo con el correo y la cédula
  de la entrada **aprobada** en Luma (`entrar()` en `src/lib/experiencia.ts`).
  Sin registro aprobado no se entra (`sin-entrada` / `pendiente`); si el
  registro trae cédula, tiene que coincidir (`cedula`); si no la trae, la
  primera que escriba la persona se guarda en el registro y desde ahí vale
  también en la puerta. El hash en `credencial` se refresca en cada entrada.
  LinkedIn ya no es una forma de entrar: se conecta a la sesión de quien ya
  entró, para publicar en un clic (`/api/experiencia/linkedin` exige sesión).
  Las APIs tampoco crean participantes anónimos: sin cookie responden 401.
  Límite: 12 intentos por IP y 6 por correo cada 15 minutos.
- **1 · Tu carnet** (`/experiencia/carnet`): la carta de dos caras (carnet al
  frente, QR atrás, asteriscos animados en pantalla), el formulario con un
  solo botón «Guardar carnet» y, ya guardado, el bloque `Publicar.tsx`:
  «Publicar en LinkedIn» publica de una con `textoVoy` y el carnet (si no
  está conectado, va a `/api/experiencia/linkedin?volver=carnet-publicar` y
  al volver con `?auto=publicar` publica solo una vez); «Publicar en
  Instagram» abre la hoja de compartir con la historia y el texto copiado.
  El carnet guardado se carga de `/api/experiencia/archivo?f=carnet:<formato>`
  para verlo igual desde otro aparato. 45 puntos.
- **2 · El mapa del tesoro** (`/experiencia/mapa`): el plano ilustrado del
  recinto (escenarios con tarima y sillas, hall con los stands y sus logos,
  acreditación, entrada, zona VIP, café) con dos rutas, la morada y la dorada,
  y ocho paradas (`PARADAS` y `RUTAS` en `src/config/experiencia.ts`; el
  dibujo vive en `src/components/experiencia/Mapa.tsx`).
  Check-in = foto del stand (`POST /api/experiencia/parada`) y, si el celular
  la da, la ubicación comparada con `RECINTO` (radio generoso, GPS bajo techo).
  `EXPERIENCIA_GEO=off` apaga la comprobación de distancia para probar. 10
  puntos por parada y 25 por ruta completa: 130.
- **3 · Cuéntalo en tus redes** (`/experiencia/redes`): las misiones de
  Instagram, WhatsApp y las del día del evento. Cada una se puede cerrar
  publicando desde la página o **subiendo una captura como prueba**
  (`clase=prueba&mision=` en `/api/experiencia/fotos`). 80 puntos.
- **Cerradas por ahora** (`BLOQUEADAS` en `src/config/experiencia.ts`): el
  mapa (con `hasta`: se abre solo el 20 de octubre a medianoche) y las redes
  (sin fecha: se abren quitándolas de la lista). `marcar()` también ignora
  las misiones de una experiencia cerrada, así que ninguna puerta lateral
  (por ejemplo la vista previa de WhatsApp en `/i/<id>`) suma puntos. La tarjeta se ve con candado en la portada, la URL
  (`/experiencia/mapa`, `/experiencia/redes`) devuelve a `/experiencia?cerrada=<id>`
  y las APIs que dan puntos por ellas responden `403` (`/parada`, y `/mision`,
  `/fotos` y `/publicar` para las misiones de redes). Con la sesión del panel
  (`habinext_panel`) la pantalla sí se abre, para revisarla; la API no
  distingue. Para abrir una experiencia se quita de `BLOQUEADAS`.
- **Ranking**: un solo documento `experiencia/ranking.json` con una fila por
  persona, que se toca solo cuando cambian sus puntos o su nombre. Nombre de
  pila e inicial del apellido; desempata quien llegó primero a ese puntaje.
- Las fotos de paradas y pruebas se ven en el panel (`/api/admin/experiencia/foto`).

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
empresa). Tampoco existe una dirección web que abra Instagram con una foto ya
cargada: la única puerta es la hoja de compartir del celular. Por eso el botón
«Publicar en Instagram» hace esto:

- **En el celular**, copia el texto al portapapeles y abre la hoja de
  compartir con la imagen puesta; la persona toca Instagram y la foto ya está
  en su historia o publicación. Instagram no acepta texto prellenado, de ahí
  la copia.
- **En el computador**, descarga la imagen, copia el texto y ofrece «Abrir
  Instagram» (instagram.com, o `/create/story` para la historia) para subirla
  desde «Crear».

Si algún día se quiere publicar por API, existe para cuentas profesionales
(Business/Creator) con la «Instagram API with Instagram Login», que exige una
app de Meta con revisión aprobada para `instagram_business_content_publish` y
la imagen en una URL pública. Es un trámite de semanas con Meta y solo cubre a
quienes tengan cuenta profesional.

Todos los botones de red llevan el logo oficial y el color de la marca
(`src/components/experiencia/Redes.tsx`): azul LinkedIn, degradado Instagram,
verde WhatsApp. El botón de publicar va primero en cada misión.

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

## La agenda: «me interesa» y las fichas de ponentes

Cada sesión tiene un corazón («me interesa»): se guarda en `agenda` del
participante (`POST /api/experiencia/agenda`, exige sesión) y el conteo por
sesión vive en `experiencia/agenda-interes.json` (`marcarInteres`,
`interesPorSesion`). No da puntos; sirve para que la persona arme su día
(filtro «Las que me interesan») y para ver qué charlas tienen expectativa.

Las fichas de quienes dictan están en `PONENTES` (`src/config/agenda.ts`),
con la foto en blanco y negro en `public/img/ponentes/<slug>.jpg` (600×600,
hecha con `magick … -colorspace Gray`) y el cargo; las marcas llevan `logo`.
Quien no tiene ficha sale con iniciales. Las fotos se tomaron de fuentes
públicas (prensa, webs de sus empresas): si un ponente manda la suya, se
reemplaza el archivo con el mismo nombre.

## La barra fija y los términos

Todas las pantallas (`Marco.tsx`) llevan arriba `Barra.tsx`: a la izquierda
`proximo()` de `src/config/agenda.ts` (días que faltan; el día del evento, la
próxima sesión con `desde` o con qué arranca Inspira), que abre la agenda; a
la derecha los puntos sobre `PUNTOS_TOTALES`. Al pie, `Legal.tsx`: los
términos de la experiencia plegados en un `<details>` (datos, foto y
publicaciones, imagen en el evento, ranking y premio, entrada y QR,
conservación de seis meses, derechos de la Ley 1581). El texto vive en
`SECCIONES` con su `VERSION`.

## Probar las misiones del evento antes del 20

Con sesión de panel abierta, `/experiencia?fase=evento` muestra las misiones
del día del evento. Para que el servidor también las acepte (subir fotos,
frase) hay que poner `EXPERIENCIA_FASE=evento` en el entorno; sin eso, la
subida responde «Las fotos se suben desde el día del evento».

## Billetera (Apple Wallet y Google Wallet)

El carnet (`src/components/experiencia/Carnet.tsx`) es una carta de dos
caras: al frente la pieza que se publica y atrás la entrada con el QR de
Luma (`dibujarReverso` en `src/lib/carnet.ts`); «Ver mi QR de entrada» la
gira. Al lado de ese botón va el distintivo oficial de la billetera del
aparato (`Wallet.tsx` con `segunAparato`: Apple en iPhone y Mac, Google en
Android, los dos si no se sabe). Son enlaces a
`GET /api/entrada/apple?t=<token>` y `GET /api/entrada/google?t=<token>`: en
iPhone, Safari abre la hoja «Agregar a Wallet» al navegar al `.pkpass`; para
Google el endpoint redirige al enlace de guardar. El pase lleva el **mismo QR
de Luma** que lee la puerta, vence el 21 de octubre a las 6 a. m. y no se
puede compartir desde el teléfono. Si algo falla en la navegación, se vuelve a
`/experiencia/carnet?billetera=<código>` y la pantalla lo explica.

El código ya hace todo; lo que falta son las credenciales. Mientras no estén,
`disponibilidad()` (`src/lib/wallet.ts`) deja el botón atenuado con «estará
disponible muy pronto». Las imágenes del pase de Apple ya van incrustadas
(`src/lib/wallet-recursos.ts`); el logo del pase de Google se sirve desde
`public/img/wallet/logo-pase.png`.

### Apple Wallet: qué conseguir

1. **Pass Type ID.** [Apple Developer](https://developer.apple.com/account) →
   Certificates, Identifiers & Profiles → Identifiers → `+` → Pass Type IDs →
   identificador `pass.co.habi.habinext` (o similar), descripción «Habi Next».
2. **Certificado del pase.** En ese Pass Type ID → Create Certificate → subir
   un CSR hecho en Acceso a Llaveros (Asistente de certificados → Solicitar un
   certificado de una autoridad → guardar en disco) → descargar el `.cer` y
   abrirlo con doble clic para que entre al Llavero.
3. **Exportar el `.p12`.** En Llavero, buscar «Pass Type ID: pass.co.habi…»,
   desplegar para ver la llave privada, seleccionar certificado + llave →
   clic derecho → Exportar 2 ítems → formato `.p12` → ponerle contraseña.
   Luego `base64 -i habinext.p12 | tr -d '\n' | pbcopy`.
4. **WWDR G4.** Bajar «Worldwide Developer Relations - G4» de
   <https://www.apple.com/certificateauthority/> (`AppleWWDRCAG4.cer`) y
   pasarlo a PEM: `openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem`.
5. **Team ID.** Apple Developer → Membership details (10 caracteres).

Variables: `APPLE_PASS_P12_BASE64` (el `.p12` en base64), `APPLE_PASS_P12_PASSWORD`
(puede ir vacía si se exportó sin clave), `APPLE_WWDR_PEM` (el PEM completo,
con sus `BEGIN`/`END`), `APPLE_PASS_TYPE_ID` (`pass.co.habi.habinext`),
`APPLE_TEAM_ID`.

### Google Wallet: qué conseguir

1. **Cuenta de emisor.** [Google Pay & Wallet Console](https://pay.google.com/business/console)
   → crear la cuenta de empresa de Habi → en Google Wallet API aparece el
   **Issuer ID** (un número largo).
2. **API y cuenta de servicio.** En Google Cloud, un proyecto de Habi →
   habilitar «Google Wallet API» → IAM → Cuentas de servicio → crear una
   (`habinext-wallet`) → Claves → Agregar clave → JSON. Ese archivo completo es
   `GOOGLE_WALLET_SERVICE_ACCOUNT`.
3. **Darle permiso.** De vuelta en la consola de Wallet → Usuarios → agregar
   el `client_email` de la cuenta de servicio como usuario (desarrollador).
4. Mientras la cuenta esté en modo demo, solo los correos agregados como
   «testers» en la consola pueden guardar pases. Para abrirla a todo el mundo
   hay que pedir el acceso de producción en la misma consola (perfil de
   empresa completo).

Variables: `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT` (el JSON
en una sola línea; los `\n` de la `private_key` pueden quedar escapados).

### Cargarlas en Vercel

```bash
base64 -i habinext.p12 | tr -d '\n' | vercel env add APPLE_PASS_P12_BASE64 production
printf '%s' 'la-clave' | vercel env add APPLE_PASS_P12_PASSWORD production
vercel env add APPLE_WWDR_PEM production < wwdr.pem
printf '%s' 'pass.co.habi.habinext' | vercel env add APPLE_PASS_TYPE_ID production
printf '%s' 'TEAMID1234' | vercel env add APPLE_TEAM_ID production
printf '%s' '3388000000012345678' | vercel env add GOOGLE_WALLET_ISSUER_ID production
vercel env add GOOGLE_WALLET_SERVICE_ACCOUNT production < habinext-wallet.json
```

Después, redeploy. Para probar en local, las mismas variables van en
`.env.local` (nunca al repo).

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `EXPERIENCIA_SECRET` | Firma la cookie de sesión y deriva la llave que cifra los tokens. 64 hex. |
| `APPLE_PASS_P12_BASE64`, `APPLE_PASS_P12_PASSWORD`, `APPLE_WWDR_PEM`, `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID` | Apple Wallet (sección «Billetera»). |
| `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT` | Google Wallet (sección «Billetera»). |
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
