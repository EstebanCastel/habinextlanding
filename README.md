# Habi Next Bogotá — landing

Landing de venta de entradas para **Habi Next Bogotá**, martes 20 de octubre de 2026.

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · GSAP + ScrollTrigger · pnpm.

## El sistema visual

Es la identidad de Habi Next, no una landing genérica de Habi: negro, morado
`#802ef6` con el secundario `#ba9dfa`, tipografía Urbanist, el asterisco de ocho
puntas y las pastillas de borde morado atravesadas por una regla que se sale de
la pantalla.

Tres decisiones sostienen la página como un solo recorrido en vez de una pila de
bloques:

**1. El hilo.** Un trazo morado (`src/components/Thread.tsx`) entra en cada
sección por donde salió el de la anterior y sale por donde entrará el de la
siguiente. Se dibuja con el scroll. En `ParaQuien` se abre en tres —una rama por
perfil—, en `Negocios` vuelve a juntarse, en `Futuro` se parte en dos caminos y
en `Boletería` esos dos caminos son las dos boletas. Termina convertido en el
asterisco del cierre.

**2. Cinco superficies, no dos.** `night`, `ink`, `violet`, `lavender` y `paper`
(clases `.s-*` en `globals.css`). Cada una define también el color del hilo y de
las líneas finas, así que una sección nueva solo elige su clase.

**3. Costuras distintas.** Ningún borde entre secciones es un corte recto:
`src/components/Seam.tsx` tiene arco, diagonal, ola, muesca y dientes, y cada
frontera usa una.

Y un bloque que rompe el eje: **Escenarios** se fija y se recorre en horizontal
mientras la página baja (en táctil, se desliza con el dedo).

## Qué se edita y dónde

Todo lo que cambia con el tiempo vive en **`src/config/event.ts`**:

| Dato | Constante |
| --- | --- |
| Fecha, ciudad, duración | `EVENT` |
| Sede (pendiente de confirmar) | `EVENT.venue` |
| Links de compra y patrocinio | `LINKS` |
| Precios, etapas y beneficios | `TICKETS` |

La etapa de boletería vigente se calcula sola a partir de `stages[].until`: al
pasar el 17 y el 30 de septiembre el precio destacado cambia sin intervención.

## Seguridad

La página se sirve dinámica a propósito: la **CSP lleva un nonce nuevo por
petición** (`src/proxy.ts`), que es lo que permite prohibir `'unsafe-inline'` en
`script-src` sin romper el arranque de React ni las etiquetas de pauta.

En `script-src` va `'strict-dynamic'`; los dominios de Meta, Google y TikTok
quedan declarados como respaldo para navegadores sin CSP nivel 3 y en
`connect-src`, así que encender un píxel es solo poner su variable de entorno.

`style-src` sí lleva `'unsafe-inline'`: GSAP y Next escriben en el atributo
`style`, que ningún nonce cubre. Es una concesión deliberada y de un orden de
riesgo distinto al de un script inyectado.

En `next.config.ts` van las cabeceras fijas: HSTS con `preload`,
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, una `Permissions-Policy` que
apaga cámara, micrófono, geolocalización y compañía, `Cross-Origin-Opener-Policy`,
`Cross-Origin-Resource-Policy`, `Origin-Agent-Cluster`,
`X-Permitted-Cross-Domain-Policies` y un `Access-Control-Allow-Origin` fijado al
origen del sitio para cerrar el `*` que el CDN pone por defecto en los estáticos.
`poweredByHeader` está apagado.

El proxy además aplica un **rate limit por IP** al documento
(`RATE_LIMIT_PER_MINUTE`, 90 por defecto). Es de mejor esfuerzo: el contador vive
en memoria de cada instancia, así que no es global. Para un bloqueo duro va el
Firewall de Vercel.

No hay rutas de API ni formularios propios —la compra ocurre en Luma—, así que no
hay superficie de datos que autenticar desde aquí.

Hay `robots.txt`, `sitemap.xml` y `/.well-known/security.txt`.

## Variables de entorno

Ver `.env.example`. Ninguna es obligatoria para que la página compile.

### Audiencias de pauta

`src/components/Pixels.tsx` dispara `PageView` en la carga para Meta, Google,
TikTok y GTM, de modo que cualquier visita entra a la audiencia de remarketing
antes de interactuar. Cada red se activa sola si existe su variable.

## Desarrollo

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build
pnpm lint
```

## Contenido

La venta se procesa en Luma, que pide nombre, apellidos, correo, teléfono, tipo
de broker (inmobiliario / financiero / ambos), aceptación de términos y
tratamiento de datos Habi, y tipo de boleta.
