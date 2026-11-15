"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, or } from "drizzle-orm";
import { persona, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { MSG, validarAcceso } from "@/lib/acceso";
import { correr, ErrorNegocio, type Resultado } from "@/lib/errores";
import { enviarCorreo } from "@/lib/mail";
import { altaConRol } from "@/lib/roles";
import { getUsuario } from "@/lib/session";
import { buscarUsuario, cambiarContrasena, contrasenaValida } from "@/lib/usuarios";
import { contrasenaSchema, plano } from "@/lib/validators";
import { confirmarVerificacion, enviarVerificacion, exigeVerificacion } from "@/lib/verificacion";

export async function ingresar(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const f = plano(fd);
  const nombreu = (f.nombreu ?? "").trim().toLowerCase();
  const contrasena = f.contrasena ?? "";
  const error = await validarAcceso(nombreu, contrasena);
  if (error) return { ok: false, mensaje: error };
  // Productor sin correo verificado: se comprueba la contraseña antes de reenviar el enlace,
  // para que conocer solo el usuario no permita disparar correos.
  const u = (await buscarUsuario(eq(user.username, nombreu)))!;
  if (exigeVerificacion(u)) {
    if (!(await contrasenaValida(u.idusuario, contrasena))) return { ok: false, mensaje: MSG.claveIncorrecta };
    try {
      await enviarVerificacion(u.idusuario, u.correo);
    } catch (e) {
      console.error(e);
      return { ok: false, mensaje: "Debe verificar su correo, pero no se pudo enviar el enlace. Intente más tarde" };
    }
    return { ok: false, mensaje: `Debe verificar su correo antes de ingresar. Enviamos un enlace a ${u.correo}` };
  }
  try {
    await auth.api.signInUsername({ body: { username: nombreu, password: contrasena }, headers: await headers() });
  } catch {
    return { ok: false, mensaje: MSG.claveIncorrecta };
  }
  redirect("/");
}

export async function salir() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

// ponytail: cooldown en memoria por instancia; usar tabla/Turso si hay varias instancias.
const ultimoEnvio = new Map<string, number>();

// El hash no es reversible: se envía el usuario y una contraseña temporal nueva.
export async function recuperar(_: Resultado | null, fd: FormData): Promise<Resultado> {
  return correr(async () => {
    const id = (plano(fd).identificador ?? "").trim().toLowerCase();
    if (!id) throw new ErrorNegocio("Ingrese su identificación o correo electrónico");
    const fila = await buscarUsuario(or(eq(persona.idpersona, id), eq(persona.correo, id)));
    if (!fila?.vigente) throw new ErrorNegocio(MSG.noRegistrado);
    if (Date.now() - (ultimoEnvio.get(fila.idusuario) ?? 0) < 60_000)
      throw new ErrorNegocio("Ya se envió un correo hace instantes. Espere un minuto");
    ultimoEnvio.set(fila.idusuario, Date.now());

    const temporal = randomBytes(9).toString("base64url");
    // El correo sale primero: si falla, la contraseña vigente no se pierde y se puede reintentar.
    try {
      await enviarCorreo(
        fila.correo,
        "Recuperación de acceso - Medialuna",
        `Usuario: ${fila.nombreu}\nContraseña temporal: ${temporal}\n\nIngrese a Medialuna y cambie esta contraseña cuanto antes.`,
      );
    } catch (e) {
      console.error(e);
      ultimoEnvio.delete(fila.idusuario);
      throw new ErrorNegocio("No se pudo enviar el correo. Intente más tarde");
    }
    await cambiarContrasena(fila.idusuario, temporal);
    return "Su usuario y contraseña fue enviado al correo registrado";
  });
}

// Registrarse (sin sesión): solo compradores, con los mismos campos obligatorios que en Gestión Compradores.
// Al productor lo da de alta el administrador.
export async function registrar(_: Resultado | null, fd: FormData): Promise<Resultado> {
  return correr(async () => {
    const f = plano(fd);
    if (f.autoriza !== "on") throw new ErrorNegocio("Debe autorizar el tratamiento de datos personales (Ley 1581 de 2012)", "autoriza");
    // El rol lo fija el servidor: el formulario no puede colar otro perfil.
    await altaConRol("comprador", f, new Date());
    return "Registro exitoso. Ya puede ingresar; le enviamos un enlace para verificar su correo";
  });
}

// Cambio de contraseña del propio usuario. Cierra las demás sesiones y conserva la actual.
export async function cambiarMiContrasena(_: Resultado | null, fd: FormData): Promise<Resultado> {
  return correr(async () => {
    if (!(await getUsuario())) throw new ErrorNegocio("Su sesión expiró. Ingrese de nuevo");
    const f = plano(fd);
    if (!f.actual) throw new ErrorNegocio("Ingrese su contraseña actual");
    const nueva = contrasenaSchema.parse(f.nueva ?? "");
    if (nueva !== f.confirmar) throw new ErrorNegocio("La confirmación no coincide con la nueva contraseña");
    if (nueva === f.actual) throw new ErrorNegocio("La nueva contraseña debe ser distinta de la actual");
    try {
      await auth.api.changePassword({
        body: { currentPassword: f.actual, newPassword: nueva, revokeOtherSessions: true },
        headers: await headers(),
      });
    } catch {
      throw new ErrorNegocio("La contraseña actual es incorrecta");
    }
    return "Contraseña actualizada";
  });
}

// Botón del correo de verificación: confirma el correo y la autorización de datos.
export async function verificarCorreo(_: Resultado | null, fd: FormData): Promise<Resultado> {
  return correr(async () => {
    const f = plano(fd);
    if (f.autoriza !== "on") throw new ErrorNegocio("Debe autorizar el tratamiento de datos personales (Ley 1581 de 2012)");
    await confirmarVerificacion(f.token ?? "");
    return "Correo verificado. Ya puede ingresar";
  });
}
