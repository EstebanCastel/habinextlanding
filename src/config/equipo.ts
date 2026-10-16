import { createHmac } from "node:crypto";

/**
 * El equipo de Habi que acompaña Habi Next.
 *
 * Son buyers y gerentes comerciales: trabajan en el evento, no compran
 * entrada. No se dan de alta en Luma —el cupo y el QR son para los asistentes
 * de verdad— pero sí entran a la experiencia con su correo corporativo y su
 * cédula, arman su carnet y lo publican en sus redes, que es justamente lo que
 * queremos que hagan.
 *
 * La cédula hace de clave, igual que para todos. Si acá no está, la primera
 * que escriban queda como la suya.
 */

export type Companero = {
  email: string;
  nombre?: string;
  apellido?: string;
  /** Hace de clave para entrar. Si falta, la primera que escriba queda. */
  cedula?: string;
  ciudad?: string;
  cargo?: string;
};

export const EQUIPO: Companero[] = [
  { email: "carolinachaves@habi.co", nombre: "Carolina", apellido: "Chaves Martínez", cedula: "52409945", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "sebastianherrera@habi.co", nombre: "Sebastián", apellido: "Herrera Arango", cedula: "1015451307", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "jojhannparra@habi.co", nombre: "Jojhann", apellido: "Parra Betancourth", cedula: "1073166720", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "juanbeltran@habi.co", nombre: "Juan Camilo", apellido: "Beltrán Ramírez", cedula: "1018493473", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "andreapinzon@habi.co", nombre: "Andrea", apellido: "Pinzón Otálora", cedula: "1020772503", ciudad: "Medellín", cargo: "Buyer" },
  { email: "luisaloaiza@habi.co", nombre: "Luisa Fernanda", apellido: "Loaiza Velasco", cedula: "53069862", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "leonardosanchez@habi.co", nombre: "Rafael Leonardo", apellido: "Sánchez Munévar", cedula: "80811418", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "diegoramirezf@habi.co", nombre: "Diego Andrés", apellido: "Ramírez Fierro", cedula: "1030593680", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "johnaranda@habi.co", nombre: "John Jader", apellido: "Aranda Jiménez", cedula: "80732908", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "vivianabautista@habi.co", nombre: "Viviana", apellido: "Bautista Baquero", cedula: "1073236080", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "iancardona@habi.co", ciudad: "Medellín", cargo: "Buyer" },
  { email: "juansalamanca@habi.co", nombre: "Juan David", apellido: "Salamanca Santana", cedula: "1020777427", ciudad: "Bogotá", cargo: "Gerente comercial" },
  { email: "augustocueca@habi.co", nombre: "Augusto Andrés", apellido: "Cueca Silva", cedula: "1020760971", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "oscarcuervo@habi.co", nombre: "Oscar Eduardo", apellido: "Cuervo Avellaneda", cedula: "1030624935", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "wilsonpedreros@habi.co", nombre: "Wilson Yecid", apellido: "Pedreros Forero", cedula: "1013635670", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "nataliepreciado@habi.co", nombre: "Natalie", apellido: "Preciado Poveda", cedula: "53124044", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "yesicapinzon@habi.co", nombre: "Yésica Tatiana", apellido: "Pinzón Ramos", cedula: "1030653191", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "michaelgomez@habi.co", nombre: "Michael", apellido: "Gómez", cedula: "80920063", ciudad: "Bogotá", cargo: "Gerente comercial" },
  { email: "santiagoperez@habi.co", nombre: "Santiago", apellido: "Pérez Fajardo", cedula: "1014296199", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "caterinsierra@habi.co", nombre: "Caterin Andrea", apellido: "Sierra Murcia", cedula: "1075675301", ciudad: "Bogotá", cargo: "Buyer" },
  { email: "elainerodriguez@habi.co", nombre: "Elaine", apellido: "Rodríguez Díaz", cedula: "1065576843", ciudad: "Barranquilla", cargo: "Buyer" },
  { email: "paolarubio@habi.co", nombre: "Paola", apellido: "Rubio", cedula: "1030560035", ciudad: "Bogotá", cargo: "Buyer" },
  // Suman el 16 de octubre: entran a la experiencia sin registro en Luma.
  { email: "paolacastro@habi.co", nombre: "Paola Andrea", apellido: "Castro Rubiano", cedula: "52838208", ciudad: "Bogotá", cargo: "Equipo Habi" },
  { email: "madianchitiva@habi.co", nombre: "Madian Gustavo", apellido: "Chitiva", cedula: "80502270", ciudad: "Bogotá", cargo: "Equipo Habi" },
  { email: "lorenarico@habi.co", nombre: "Lorena", apellido: "Rico Avilés", cedula: "1073707024", ciudad: "Bogotá", cargo: "Equipo Habi" },
  { email: "lorenagutierrez@habi.co", nombre: "Lorena", apellido: "Gutiérrez Suárez", cedula: "1109417758", ciudad: "Bogotá", cargo: "Equipo Habi" },
  { email: "juangalan@habicredit.co", nombre: "Juan Felipe", apellido: "Galán Landínez", cedula: "1000725854", ciudad: "Bogotá", cargo: "Habi Credit" },
  { email: "carlosrios@habicredit.co", nombre: "Carlos Giovanny", apellido: "Ríos Caro", cedula: "80762092", ciudad: "Bogotá", cargo: "Habi Credit" },
  { email: "luisaquijano@habicredit.co", nombre: "Luisa Fernanda", apellido: "Quijano Lozano", cedula: "1018444639", ciudad: "Bogotá", cargo: "Habi Credit" },
  { email: "madeleingonzalez@habicredit.co", nombre: "Madelein Solimar", apellido: "González Montero", cedula: "1030661117", ciudad: "Bogotá", cargo: "Directora comercial · Habi Credit" },
  { email: "michaelfelix@habicredit.co", nombre: "Michael Jair", apellido: "Félix Méndez", cedula: "1018500858", ciudad: "Bogotá", cargo: "Habi Credit" },
  { email: "nadiapardo@habicredit.co", nombre: "Nadia Gretti", apellido: "Pardo Santana", ciudad: "Bogotá", cargo: "Habi Credit" },
  { email: "sammyvargas@habicredit.co", nombre: "Sammy Jo", apellido: "Vargas Flórez", cedula: "1032370808", ciudad: "Bogotá", cargo: "Habi Credit" },
  { email: "fernandopico@habi.co", nombre: "Fernando Enrique", apellido: "Pico Forero", cedula: "72219904", ciudad: "Bogotá", cargo: "Equipo Habi" },
  { email: "johanatrianavasallo@habi.co", nombre: "Nersi Johana", apellido: "Triana Vasallo", cedula: "52845292", ciudad: "Bogotá", cargo: "Equipo Habi" },
  // Trabajan el evento: entran con credencial de equipo, no con entrada. Su
  // registro General en Luma se dio de baja el 16 de octubre para que no
  // ocupara cupo. A Mariam no se le pone cédula porque la que traía su
  // registro (1111111110) era de relleno: la fija ella al entrar.
  { email: "feliperestrepo@habi.co", nombre: "Felipe", apellido: "Restrepo Pérez", cedula: "1128282029", ciudad: "Bogotá", cargo: "Equipo Habi" },
  { email: "mariamsantiago.ext@tuhabi.mx", nombre: "Mariam", apellido: "Santiago", ciudad: "Bogotá", cargo: "Equipo Habi" },
  { email: "estebancastelblanco@habi.co", nombre: "Esteban", apellido: "Castelblanco", cedula: "1021632809", ciudad: "Bogotá", cargo: "Equipo Habi" },
  { email: "sebastian@habi.co", nombre: "Sebastián", apellido: "Noguera Escallón", cedula: "1020718014", ciudad: "Bogotá", cargo: "Equipo Habi" },
];

const POR_CORREO = new Map(EQUIPO.map((c) => [c.email.toLowerCase(), c]));

/** La ficha del compañero, si ese correo es de los nuestros. */
export function fichaDeEquipo(email: string): Companero | undefined {
  return POR_CORREO.get(email.trim().toLowerCase());
}

export function esDelEquipo(email: string): boolean {
  return POR_CORREO.has(email.trim().toLowerCase());
}

/** Lo que acompaña al carnet del compañero, para que sepa qué es ese QR. */
export const AVISO_EQUIPO =
  "Eres del equipo Habi: tu QR no es una entrada de Luma ni ocupa cupo, es tu credencial de staff. Guárdala en el teléfono y nos vemos el 20 en la Av. 68.";

/**
 * El carnet del equipo lleva su propio QR, no el de Luma.
 *
 * Ellos no tienen entrada que escanear en la puerta, pero sí necesitan
 * identificarse: el QR abre una página que dice quién es y de qué equipo, y
 * lleva el logo de Habi encima para que de lejos se vea que es del staff y no
 * de un asistente.
 *
 * El `hmac` evita que alguien se invente una credencial cambiando el correo
 * en la dirección.
 */
export function selloDeEquipo(email: string, secreto: string): string {
  return createHmac("sha256", secreto).update(`equipo:${email.trim().toLowerCase()}`).digest("base64url").slice(0, 16);
}

export function urlDeEquipo(email: string, secreto: string, sitio: string): string {
  const e = encodeURIComponent(email.trim().toLowerCase());
  return `${sitio}/staff/${e}?k=${selloDeEquipo(email, secreto)}`;
}
