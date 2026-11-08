"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { perfil } from "@/db/schema";
import { correr, ErrorNegocio, type Resultado } from "@/lib/errores";
import { esPerfilSistema, filaPerfil } from "@/lib/permisos";
import { exigir } from "@/lib/session";
import { perfilSchema, plano } from "@/lib/validators";

export async function guardarPerfil(modo: "crear" | "modificar", fd: FormData): Promise<Resultado> {
  return correr(async () => {
    await exigir("perfil", modo);
    const f = plano(fd);
    const { descripc } = perfilSchema.parse(f);
    const id = Number(f.idperfil);
    const repetido = sql`lower(${perfil.descripc}) = lower(${descripc})`;
    if (modo === "crear") {
      if ((await db.select().from(perfil).where(repetido)).length) throw new ErrorNegocio("Ya existe un perfil con esa descripción");
      await db.insert(perfil).values({ descripc });
    } else {
      if (esPerfilSistema(id)) throw new ErrorNegocio("Los perfiles del sistema (Administrador, Productor, Comprador) no se pueden modificar");
      if ((await db.select().from(perfil).where(and(repetido, ne(perfil.idperfil, id)))).length)
        throw new ErrorNegocio("Ya existe un perfil con esa descripción");
      const r = await db.update(perfil).set({ descripc }).where(eq(perfil.idperfil, id)).returning();
      if (!r.length) throw new ErrorNegocio("El perfil no existe");
    }
    revalidatePath("/perfil");
    return modo === "crear" ? "Perfil guardado correctamente" : "Perfil modificado correctamente";
  });
}

export async function inhabilitarPerfil(id: string, estado: 0 | 1): Promise<Resultado> {
  return correr(async () => {
    await exigir("perfil", "inhabilitar");
    if (esPerfilSistema(Number(id)))
      throw new ErrorNegocio("Los perfiles del sistema (Administrador, Productor, Comprador) no se pueden inhabilitar");
    const r = await db.update(perfil).set({ estado }).where(eq(perfil.idperfil, Number(id))).returning();
    if (!r.length) throw new ErrorNegocio("El perfil no existe");
    revalidatePath("/perfil");
    return estado ? "Perfil habilitado" : "Perfil inhabilitado";
  });
}

export async function consultarPerfil(q: string): Promise<Resultado> {
  return correr(async () => {
    await exigir("perfil", "consultar");
    const id = Number(q.trim());
    if (!Number.isInteger(id) || id < 1) throw new ErrorNegocio("Ingrese un ID de perfil numérico");
    const [fila] = await db.select().from(perfil).where(eq(perfil.idperfil, id));
    if (!fila) throw new ErrorNegocio("No se encontró un perfil con ese ID");
    return { mensaje: "Perfil encontrado", fila: filaPerfil(fila) };
  });
}
