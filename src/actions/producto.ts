"use server";

import { revalidatePath } from "next/cache";
import { correr, ErrorNegocio, type Resultado } from "@/lib/errores";
import { cambiarEstadoProducto, guardarProducto as guardar, listarProductos } from "@/lib/productos";
import { exigir } from "@/lib/session";
import { plano } from "@/lib/validators";

export async function guardarProducto(modo: "crear" | "modificar", fd: FormData): Promise<Resultado> {
  return correr(async () => {
    const u = await exigir("producto", modo);
    await guardar(modo, plano(fd), fd.get("imagen"), u);
    revalidatePath("/producto");
    return modo === "crear" ? "Producto registrado con estado Activo: ya se ve en el catálogo" : "Producto modificado correctamente";
  });
}

export async function inhabilitarProducto(codigo: string, estado: 0 | 1): Promise<Resultado> {
  return correr(async () => {
    await cambiarEstadoProducto(codigo, estado, await exigir("producto", "inhabilitar"));
    revalidatePath("/producto");
    return estado ? "Producto habilitado: vuelve a verse en el catálogo" : "Producto inhabilitado: ya no se ve en el catálogo";
  });
}

export async function consultarProducto(q: string): Promise<Resultado> {
  return correr(async () => {
    const u = await exigir("producto", "consultar");
    if (!q.trim()) throw new ErrorNegocio("Ingrese un código o un nombre para consultar");
    // El productor solo consulta sus productos; el administrador, todos.
    const filas = await listarProductos({ q, idproductor: u.esAdmin ? undefined : u.idpersona });
    if (!filas.length) throw new ErrorNegocio("No se encontraron productos con ese criterio");
    return { mensaje: filas.length === 1 ? "1 producto encontrado" : `${filas.length} productos encontrados`, filas };
  });
}
