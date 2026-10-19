import { EVENT } from "./event";

/**
 * Las preguntas que de verdad llegan a SAC.
 *
 * No es un catálogo: cada una está acá porque alguien la escribió. El orden
 * sigue el viaje —primero entro, después llego, después estoy adentro— que es
 * como se consulta cuando falta un día.
 *
 * Lo que todavía no está confirmado sale marcado y no inventado: una respuesta
 * a medias en un FAQ es peor que no tenerla, porque la gente la da por buena y
 * llega a la puerta con un dato que nadie le prometió.
 */

export type Pregunta = { p: string; r: string; porConfirmar?: boolean };
export type Seccion = { id: string; titulo: string; preguntas: Pregunta[] };

/** El canal de ayuda. Es el mismo número por el que ya se les escribe. */
export const SAC = { whatsapp: "+57 300 911 0459", url: "https://wa.me/573009110459" };

export const FAQ: Seccion[] = [
  {
    id: "acceso",
    titulo: "Mi acceso",
    preguntas: [
      {
        p: "¿Cómo activo mi código?",
        r: `Entra a habinext.com/codigo y escríbelo. Usa el mismo correo con el que te registraste: así tu entrada queda aprobada de una vez y te llega el QR.`,
      },
      {
        p: "No encuentro mi código, ¿qué hago?",
        r: `Te lo reenviamos por correo y WhatsApp. Escríbenos al ${SAC.whatsapp} con el correo con el que te registraste.`,
      },
      {
        p: "¿Puedo pasarle mi código a otra persona?",
        r: "No. Cada código es un acceso para una sola persona y se gasta al activarlo.",
      },
      {
        p: "Ya activé mi código, ¿dónde está mi entrada?",
        r: "En habinext.com/experiencia. Entras con tu correo y tu cédula, y ahí está tu QR para la puerta. Desde ahí también lo guardas en Apple Wallet o Google Wallet.",
      },
      {
        p: "Ya pagué y mi registro sigue pendiente, ¿qué hago?",
        r: `Los pagos se revisan a mano. Escríbenos al ${SAC.whatsapp} con tu comprobante y lo dejamos listo.`,
      },
    ],
  },
  {
    id: "llegar",
    titulo: "Cómo llegar",
    preguntas: [
      {
        p: "¿Cuándo y dónde es?",
        r: `${EVENT.dateLong}, en Compensar Centro de Convenciones Avenida 68 (Av. Carrera 68 #49A-47), Bogotá.`,
      },
      {
        p: "¿A qué hora abre el registro?",
        r: "A las 7:30 de la mañana. Las puertas del auditorio abren a las 8:45 y arranca a las 9:00 en punto.",
      },
      {
        p: "¿Por cuál entrada se ingresa?",
        r: "Por la entrada principal del Centro de Convenciones, sobre la Avenida 68. Ahí mismo está el registro.",
      },
      { p: "¿Cómo llego en transporte público?", r: "", porConfirmar: true },
      { p: "¿Dónde puedo parquear?", r: "", porConfirmar: true },
    ],
  },
  {
    id: "durante",
    titulo: "Durante el evento",
    preguntas: [
      {
        p: "¿Qué llevo?",
        r: "Tu QR —en el teléfono o impreso— y tu cédula. Si vas a un taller, lleva computador y llega con batería.",
      },
      {
        p: "¿Si soy VIP tengo asiento reservado?",
        r: "Sí. Las primeras filas del Salón Inspira están reservadas para VIP.",
      },
      {
        p: "¿Cómo reservo un taller?",
        r: "En habinext.com/experiencia, en «Salón Taller». El cupo es limitado porque son mesas de trabajo, así que conviene reservar antes.",
      },
      {
        p: "¿El almuerzo está incluido?",
        r: "Con la entrada VIP, sí. Son tres turnos de media hora entre 12:30 y 2:00, y escoges el tuyo en habinext.com/experiencia. Con la entrada General el almuerzo no va incluido.",
      },
      { p: "¿Hay comida dentro del recinto para General?", r: "", porConfirmar: true },
      { p: "¿Qué restaurantes hay cerca?", r: "", porConfirmar: true },
    ],
  },
  {
    id: "contacto",
    titulo: "Contacto",
    preguntas: [
      {
        p: "¿A quién le escribo si tengo otra duda?",
        r: `Escríbenos por WhatsApp al ${SAC.whatsapp}. Te respondemos el mismo día.`,
      },
    ],
  },
];
