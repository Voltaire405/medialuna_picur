import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { perfil } from "@/db/schema";
import { Logo } from "@/components/Logo";
import { RegistroForm } from "@/components/RegistroForm";
import { ADMIN_PERFIL } from "@/lib/permisos";
import { getUsuario } from "@/lib/session";

export default async function RegistroPage() {
  if (await getUsuario()) redirect("/");
  const perfiles = await db
    .select({ value: perfil.idperfil, label: perfil.descripc })
    .from(perfil)
    .where(and(eq(perfil.estado, 1), ne(perfil.idperfil, ADMIN_PERFIL)));
  return (
    <main className="mx-auto max-w-3xl p-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Logo className="h-10 w-10" />
        <div>
          <h1 className="text-2xl font-bold text-hoja-900">Registrarse en Medialuna</h1>
          <p className="text-sm text-tierra">Gestión Persona · cree su cuenta de productor o comprador</p>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow">
        <RegistroForm perfiles={perfiles.map((p) => ({ value: String(p.value), label: p.label }))} />
      </div>
    </main>
  );
}
