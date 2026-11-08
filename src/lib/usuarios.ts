import { eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { perfil, persona, user } from "@/db/schema";
import { auth } from "./auth";
import { ErrorNegocio } from "./errores";
import { nombreCompleto } from "./personas";

// Única definición de "usuario vigente": usuario, perfil y persona activos.
export async function buscarUsuario(donde: SQL | undefined) {
  const [u] = await db
    .select({
      idusuario: user.id,
      nombreu: user.username,
      idperfil: user.idperfil,
      perfil: perfil.descripc,
      idpersona: user.idpersona,
      nombre: persona.nom1,
      apellido: persona.apell1,
      correo: persona.correo,
      verificado: user.emailVerified,
      eu: user.estado,
      ep: perfil.estado,
      epe: persona.estado,
    })
    .from(user)
    .innerJoin(perfil, eq(user.idperfil, perfil.idperfil))
    .innerJoin(persona, eq(user.idpersona, persona.idpersona))
    .where(donde);
  if (!u) return undefined;
  const { eu, ep, epe, ...resto } = u;
  return { ...resto, vigente: !!(eu && ep && epe) };
}

// Fila para formularios: el booleano de verificación como "1"/"0" (valor del select) y Sí/No (tabla).
export const filaUsuario = <T extends { verificado: boolean }>({ verificado, ...resto }: T) => ({
  ...(resto as Omit<T, "verificado">),
  verificado: verificado ? "1" : "0",
  verificadoTxt: verificado ? "Sí" : "No",
});

type NuevoUsuario ={ nombreu: string; contrasena: string; idperfil: number; idpersona: string };

// Reglas de alta que no dependen de la persona: perfil activo y nombre de usuario libre.
// `registrar` las valida antes de insertar la persona para no dejarla huérfana.
export async function validarAltaUsuario(nombreu: string, idperfil: number) {
  const [[pf], [existente]] = await Promise.all([
    db.select().from(perfil).where(eq(perfil.idperfil, idperfil)),
    db.select().from(user).where(eq(user.username, nombreu)),
  ]);
  if (!pf || !pf.estado) throw new ErrorNegocio("El perfil no existe o está inhabilitado");
  if (existente) throw new ErrorNegocio("El nombre de usuario ya está en uso");
}

// Alta de `usuario` + credencial (hash) vía Better Auth. Valida 1 persona <-> 1 usuario.
export async function crearUsuario({ nombreu, contrasena, idperfil, idpersona }: NuevoUsuario) {
  const [p] = await db.select().from(persona).where(eq(persona.idpersona, idpersona));
  if (!p || !p.estado) throw new ErrorNegocio("La persona no existe o está inhabilitada");
  if ((await db.select().from(user).where(eq(user.idpersona, idpersona))).length)
    throw new ErrorNegocio("Esa persona ya tiene un usuario");
  await validarAltaUsuario(nombreu, idperfil);

  const ctx = await auth.$context;
  const creado = await ctx.internalAdapter.createUser({
    name: nombreCompleto(p),
    email: p.correo,
    username: nombreu,
    idperfil,
    idpersona,
    estado: 1,
  }, { method: "admin" });
  await ctx.internalAdapter.linkAccount({
    userId: creado.id,
    providerId: "credential",
    accountId: creado.id,
    password: await ctx.password.hash(contrasena),
  });
  return creado.id;
}

// Verifica la contraseña sin abrir sesión (para decidir antes de ingresar).
export async function contrasenaValida(idusuario: string, contrasena: string) {
  const ctx = await auth.$context;
  const cuenta = await ctx.internalAdapter.findCredentialAccount(idusuario);
  return !!cuenta?.password && (await ctx.password.verify({ hash: cuenta.password, password: contrasena }));
}

// Cambia la contraseña y cierra las sesiones abiertas del usuario.
export async function cambiarContrasena(idusuario: string, contrasena: string) {
  const ctx = await auth.$context;
  await ctx.internalAdapter.updatePassword(idusuario, await ctx.password.hash(contrasena));
  await ctx.internalAdapter.deleteUserSessions(idusuario);
}
