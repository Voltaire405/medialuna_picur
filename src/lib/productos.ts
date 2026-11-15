import { and, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categoria, persona, producto, user } from "@/db/schema";
import { ErrorNegocio } from "./errores";
import { PRODUCTOR_PERFIL } from "./permisos";
import { productoSchema } from "./validators";

export const MAX_IMAGEN = 2 * 1024 * 1024;

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export const precioFinal = (precio: number, descuento: number) => Math.round((precio * (100 - descuento)) / 100);

// El tipo se deduce de la firma del archivo (JPEG: FF D8 FF; PNG: 89 50 4E 47), no de lo que declare el navegador.
export const tipoImagen = (b: Uint8Array) =>
  b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
    ? "image/jpeg"
    : b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
      ? "image/png"
      : null;

async function leerImagen(archivo: FormDataEntryValue | null) {
  if (!(archivo instanceof File) || archivo.size === 0) return null;
  if (archivo.size > MAX_IMAGEN) throw new ErrorNegocio("La imagen no puede superar 2 MB", "imagen");
  const bytes = Buffer.from(await archivo.arrayBuffer());
  if (!tipoImagen(bytes)) throw new ErrorNegocio("La imagen debe ser JPG o PNG", "imagen");
  return bytes;
}

type Filtro = {
  q?: string;
  codigotp?: string;
  idproductor?: string;
  // Lo que ve el comprador: producto, categoría y productor activos.
  soloPublicados?: boolean;
};

// Nunca selecciona el blob de la imagen: las filas llevan la URL que lo sirve.
export async function listarProductos({ q, codigotp, idproductor, soloPublicados }: Filtro = {}) {
  const t = q?.trim();
  const filas = await db
    .select({
      codigo: producto.codigo,
      nombre: producto.nombre,
      codigotp: producto.codigotp,
      categoria: categoria.descripcion,
      precio_venta: producto.precio_venta,
      empaque_unidades: producto.empaque_unidades,
      descuento: producto.descuento,
      idproductor: producto.idproductor,
      productor: sql<string>`${persona.nom1} || ' ' || ${persona.apell1}`,
      // ponytail: el tamaño de la imagen sirve de versión para la caché del navegador;
      // dos imágenes distintas del mismo tamaño exacto mostrarían la anterior. Usar un hash si llega a pasar.
      bytesImagen: sql<number | null>`length(${producto.imagen})`,
      estado: producto.estado,
    })
    .from(producto)
    .innerJoin(categoria, eq(producto.codigotp, categoria.codigotp))
    .innerJoin(persona, eq(producto.idproductor, persona.idpersona))
    .innerJoin(user, eq(user.idpersona, persona.idpersona))
    .where(
      and(
        t ? or(eq(producto.codigo, t.toUpperCase()), like(producto.nombre, `%${t}%`)) : undefined,
        codigotp ? eq(producto.codigotp, codigotp) : undefined,
        idproductor ? eq(producto.idproductor, idproductor) : undefined,
        soloPublicados
          ? and(
              eq(producto.estado, 1),
              eq(categoria.estado, 1),
              eq(persona.estado, 1),
              eq(user.estado, 1),
              eq(user.idperfil, PRODUCTOR_PERFIL),
            )
          : undefined,
      ),
    )
    .orderBy(producto.nombre);
  return filas.map(({ bytesImagen, ...f }) => ({
    ...f,
    imagen: bytesImagen ? `/imagen/${f.codigo}?v=${bytesImagen}` : null,
    precio: pesos.format(f.precio_venta),
    precio_final: pesos.format(precioFinal(f.precio_venta, f.descuento)),
  }));
}

export async function guardarProducto(
  modo: "crear" | "modificar",
  f: Record<string, string>,
  archivo: FormDataEntryValue | null,
  actor: { idpersona: string },
) {
  const d = productoSchema.parse(f);
  const imagen = await leerImagen(archivo);
  const [cat] = await db.select().from(categoria).where(eq(categoria.codigotp, d.codigotp));
  if (!cat?.estado) throw new ErrorNegocio("La categoría no existe o está inhabilitada", "codigotp");
  if (modo === "crear") {
    if (!imagen) throw new ErrorNegocio("Campo requerido", "imagen");
    if ((await db.select({ codigo: producto.codigo }).from(producto).where(eq(producto.codigo, d.codigo))).length)
      throw new ErrorNegocio("Ya existe un producto con ese código", "codigo");
    await db.insert(producto).values({ ...d, imagen, idproductor: actor.idpersona });
  } else {
    const { codigo, ...cambios } = d;
    // El dueño sale de la sesión, nunca del formulario: nadie modifica productos ajenos.
    const r = await db
      .update(producto)
      .set({ ...cambios, ...(imagen && { imagen }) })
      .where(and(eq(producto.codigo, codigo), eq(producto.idproductor, actor.idpersona)))
      .returning({ codigo: producto.codigo });
    if (!r.length) throw new ErrorNegocio("El producto no existe o no le pertenece");
  }
}

// ponytail: un solo `estado`: el productor puede rehabilitar un producto que inhabilitó el administrador.
// Guardar quién lo inhabilitó cuando existan políticas de publicación.
export async function cambiarEstadoProducto(codigo: string, estado: 0 | 1, actor: { idpersona: string; esAdmin: boolean }) {
  const suyo = and(eq(producto.codigo, codigo), actor.esAdmin ? undefined : eq(producto.idproductor, actor.idpersona));
  if (estado) {
    const [cat] = await db
      .select({ estado: categoria.estado })
      .from(producto)
      .innerJoin(categoria, eq(producto.codigotp, categoria.codigotp))
      .where(suyo);
    if (cat && !cat.estado) throw new ErrorNegocio("No se puede habilitar: la categoría del producto está inhabilitada");
  }
  const r = await db.update(producto).set({ estado }).where(suyo).returning({ codigo: producto.codigo });
  if (!r.length) throw new ErrorNegocio("El producto no existe o no le pertenece");
}
