"use client";

import { usePathname } from "next/navigation";

/**
 * Las pestañas del panel. Una por asunto, en el orden en que se trabaja el
 * día: primero lo que hay que atender, después la gente, después lo que trae
 * gente, y al final lo que se mide.
 *
 * Son enlaces normales y no <Link>: la navegación suave no vuelve a pintar el
 * layout, y es el layout quien decide si hay sesión. Con la cookie vencida, un
 * <Link> dejaría la cabecera puesta y el cuerpo en blanco; una navegación
 * completa muestra la puerta.
 */
const PESTANAS = [
  { href: "/admin", texto: "Hoy" },
  { href: "/admin/registros", texto: "Registros" },
  { href: "/admin/codigos", texto: "Códigos" },
  { href: "/admin/recuperacion", texto: "Recuperación" },
  { href: "/admin/enlaces", texto: "Enlaces y equipo" },
  { href: "/admin/experiencia", texto: "Experiencia" },
  { href: "/admin/trafico", texto: "Tráfico" },
];

export default function Nav() {
  const ruta = usePathname();
  return (
    <nav className="-mx-5 mb-8 overflow-x-auto px-5 md:-mx-8 md:px-8" aria-label="Secciones del panel">
      <ul className="flex min-w-max gap-1 border-b border-white/10">
        {PESTANAS.map((p) => {
          const activa = p.href === "/admin" ? ruta === "/admin" : ruta.startsWith(p.href);
          return (
            <li key={p.href}>
              <a
                href={p.href}
                aria-current={activa ? "page" : undefined}
                className={`-mb-px block border-b-2 px-4 py-3 text-sm transition-colors ${
                  activa ? "border-violet font-semibold text-white" : "border-transparent text-white/50 hover:text-white"
                }`}
              >
                {p.texto}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
