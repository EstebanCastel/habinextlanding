/**
 * Nombres corregidos para la puerta.
 *
 * El padrón del validador se arma leyendo Luma, y en Luma el nombre del
 * invitado es el de la cuenta con la que se registró: no hay endpoint para
 * cambiarlo y solo lo cambia su dueño. Eso rompe el caso de la inmobiliaria
 * que compra una entrada y después manda a otra persona: el correo es el de
 * la empresa, el nombre es el de quien hizo el registro y en la puerta sale
 * alguien que no es el que está parado ahí.
 *
 * Acá se escribe la corrección, por correo, y `armarPadron` la aplica. Vive
 * en código y no en el almacén a propósito: un documento suelto se pisa solo
 * con que alguien le dé a «refrescar padrón», y esto tiene que aguantar el
 * día del evento entero.
 */
export const NOMBRES_CORREGIDOS: Record<string, string> = {
  // Inmobiliaria V&V: la entrada la redimió Laura Valencia y va Giovanny.
  "gerenciavyvsas@gmail.com": "Giovanny Andrés Carabali Palechor",
};

export const nombreCorregido = (email: string | undefined | null): string | undefined =>
  email ? NOMBRES_CORREGIDOS[email.trim().toLowerCase()] : undefined;
