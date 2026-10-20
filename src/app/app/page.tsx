import type { Metadata } from "next";
import { headers } from "next/headers";

/**
 * El atajo a la app de Red Habi.
 *
 * Un SMS no aguanta dos URLs de tienda —entre las dos se comen ciento treinta
 * caracteres y parten el mensaje en dos— y además obliga a quien lo recibe a
 * saber si su teléfono es de Google o de Apple. Esto es un solo enlace corto
 * que manda a cada quien a su tienda.
 *
 * El salto va en el cliente y no en el servidor a propósito: así quien llega
 * ve la pieza un segundo antes de que la tienda se abra encima, y quien tenga
 * el salto bloqueado todavía tiene los dos botones a mano.
 */

export const metadata: Metadata = {
  title: "Descarga Red Habi",
  description: "Todas las propiedades en un solo lugar. La red de brokers de Habi.",
};

const GOOGLE = "https://play.google.com/store/apps/details?id=co.habi.redhabi&hl=es_CO";
const APPLE = "https://apps.apple.com/co/app/red-habi/id6814695758";

export const dynamic = "force-dynamic";

export default async function DescargarApp() {
  // La política de seguridad del sitio prohíbe el script en línea sin nonce,
  // y el proxy lo deja en una cabecera para esto.
  const nonce = (await headers()).get("x-nonce") ?? "";
  return (
    <main className="s-night grid min-h-dvh place-items-center bg-night px-5 py-10">
      <div className="w-full max-w-md text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/redhabi/red-habi.jpg"
          alt="Red Habi · todas las propiedades en un solo lugar"
          className="mx-auto w-full rounded-2xl"
        />
        <h1 className="mt-7 text-3xl font-bold leading-tight tracking-tight text-white">
          Descarga <span className="text-violet-soft">Red Habi</span>
        </h1>
        <p className="mt-3 text-base font-light leading-relaxed text-white/60">
          Todas las propiedades en un solo lugar, con la comisión clara antes de mostrar. Te
          llevamos a tu tienda en un segundo.
        </p>

        <div className="mt-7 grid gap-2.5">
          <a
            href={GOOGLE}
            className="rounded-full bg-violet px-6 py-4 text-base font-bold text-white transition-colors hover:bg-violet/90"
          >
            Android · Google Play
          </a>
          <a
            href={APPLE}
            className="rounded-full border border-white/25 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:border-violet/60"
          >
            iPhone · App Store
          </a>
        </div>
      </div>

      <script
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var u=navigator.userAgent||"";var ios=/iPad|iPhone|iPod/.test(u)||(u.indexOf("Mac")>-1&&"ontouchend" in document);setTimeout(function(){location.replace(ios?${JSON.stringify(APPLE)}:${JSON.stringify(GOOGLE)})},900)}catch(e){}})()`,
        }}
      />
    </main>
  );
}
