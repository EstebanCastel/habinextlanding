/**
 * Los términos de la experiencia: una página propia (/experiencia/terminos)
 * enlazada desde el pie y desde la ventana de entrada. Qué datos se guardan,
 * para qué, qué pasa con la foto y las publicaciones, cómo funciona el
 * ranking y cómo ejercer los derechos de habeas data. Es texto de la casa;
 * lo que cambie en la operación se cambia acá, en un solo lugar.
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

export { VERSION };

export default function Legal() {
  return (
    <article className="max-w-3xl">
      <nav aria-label="Secciones" className="mb-10 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/45">
        {SECCIONES.map((s, i) => (
          <a key={s.titulo} href={`#t-${i + 1}`} className="transition-colors hover:text-white">
            {s.titulo}
          </a>
        ))}
      </nav>
      {SECCIONES.map((s, i) => (
        <section key={s.titulo} id={`t-${i + 1}`} className="mb-9 scroll-mt-24">
          <h2 className="mb-3 text-xl font-semibold tracking-tight text-white">{s.titulo}</h2>
          {s.parrafos.map((t) => (
            <p key={t} className="mb-3 text-base font-light leading-relaxed text-white/70">
              {t}
            </p>
          ))}
        </section>
      ))}
      <p className="mt-12 border-t border-white/10 pt-6 text-sm font-light text-white/50">
        Versión del {VERSION}. Estos términos complementan la{" "}
        <a href={POLITICA_HABI} target="_blank" rel="noopener noreferrer" className="text-violet-soft underline underline-offset-4 hover:text-white">
          política de tratamiento de datos de Habi
        </a>
        . ¿Dudas?{" "}
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-violet-soft underline underline-offset-4 hover:text-white">
          Escríbenos por WhatsApp
        </a>
        .
      </p>
    </article>
  );
}
