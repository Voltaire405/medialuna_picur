"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { persona, user } from "@/db/schema";
import { correr, ErrorNegocio, type Resultado } from "@/lib/errores";
import { crearPersona, filaPersona, nombreCompleto } from "@/lib/personas";
import { exigir } from "@/lib/session";
import { personaSchema, plano } from "@/lib/validators";
import { exigirCorreoConfiable } from "@/lib/verificacion";

export async function guardarPersona(modo: "crear" | "modificar", fd: FormData): Promise<Resultado> {
  return correr(async () => {
    await exigir("persona", modo);
    const p = personaSchema.parse(plano(fd));
    if (modo === "crear") {
      await exigirCorreoConfiable(p.correo);
      await crearPersona(p);
    } else {
      const [actual] = await db.select().from(persona).where(eq(persona.idpersona, p.idpersona));
      if (!actual) throw new ErrorNegocio("La persona no existe");
      const cambiaCorreo = actual.correo !== p.correo;
      if (cambiaCorreo) {
        const [otro] = await db
          .select()
          .from(persona)
          .where(and(eq(persona.correo, p.correo), ne(persona.idpersona, p.idpersona)));
        if (otro) throw new ErrorNegocio("Ya existe una persona con ese correo");
        await exigirCorreoConfiable(p.correo);
      }
      await db.update(persona).set(p).where(eq(persona.idpersona, p.idpersona));
      // El usuario enlazado conserva correo y nombre sincronizados; un correo nuevo debe verificarse otra vez.
      await db
        .update(user)
        .set({ email: p.correo, name: nombreCompleto(p), ...(cambiaCorreo && { emailVerified: false }) })
        .where(eq(user.idpersona, p.idpersona));
    }
    revalidatePath("/persona");
    return modo === "crear" ? "Persona guardada correctamente" : "Persona modificada correctamente";
  });
}

export async function inhabilitarPersona(id: string, estado: 0 | 1): Promise<Resultado> {
  return correr(async () => {
    const u = await exigir("persona", "inhabilitar");
    if (id === u.idpersona && estado === 0) throw new ErrorNegocio("No puede inhabilitar su propia persona");
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
