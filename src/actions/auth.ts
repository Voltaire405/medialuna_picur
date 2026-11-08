"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, or } from "drizzle-orm";
import { persona } from "@/db/schema";
import { auth } from "@/lib/auth";
import { MSG, validarAcceso } from "@/lib/acceso";
import { correr, ErrorNegocio, type Resultado } from "@/lib/errores";
import { enviarCorreo } from "@/lib/mail";
import { ADMIN_PERFIL } from "@/lib/permisos";
import { crearPersona } from "@/lib/personas";
import { buscarUsuario, cambiarContrasena, crearUsuario, validarAltaUsuario } from "@/lib/usuarios";
import { contrasenaSchema, personaSchema, plano, usuarioSchema } from "@/lib/validators";

export async function ingresar(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const f = plano(fd);
  const nombreu = (f.nombreu ?? "").trim().toLowerCase();
  const contrasena = f.contrasena ?? "";
  const error = await validarAcceso(nombreu, contrasena);
  if (error) return { ok: false, mensaje: error };
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

// Registrarse: Gestión Persona + credenciales. El perfil lo elige el usuario (nunca Administrador).
export async function registrar(_: Resultado | null, fd: FormData): Promise<Resultado> {
  return correr(async () => {
    const f = plano(fd);
    if (f.autoriza !== "on") throw new ErrorNegocio("Debe autorizar el tratamiento de datos personales (Ley 1581 de 2012)");
    const p = personaSchema.parse(f);
    const { nombreu, idperfil } = usuarioSchema.parse({ ...f, idpersona: p.idpersona });
    const contrasena = contrasenaSchema.parse(f.contrasena);
    if (idperfil === ADMIN_PERFIL) throw new ErrorNegocio("Seleccione un perfil válido");
    // Todo lo validable va antes de la primera escritura: nunca se borra una persona.
    // ponytail: un fallo inesperado entre ambos inserts (BD caída) deja la persona sin usuario;
    // el administrador puede crearle el usuario desde Gestión Usuario.
    await validarAltaUsuario(nombreu, idperfil);
    await crearPersona(p);
    await crearUsuario({ nombreu, contrasena, idperfil, idpersona: p.idpersona });
    return "Registro exitoso. Ya puede ingresar con su usuario y contraseña";
  });
}
