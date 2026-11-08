"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { perfil, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { correr, ErrorNegocio, type Resultado } from "@/lib/errores";
import { exigir } from "@/lib/session";
import { cambiarContrasena, crearUsuario, filaUsuario } from "@/lib/usuarios";
import { contrasenaSchema, plano, usuarioSchema } from "@/lib/validators";

export async function guardarUsuario(modo: "crear" | "modificar", fd: FormData): Promise<Resultado> {
  return correr(async () => {
    const u = await exigir("usuario", modo);
    const f = plano(fd);
    const d = usuarioSchema.parse(f);
    // Solo el administrador llega aquí (exigir): puede dar por verificado el correo, p. ej. en pruebas locales.
    const emailVerified = f.verificado === "1";
    if (modo === "crear") {
      const id = await crearUsuario({ ...d, contrasena: contrasenaSchema.parse(f.contrasena) });
      if (emailVerified) await db.update(user).set({ emailVerified }).where(eq(user.id, id));
    } else {
      const [actual] = await db.select().from(user).where(eq(user.id, f.idusuario ?? ""));
      if (!actual) throw new ErrorNegocio("El usuario no existe");
      if (actual.id === u.idusuario && d.idperfil !== actual.idperfil)
        throw new ErrorNegocio("No puede cambiar su propio perfil");
      if ((await db.select().from(user).where(and(eq(user.username, d.nombreu), ne(user.id, actual.id)))).length)
        throw new ErrorNegocio("El nombre de usuario ya está en uso");
      if (d.idperfil !== actual.idperfil) {
        // Solo se exige perfil activo si se cambia de perfil; el resto de ediciones no se bloquea.
        const [pf] = await db.select().from(perfil).where(eq(perfil.idperfil, d.idperfil));
        if (!pf?.estado) throw new ErrorNegocio("El perfil no existe o está inhabilitado");
      }
      await db
        .update(user)
        .set({ username: d.nombreu, idperfil: d.idperfil, ...(f.verificado !== undefined && { emailVerified }) })
        .where(eq(user.id, actual.id));
      if (f.contrasena) await cambiarContrasena(actual.id, contrasenaSchema.parse(f.contrasena));
    }
    revalidatePath("/usuario");
    return modo === "crear" ? "Usuario guardado correctamente" : "Usuario modificado correctamente";
  });
}

export async function inhabilitarUsuario(id: string, estado: 0 | 1): Promise<Resultado> {
  return correr(async () => {
    const u = await exigir("usuario", "inhabilitar");
    if (id === u.idusuario && estado === 0) throw new ErrorNegocio("No puede inhabilitar su propio usuario");
    const r = await db.update(user).set({ estado }).where(eq(user.id, id)).returning();
    if (!r.length) throw new ErrorNegocio("El usuario no existe");
    if (!estado) await (await auth.$context).internalAdapter.deleteUserSessions(id);
    revalidatePath("/usuario");
    return estado ? "Usuario habilitado" : "Usuario inhabilitado";
  });
}

export async function consultarUsuario(q: string): Promise<Resultado> {
  return correr(async () => {
    await exigir("usuario", "consultar");
    const t = q.trim().toLowerCase();
    if (!t) throw new ErrorNegocio("Ingrese el nombre de usuario a consultar");
    const [fila] = await db
      .select({
        idusuario: user.id,
        nombreu: user.username,
        idpersona: user.idpersona,
        idperfil: user.idperfil,
        verificado: user.emailVerified,
        estado: user.estado,
      })
      .from(user)
      .where(or(eq(user.username, t), eq(user.id, q.trim())));
    if (!fila) throw new ErrorNegocio("No se encontró un usuario con ese nombre");
    return { mensaje: "Usuario encontrado", fila: filaUsuario(fila) };
  });
}
