import Script from "next/script";

/**
 * Etiquetas de remarketing. El requisito del evento es que cualquier persona
 * que entre al sitio quede inmediatamente en la audiencia de pauta, así que
 * los píxeles disparan PageView en la carga, antes de cualquier interacción.
 *
 * Cada red se activa sola si existe su variable de entorno; sin la variable no
 * se inyecta nada, y la página funciona igual.
 *
 *   NEXT_PUBLIC_META_PIXEL_ID    Meta (Facebook / Instagram)
 *   NEXT_PUBLIC_GTAG_ID          Google Ads o GA4 (AW-... o G-...)
 *   NEXT_PUBLIC_TIKTOK_PIXEL_ID  TikTok
 *   NEXT_PUBLIC_GTM_ID           Google Tag Manager, si se centraliza ahí
 */
export default function Pixels() {
  const meta = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const gtag = process.env.NEXT_PUBLIC_GTAG_ID;
  const tiktok = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const gtm = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <>
      {meta ? (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${meta}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              alt=""
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${meta}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      ) : null}

      {gtag ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtag}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${gtag}');`}
          </Script>
        </>
      ) : null}

      {tiktok ? (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
ttq.setAndDefer=function(e,n){e[n]=function(){e.push([n].concat(Array.prototype.slice.call(arguments,0)))}};
for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
ttq.instance=function(e){for(var n=ttq._i[e]||[],i=0;i<ttq.methods.length;i++)ttq.setAndDefer(n,ttq.methods[i]);return n};
ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript";
o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];
a.parentNode.insertBefore(o,a)};ttq.load('${tiktok}');ttq.page();}(window,document,'ttq');`}
        </Script>
      ) : null}

      {gtm ? (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      ) : null}
    </>
  );
}
