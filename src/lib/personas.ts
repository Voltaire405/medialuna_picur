import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { persona, user } from "@/db/schema";
import { ErrorNegocio } from "./errores";
import { exigirCorreoConfiable } from "./verificacion";

type NuevaPersona = typeof persona.$inferInsert;
// `tele` es opcional: los formularios de productor y comprador no lo envían y no deben borrarlo.
type CambiosPersona = Omit<NuevaPersona, "estado" | "fecha_autoriza" | "tele"> & { tele?: string | null };

// Fila para formularios: la fecha de autorización como yyyy-MM-dd.
export const filaPersona = (p: typeof persona.$inferSelect) => ({
  ...p,
  fecha_autoriza: p.fecha_autoriza ? p.fecha_autoriza.toISOString().slice(0, 10) : null,
});

export const nombreCompleto = (p: { nom1: string; apell1: string }) => `${p.nom1} ${p.apell1}`;

export async function crearPersona(p: NuevaPersona) {
  if ((await db.select().from(persona).where(eq(persona.idpersona, p.idpersona))).length)
    throw new ErrorNegocio("Ya existe una persona con esa identificación", "idpersona");
  if ((await db.select().from(persona).where(eq(persona.correo, p.correo))).length)
    throw new ErrorNegocio("Ya existe una persona con ese correo", "correo");
  await db.insert(persona).values(p);
}

export async function modificarPersona(p: CambiosPersona) {
  const [actual] = await db.select().from(persona).where(eq(persona.idpersona, p.idpersona));
  if (!actual) throw new ErrorNegocio("La persona no existe");
  const cambiaCorreo = actual.correo !== p.correo;
  if (cambiaCorreo) {
    const [otra] = await db
      .select()
      .from(persona)
      .where(and(eq(persona.correo, p.correo), ne(persona.idpersona, p.idpersona)));
    if (otra) throw new ErrorNegocio("Ya existe una persona con ese correo", "correo");
    await exigirCorreoConfiable(p.correo);
  }
  await db.update(persona).set(p).where(eq(persona.idpersona, p.idpersona));
  // El usuario enlazado conserva correo y nombre sincronizados; un correo nuevo debe verificarse otra vez.
  await db
    .update(user)
    .set({ email: p.correo, name: nombreCompleto(p), ...(cambiaCorreo && { emailVerified: false }) })
    .where(eq(user.idpersona, p.idpersona));
}
