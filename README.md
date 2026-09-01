# Habi Next Bogotá — landing

Landing de venta de entradas para **Habi Next Bogotá**, martes 20 de octubre de 2026.

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Motion · pnpm.

## Identidad

Es el sistema visual de Habi Next, no una landing genérica de Habi: fondo negro,
morado `#802ef6` con el secundario `#ba9dfa`, tipografía Urbanist, el asterisco
de ocho puntas y las pastillas de borde morado atravesadas por una regla que se
sale de la pantalla. La cinta de bloques blancos sobre morado (`.habi-tape` en
`globals.css`) cierra los bloques de énfasis.

## Qué se edita y dónde

Todo lo que cambia con el tiempo vive en **`src/config/event.ts`**:

| Dato | Constante |
| --- | --- |
| Fecha, ciudad, duración | `EVENT` |
| Sede (pendiente de confirmar) | `EVENT.venue` |
| Links de compra y patrocinio | `LINKS` |
| Precios, etapas y beneficios | `TICKETS` |

La etapa de boletería vigente se calcula sola a partir de `stages[].until`, así
que al pasar el 17 y el 30 de septiembre el precio destacado cambia sin
intervención. La página se regenera cada hora (`revalidate = 3600`).

## Variables de entorno

Ver `.env.example`. Las de Luma y patrocinio definen a dónde apuntan los
botones; las de píxeles activan las audiencias de pauta digital. Ninguna es
obligatoria para que la página compile.

### Audiencias de pauta

`src/components/Pixels.tsx` dispara `PageView` en la carga para Meta, Google,
TikTok y GTM, de modo que cualquier visita entra a la audiencia de remarketing
antes de interactuar. Cada red se activa sola si existe su variable.

## Desarrollo

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build
```

## Contenido

La venta se procesa en Luma, que pide nombre, apellidos, correo, teléfono, tipo
de broker (inmobiliario / financiero / ambos), aceptación de términos y
tratamiento de datos Habi, y tipo de boleta.
