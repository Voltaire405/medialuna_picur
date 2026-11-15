"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { persona, user } from "@/db/schema";
import { correr, ErrorNegocio, errorDependientes, type Resultado } from "@/lib/errores";
import { rolDe } from "@/lib/permisos";
import { crearPersona, filaPersona, modificarPersona } from "@/lib/personas";
import { modificarConRol } from "@/lib/roles";
import { exigir, getUsuario } from "@/lib/session";
import { personaSchema, plano } from "@/lib/validators";
import { exigirCorreoConfiable } from "@/lib/verificacion";

export async function guardarPersona(modo: "crear" | "modificar", fd: FormData): Promise<Resultado> {
  return correr(async () => {
    await exigir("persona", modo);
    const p = personaSchema.parse(plano(fd));
    if (modo === "crear") {
      await exigirCorreoConfiable(p.correo);
      await crearPersona(p);
    } else await modificarPersona(p);
    revalidatePath("/persona");
    return modo === "crear" ? "Persona guardada correctamente" : "Persona modificada correctamente";
  });
}

export async function inhabilitarPersona(id: string, estado: 0 | 1): Promise<Resultado> {
  return correr(async () => {
    const u = await exigir("persona", "inhabilitar");
    if (id === u.idpersona && estado === 0) throw new ErrorNegocio("No puede inhabilitar su propia persona");
    if (!estado) {
      const [activo] = await db
        .select({ nombreu: user.username })
        .from(user)
        .where(and(eq(user.idpersona, id), eq(user.estado, 1)));
      if (activo) throw errorDependientes("la persona", `su usuario «${activo.nombreu}» está activo; inhabilítelo primero`);
    }
    const r = await db.update(persona).set({ estado }).where(eq(persona.idpersona, id)).returning();
    if (!r.length) throw new ErrorNegocio("La persona no existe");
    revalidatePath("/persona");
    return estado ? "Persona habilitada" : "Persona inhabilitada";
  });
}

export async function consultarPersona(q: string): Promise<Resultado> {
  return correr(async () => {
    await exigir("persona", "consultar");
    const id = q.trim();
    if (!id) throw new ErrorNegocio("Ingrese la identificación a consultar");
    const [fila] = await db.select().from(persona).where(eq(persona.idpersona, id));
    if (!fila) throw new ErrorNegocio("No se encontró una persona con esa identificación");
    return { mensaje: "Persona encontrada", fila: filaPersona(fila) };
  });
}

// «Mis datos»: el productor o el comprador modifica sus propios datos, nunca su documento ni su estado.
export async function guardarMisDatos(_modo: "crear" | "modificar", fd: FormData): Promise<Resultado> {
  return correr(async () => {
    const u = await getUsuario();
    if (!u) throw new ErrorNegocio("Su sesión expiró. Ingrese de nuevo");
    const rol = rolDe(u.idperfil);
    if (!rol) throw new ErrorNegocio("No tiene permiso para esta acción");
    // El documento sale de la sesión: lo que venga en el formulario no cuenta.
    await modificarConRol(rol, { ...plano(fd), idpersona: u.idpersona });
    revalidatePath("/mis-datos");
    return "Sus datos fueron actualizados";
  });
}
