import Link from "next/link";
import { redirect } from "next/navigation";
import { salir } from "@/actions/auth";
import { Logo } from "@/components/Logo";
import { Menu } from "@/components/Menu";
import { menuDe } from "@/lib/menu";
import { getUsuario } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await getUsuario();
  if (!u) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="bg-hoja-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Logo className="h-8 w-8" /> Medialuna
          </Link>
          <div className="flex items-center gap-3 text-sm">
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
        <Menu opciones={[{ href: "/", label: "Panel principal" }, ...menuDe(u)]} />
      </header>
      <main className="mx-auto max-w-6xl p-4 py-6">{children}</main>
    </div>
  );
}
