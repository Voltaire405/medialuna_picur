import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { persona } from "@/db/schema";
import { ErrorNegocio } from "./errores";
import type { personaSchema } from "./validators";

type DatosPersona = z.infer<typeof personaSchema>;

// Fila para formularios: la fecha de autorización como yyyy-MM-dd.
export const filaPersona = (p: typeof persona.$inferSelect) => ({
  ...p,
  fecha_autoriza: p.fecha_autoriza ? p.fecha_autoriza.toISOString().slice(0, 10) : null,
});

export const nombreCompleto =(p: { nom1: string; apell1: string }) => `${p.nom1} ${p.apell1}`;

export async function crearPersona(p: DatosPersona & { fecha_autoriza?: Date }) {
  if ((await db.select().from(persona).where(eq(persona.idpersona, p.idpersona))).length)
    throw new ErrorNegocio("Ya existe una persona con esa identificación");
  if ((await db.select().from(persona).where(eq(persona.correo, p.correo))).length)
    throw new ErrorNegocio("Ya existe una persona con ese correo");
  await db.insert(persona).values(p);
}
