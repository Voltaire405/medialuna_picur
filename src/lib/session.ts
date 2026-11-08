import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { user } from "@/db/schema";
import { auth } from "./auth";
import { ErrorNegocio } from "./errores";
import { ADMIN_PERFIL, puede, type Accion, type Gestion } from "./permisos";
import { buscarUsuario } from "./usuarios";

// Usuario autenticado y vigente. Se relee de la BD en cada petición: si el
// usuario, su perfil o su persona fueron inhabilitados, deja de tener acceso.
export const getUsuario = cache(async () => {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = await buscarUsuario(eq(user.id, s.user.id));
  return u?.vigente ? { ...u, esAdmin: u.idperfil === ADMIN_PERFIL } : null;
});

export type UsuarioActual = NonNullable<Awaited<ReturnType<typeof getUsuario>>>;

// Para páginas: exige sesión y permiso o redirige.
export async function exigirPagina(gestion: Gestion): Promise<UsuarioActual> {
  const u = await getUsuario();
  if (!u) redirect("/login");
  if (!puede(u.esAdmin, gestion, "consultar")) redirect("/");
  return u;
}

// Para server actions: nunca confiar en que el botón estaba oculto.
export async function exigir(gestion: Gestion, accion: Accion): Promise<UsuarioActual> {
  const u = await getUsuario();
  if (!u) throw new ErrorNegocio("Su sesión expiró. Ingrese de nuevo");
  if (!puede(u.esAdmin, gestion, accion)) throw new ErrorNegocio("No tiene permiso para esta acción");
  return u;
}
