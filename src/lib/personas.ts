import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { persona } from "@/db/schema";
import { ErrorNegocio } from "./errores";
import type { personaSchema } from "./validators";

type DatosPersona = z.infer<typeof personaSchema>;

export const nombreCompleto = (p: { nom1: string; apell1: string }) => `${p.nom1} ${p.apell1}`;

export async function crearPersona(p: DatosPersona) {
  if ((await db.select().from(persona).where(eq(persona.idpersona, p.idpersona))).length)
    throw new ErrorNegocio("Ya existe una persona con esa identificación");
  if ((await db.select().from(persona).where(eq(persona.correo, p.correo))).length)
    throw new ErrorNegocio("Ya existe una persona con ese correo");
  await db.insert(persona).values(p);
}
