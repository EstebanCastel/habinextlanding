"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/**
 * El QR de un pase de adentro: el almuerzo o un taller.
 *
 * Se dibuja en el navegador y no en el servidor porque el pase ya viene
 * firmado en la URL: lo único que falta es pintarlo, y hacerlo acá evita una
 * petición más justo cuando la persona está en la fila.
 *
 * Nivel de corrección alto por lo mismo que el de la entrada: se lee de una
 * pantalla, a veces con brillo y con la mano temblando.
 */
export default function PaseQr({
  url,
  rotulo,
  nota,
}: {
  url: string;
  rotulo: string;
  nota?: string;
}) {
  const [img, setImg] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 560,
      color: { dark: "#07040dff", light: "#ffffffff" },
    })
      .then((d) => {
        if (vivo) setImg(d);
      })
      .catch(() => null);
    return () => {
      vivo = false;
    };
  }, [url]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-soft">{rotulo}</p>
      <div className="grid size-44 place-items-center overflow-hidden rounded-2xl bg-white p-2.5">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={`Código QR · ${rotulo}`} className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs font-medium text-night/40">Armando tu QR…</span>
        )}
      </div>
      {nota ? <p className="text-center text-xs font-light leading-snug text-white/50">{nota}</p> : null}
    </div>
  );
}
