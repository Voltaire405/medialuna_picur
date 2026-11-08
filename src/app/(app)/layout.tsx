import Link from "next/link";
import { redirect } from "next/navigation";
import { salir } from "@/actions/auth";
import { Logo } from "@/components/Logo";
import { puede } from "@/lib/permisos";
import { getUsuario } from "@/lib/session";

const MENU = [
  { href: "/", label: "Panel principal", gestion: null },
  { href: "/perfil", label: "Gestión Perfil", gestion: "perfil" },
  { href: "/usuario", label: "Gestión Usuario", gestion: "usuario" },
  { href: "/persona", label: "Gestión Persona", gestion: "persona" },
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await getUsuario();
  if (!u) redirect("/login");
  const items = MENU.filter((m) => !m.gestion || puede(u.esAdmin, m.gestion, "consultar"));

  return (
    <div className="min-h-screen">
      <header className="bg-hoja-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Logo className="h-8 w-8" /> Medialuna
          </Link>
          <nav aria-label="Menú principal" className="order-last flex w-full flex-wrap gap-1 md:order-none md:w-auto md:flex-1">
            {items.map((m) => (
              <Link key={m.href} href={m.href} className="rounded-lg px-3 py-1.5 text-sm hover:bg-hoja-700">
                {m.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-right leading-tight">
              {u.nombre} {u.apellido}
              <br />
              <span className="text-xs text-luna">{u.perfil}</span>
            </span>
            <form action={salir}>
              <button className="btn-luna py-1.5">Cerrar sesión</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 py-6">{children}</main>
    </div>
  );
}
