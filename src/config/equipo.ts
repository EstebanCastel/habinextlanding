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
];

const POR_CORREO = new Map(EQUIPO.map((c) => [c.email.toLowerCase(), c]));

/** La ficha del compañero, si ese correo es de los nuestros. */
export function fichaDeEquipo(email: string): Companero | undefined {
  return POR_CORREO.get(email.trim().toLowerCase());
}

export function esDelEquipo(email: string): boolean {
  return POR_CORREO.has(email.trim().toLowerCase());
}

/** Lo que ve el compañero en el reverso del carnet, donde los demás ven su QR. */
export const AVISO_EQUIPO =
  "Eres del equipo Habi: tu escarapela no lleva QR porque no necesitas entrada. Compártela y nos vemos el 20 en la Av. 68.";
