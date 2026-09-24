/**
 * Robots (revisores de Meta, vistas previas de WhatsApp y de los clientes de
 * correo, escáneres de seguridad) frente a personas.
 *
 * Existe porque los dos sitios donde medimos interés —el enlace corto y el
 * link de pago— los abre un robot antes que nadie: WhatsApp y Gmail piden la
 * URL apenas llega el mensaje para armar la vista previa, y Meta abre los
 * links de cada plantilla al revisarla. Sin este filtro, medio envío aparece
 * «convertido» en el mismo minuto del despacho.
 */
export function claseDeAgente(ua: string): "movil" | "escritorio" | "robot" {
  if (!ua || /bot|crawl|spider|facebookexternalhit|facebot|whatsapp|preview|headless|curl|python|go-http|okhttp|java\/|wget|scan|validator|monitor|proxy|fetch/i.test(ua)) {
    return "robot";
  }
  if (/(Android.*Mobile|iPhone|iPad|Mobile Safari)/i.test(ua)) return "movil";
  if (/(Windows NT|Macintosh|CrOS|X11)/i.test(ua) && /(Chrome|Safari|Firefox|Edg)\//.test(ua)) return "escritorio";
  return "robot";
}
