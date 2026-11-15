import { and, count, eq, like, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categoria, producto } from "@/db/schema";
import { ErrorNegocio, errorDependientes } from "./errores";
import { categoriaSchema } from "./validators";

export async function listarCategorias(q = "") {
  const t = q.trim();
  return db
    .select({
      codigotp: categoria.codigotp,
      descripcion: categoria.descripcion,
      productos: sql<number>`(select count(*) from ${producto} where ${producto.codigotp} = ${categoria.codigotp} and ${producto.estado} = 1)`,
      estado: categoria.estado,
    })
    .from(categoria)
    .where(t ? or(eq(categoria.codigotp, t.toUpperCase()), like(categoria.descripcion, `%${t}%`)) : undefined)
    .orderBy(categoria.descripcion);
}

export const categoriasActivas = () =>
  db.select().from(categoria).where(eq(categoria.estado, 1)).orderBy(categoria.descripcion);

export async function guardarCategoria(modo: "crear" | "modificar", f: Record<string, string>) {
  const d = categoriaSchema.parse(f);
  const mismaDescripcion = sql`lower(${categoria.descripcion}) = lower(${d.descripcion})`;
  const repetida = new ErrorNegocio("Ya existe una categoría con esa descripción", "descripcion");
  if (modo === "crear") {
    if ((await db.select().from(categoria).where(eq(categoria.codigotp, d.codigotp))).length)
      throw new ErrorNegocio("Ya existe una categoría con ese código", "codigotp");
    if ((await db.select().from(categoria).where(mismaDescripcion)).length) throw repetida;
    await db.insert(categoria).values(d);
  } else {
    if ((await db.select().from(categoria).where(and(mismaDescripcion, ne(categoria.codigotp, d.codigotp)))).length) throw repetida;
    // La descripción vive solo aquí: al cambiarla, todos los productos de la categoría la muestran actualizada.
    const r = await db.update(categoria).set({ descripcion: d.descripcion }).where(eq(categoria.codigotp, d.codigotp)).returning();
    if (!r.length) throw new ErrorNegocio("La categoría no existe");
  }
}

export async function cambiarEstadoCategoria(codigotp: string, estado: 0 | 1) {
  if (!estado) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(producto)
      .where(and(eq(producto.codigotp, codigotp), eq(producto.estado, 1)));
    if (n) throw errorDependientes("la categoría", n === 1 ? "1 producto activo" : `${n} productos activos`);
  }
  const r = await db.update(categoria).set({ estado }).where(eq(categoria.codigotp, codigotp)).returning();
  if (!r.length) throw new ErrorNegocio("La categoría no existe");
}
