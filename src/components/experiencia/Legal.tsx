/**
 * Los términos de la experiencia, al pie de cada pantalla, debajo del pie
 * de la landing: en columnas y en letra chica, siempre a la vista. Qué datos
 * se guardan, para qué, qué pasa con la foto y las publicaciones, cómo
 * funciona el ranking y cómo ejercer los derechos de habeas data. Es texto
 * de la casa; lo que cambie en la operación se cambia acá, en un solo lugar.
 */

const POLITICA_HABI = "https://habi.co/politica-de-tratamiento-de-datos";
const WHATSAPP = "https://wa.me/573009110459";
const VERSION = "6 de octubre de 2026";

const SECCIONES: { titulo: string; parrafos: string[] }[] = [
  {
    titulo: "1. Qué es esta experiencia y quién la opera",
    parrafos: [
      "La experiencia de Habi Next Colombia (habinext.com/experiencia) es una actividad gratuita y opcional para quienes tienen una entrada aprobada al evento del 20 de octubre de 2026 en el Centro de Convenciones Avenida 68, Bogotá. La opera Habi, organizador del evento. Participar no es requisito para asistir ni para usar la entrada.",
      "Al entrar con tu correo y tu cédula aceptas estos términos y la política de tratamiento de datos de Habi. Si no estás de acuerdo con algo de lo que sigue, puedes no participar: tu entrada sigue siendo válida.",
    ],
  },
  {
    titulo: "2. Cómo se entra",
    parrafos: [
      "Se entra con el correo y la cédula con los que se registró la entrada. La cédula funciona como clave y se guarda cifrada de forma irreversible (un hash con sal); nunca la mostramos ni la enviamos a nadie. Si tu registro no tenía cédula, la primera que escribas queda asociada a tu entrada y es la que se cotejará en la puerta.",
      "La sesión queda guardada en tu navegador hasta por 180 días. Si usas un aparato compartido, sal con el botón «Salir». Tú eres responsable de no compartir tu cédula ni tu sesión.",
    ],
  },
  {
    titulo: "3. Qué datos tratamos",
    parrafos: [
      "Para operar la experiencia tratamos: nombre y apellido; correo; cédula (solo como hash); el tipo y estado de tu entrada y el código QR que emite Luma; la foto que subas o tomes y el carnet que se genera con ella; las fotos del evento que subas; el texto de la frase que escribas; las publicaciones que hagas desde la experiencia (red, fecha y enlace); las paradas del mapa del tesoro que registres el día del evento, con la foto del stand y, si la autorizas, tu ubicación aproximada para comprobar que estás en el recinto; los clics en tu enlace de invitación; y datos técnicos de uso (dirección IP, navegador, páginas visitadas) para seguridad y medición.",
      "Si conectas LinkedIn, guardamos tu nombre, correo, foto de perfil y un permiso de publicación que LinkedIn nos entrega, cifrado. Solo lo usamos cuando tú tocas «Publicar». Puedes desconectarlo en cualquier momento desde tu cuenta de LinkedIn.",
    ],
  },
  {
    titulo: "4. Para qué los usamos",
    parrafos: [
      "Para mostrarte tu entrada y tu QR; para armar tu carnet y tu credencial; para contar tus puntos y ubicarte en el ranking; para verificar tu identidad en la puerta del evento; para enviarte mensajes sobre tu entrada y sobre el evento por correo, SMS o WhatsApp; y para medir cómo se usa la experiencia y mejorarla.",
      "No vendemos tus datos ni los compartimos con terceros para fines distintos a operar el evento. Los proveedores que nos ayudan (Luma para la boletería, Wompi para pagos, Infobip para mensajes, Vercel para alojamiento, LinkedIn si lo conectas) tratan los datos por encargo nuestro y bajo sus propias políticas.",
    ],
  },
  {
    titulo: "5. Tu foto, tu carnet y tus publicaciones",
    parrafos: [
      "Tu foto y tu carnet son tuyos. Nunca se publican en ninguna red sin que tú toques el botón correspondiente; las publicaciones en LinkedIn se hacen a tu nombre y con tu permiso, y las de Instagram y WhatsApp salen desde tu propio teléfono. Lo que publiques se rige por las condiciones de cada red.",
      "Al subir una foto declaras que tienes derecho a usarla y que, si aparecen otras personas, cuentas con su autorización. No subas fotos de menores de edad sin la autorización de quien ejerza su patria potestad.",
      "Nos autorizas a mostrar tu nombre de pila y la inicial de tu apellido en el ranking público de la experiencia, y a usar las fotos y frases que subas dentro de la propia experiencia (por ejemplo, en el muro del evento). Si quieres que una foto o tu nombre se retiren, escríbenos y lo hacemos.",
    ],
  },
  {
    titulo: "6. Uso de imagen en el evento",
    parrafos: [
      "Habi Next es un evento grabado y fotografiado. Al asistir aceptas que Habi y sus aliados puedan captar y usar tu imagen y voz en material del evento (fotos, video, redes sociales, piezas de comunicación) sin contraprestación, con respeto a tu dignidad y sin fines distintos a comunicar el evento y las actividades de Habi. Si no quieres aparecer en ese material, avísale al equipo de Habi en el recinto o escríbenos.",
    ],
  },
  {
    titulo: "7. Puntos, ranking y premio",
    parrafos: [
      "Los puntos se ganan completando las misiones descritas en la experiencia. Algunas misiones se comprueban automáticamente; otras dependen de tu palabra o de una captura de pantalla. Habi puede verificar cualquier misión y retirar puntos obtenidos con datos falsos, cuentas duplicadas, automatizaciones o cualquier forma de trampa, y excluir a la persona de la experiencia.",
      "El ranking se cierra el 20 de octubre de 2026 a la medianoche, hora de Colombia. El premio es una sorpresa que Habi define y anuncia el día del evento; no es canjeable por dinero. En caso de empate decide quien alcanzó primero el puntaje. Las decisiones de Habi sobre el ranking y el premio son definitivas. Los empleados de Habi pueden participar, pero no reciben premio.",
    ],
  },
  {
    titulo: "8. Tu entrada y el código QR",
    parrafos: [
      "La entrada es personal e intransferible y está asociada a tu correo y tu cédula. El código QR que ves en la experiencia y en tu billetera es el mismo que emite Luma y que se lee en la puerta: no lo compartas ni lo publiques, porque quien lo tenga podría usarlo. En la puerta pueden pedirte el documento de identidad. Las condiciones de compra, cambio y reembolso de la entrada son las de la boletería del evento.",
    ],
  },
  {
    titulo: "9. Cuánto tiempo guardamos los datos",
    parrafos: [
      "Conservamos los datos de la experiencia hasta seis meses después del evento, para cerrar el ranking, entregar el premio y atender reclamos. Después los eliminamos o anonimizamos, salvo lo que la ley nos obligue a conservar. Las fotos y el carnet que subiste se eliminan en el mismo plazo o antes, si nos lo pides.",
    ],
  },
  {
    titulo: "10. Tus derechos",
    parrafos: [
      "De acuerdo con la Ley 1581 de 2012 y el Decreto 1377 de 2013, tienes derecho a conocer, actualizar, rectificar y suprimir tus datos, a pedir prueba de la autorización, a revocarla y a presentar quejas ante la Superintendencia de Industria y Comercio. Para ejercerlos escríbenos por WhatsApp al +57 300 911 0459 indicando el correo con el que entraste, o usa los canales de la política de tratamiento de datos de Habi.",
      "Suprimir tus datos implica salir de la experiencia y del ranking; no afecta tu entrada al evento.",
    ],
  },
  {
    titulo: "11. Cambios a estos términos",
    parrafos: [
      "Podemos ajustar estos términos para reflejar cambios en la experiencia o en la ley. La versión vigente es la que aparece aquí con su fecha. Si un cambio es relevante, lo avisaremos en la propia experiencia.",
    ],
  },
];

export default function Legal() {
  return (
    <section aria-label="Términos y privacidad de la experiencia" className="border-t border-white/10 pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-white/85">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-violet-soft" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" strokeLinejoin="round" />
            <path d="M9.5 12l1.8 1.8L15 10.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Términos, privacidad y uso de tu imagen
        </h2>
        <p className="text-xs font-light text-white/40">Versión del {VERSION}</p>
      </div>

      {/* En columnas y en letra chica: es el pie de página, no la lectura principal. */}
      <div className="mt-5 gap-x-10 text-[12px] font-light leading-relaxed text-white/50 md:columns-2 lg:columns-3">
        {SECCIONES.map((s) => (
          <div key={s.titulo} className="mb-5 break-inside-avoid">
            <h3 className="mb-1 text-[12px] font-semibold text-white/75">{s.titulo}</h3>
            {s.parrafos.map((t) => (
              <p key={t} className="mb-1.5">
                {t}
              </p>
            ))}
          </div>
        ))}
      </div>

      <p className="mt-2 text-xs font-light text-white/40">
        Estos términos complementan la{" "}
        <a href={POLITICA_HABI} target="_blank" rel="noopener noreferrer" className="text-violet-soft underline underline-offset-4 hover:text-white">
          política de tratamiento de datos de Habi
        </a>
        . ¿Dudas?{" "}
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-violet-soft underline underline-offset-4 hover:text-white">
          Escríbenos por WhatsApp
        </a>
        .
      </p>
    </section>
  );
}
