/**
 * La tienda de canje: lo que se lleva quien juntó puntos.
 *
 * No vende nada. Es una vitrina: dice qué hay, cuánto cuesta en puntos y
 * manda a la persona al stand, que es donde se entrega. Un carrito de compras
 * acá sería mentir, porque la entrega la hace alguien con las manos.
 *
 * **La escala arranca en 200 de 265 posibles.** Es deliberado y es alto: el
 * premio tiene que costar casi el día entero, porque lo que la tienda compra
 * de verdad no son termos, es que la gente haga el carnet, publique, recorra
 * el mapa y vaya a los talleres. Si el primer premio saliera en 80 puntos,
 * nadie pasaría de 80.
 *
 * El lapicero es la excepción: no cuesta puntos. Es la prueba de que la
 * tienda existe, para quien se acerca a mirar sin haber jugado.
 */

export type Articulo = {
  id: string;
  nombre: string;
  /** Lo que cuesta afuera, en pesos. Sirve para que el canje se sienta real. */
  precio: number;
  /** Lo que cuesta acá. Cero es gratis. */
  puntos: number;
  imagen: string;
  /** Una línea de lo que es, para quien no reconoce la foto. */
  nota?: string;
  /** Sin existencias: se muestra igual, apagado. Ver lo que se acabó también informa. */
  agotado?: boolean;
  /** Solo para franquiciados. */
  soloFranquicias?: boolean;
};

/**
 * De pesos a puntos. 20.000 son 200 y 100.000 son 265: toda la tienda cabe
 * en los últimos sesenta y cinco puntos del juego.
 */
export const ARTICULOS: Articulo[] = [
  {
    id: "lapicero",
    nombre: "Lapicero Habi Next",
    precio: 0,
    puntos: 0,
    imagen: "/img/tienda/lapicero.jpg",
    nota: "Para todos, sin puntos.",
  },
  {
    id: "bolsa-morada",
    nombre: "Bolsa de tela morada",
    precio: 20_000,
    puntos: 200,
    imagen: "/img/tienda/bolsa-morada.jpg",
  },
  {
    id: "termo-morado",
    nombre: "Termo morado",
    precio: 20_000,
    puntos: 200,
    imagen: "/img/tienda/termo-morado.jpg",
  },
  {
    id: "libreta",
    nombre: "Libreta",
    precio: 30_000,
    puntos: 215,
    imagen: "/img/tienda/libreta.jpg",
  },
  {
    id: "bolsa-negra",
    nombre: "Bolsa de tela negra",
    precio: 30_000,
    puntos: 215,
    imagen: "/img/tienda/bolsa-negra.jpg",
  },
  {
    id: "termo-negro",
    nombre: "Termo negro",
    precio: 40_000,
    puntos: 230,
    imagen: "/img/tienda/termo-negro.jpg",
  },
  {
    id: "termo-cafe",
    nombre: "Termo de café",
    precio: 40_000,
    puntos: 230,
    imagen: "/img/tienda/termo-cafe.jpg",
    nota: "Vaso de viaje con tapa.",
  },
  {
    id: "camiseta",
    nombre: "Camiseta",
    precio: 40_000,
    puntos: 230,
    imagen: "/img/tienda/camiseta.jpg",
  },
  {
    id: "termo-madera",
    nombre: "Termo con detalle en madera",
    precio: 40_000,
    puntos: 230,
    imagen: "/img/tienda/termo-madera.jpg",
    agotado: true,
  },
  {
    id: "hoodie",
    nombre: "Hoodie",
    precio: 100_000,
    puntos: 265,
    imagen: "/img/tienda/hoodie.jpg",
    nota: "Lo más alto de la tienda.",
  },
  {
    id: "franquicias",
    nombre: "Kit Franquicias",
    precio: 100_000,
    puntos: 265,
    imagen: "/img/tienda/franquicias.jpg",
    nota: "Reservado para franquiciados.",
    soloFranquicias: true,
  },
];

/** Dónde se entrega. */
export const STAND = {
  donde: "Stand de Habi",
  comoLlegar: "Está en la zona de stands, al lado del punto de café.",
};

export const pesos = (n: number) =>
  n === 0 ? "Gratis" : `$${n.toLocaleString("es-CO")}`;

/** Lo que falta para alcanzar un artículo, o cero si ya alcanza. */
export const faltan = (puntos: number, a: Articulo) => Math.max(0, a.puntos - puntos);
