import { puede, rolDe, type Gestion } from "./permisos";

type Opcion = { href: string; label: string; icono: string; detalle: string };

const GESTIONES: (Opcion & { gestion: Gestion })[] = [
  { href: "/perfil", label: "Gestión Perfil", gestion: "perfil", icono: "🪪", detalle: "Perfiles del sistema y lo que puede hacer cada uno" },
  { href: "/usuario", label: "Gestión Usuario", gestion: "usuario", icono: "🔑", detalle: "Cuentas de acceso, su perfil y la verificación del correo" },
  { href: "/persona", label: "Gestión Persona", gestion: "persona", icono: "👤", detalle: "Datos personales y de contacto" },
  { href: "/productor", label: "Gestión Productores", gestion: "productor", icono: "🌱", detalle: "Campesinos que venden en Medialuna" },
  { href: "/comprador", label: "Gestión Compradores", gestion: "comprador", icono: "🛒", detalle: "Quienes compran y sus datos de entrega" },
  { href: "/categoria", label: "Gestión Categorías", gestion: "categoria", icono: "🏷️", detalle: "Frutas, verduras, lácteos y demás grupos del catálogo" },
  { href: "/producto", label: "Gestión Productos", gestion: "producto", icono: "📦", detalle: "Productos de todos los productores" },
];

// Opciones del menú según el perfil; el panel principal muestra las mismas como accesos directos.
export function menuDe(u: { idperfil: number; esAdmin: boolean }): Opcion[] {
  return [
    ...GESTIONES.filter((g) => puede(u.idperfil, g.gestion, "consultar")).map((g) =>
      g.gestion === "producto" && !u.esAdmin ? { ...g, label: "Mis productos", detalle: "Publique y actualice lo que ofrece" } : g,
    ),
    { href: "/catalogo", label: "Catálogo", icono: "🧺", detalle: "Productos publicados, con precio, descuento y precio final" },
    ...(rolDe(u.idperfil) ? [{ href: "/mis-datos", label: "Mis datos", icono: "📇", detalle: "Sus datos personales y de contacto" }] : []),
    { href: "/contrasena", label: "Mi contraseña", icono: "🔒", detalle: "Cambie su contraseña de acceso" },
  ];
}
