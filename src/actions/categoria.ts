"use server";

import { revalidatePath } from "next/cache";
import { cambiarEstadoCategoria, guardarCategoria as guardar, listarCategorias } from "@/lib/categorias";
import { correr, ErrorNegocio, type Resultado } from "@/lib/errores";
import { exigir } from "@/lib/session";
import { plano } from "@/lib/validators";

export async function guardarCategoria(modo: "crear" | "modificar", fd: FormData): Promise<Resultado> {
  return correr(async () => {
    await exigir("categoria", modo);
    await guardar(modo, plano(fd));
    revalidatePath("/categoria");
    return modo === "crear" ? "Categoría registrada con estado Activo" : "Categoría modificada correctamente";
  });
}

export async function inhabilitarCategoria(codigotp: string, estado: 0 | 1): Promise<Resultado> {
  return correr(async () => {
    await exigir("categoria", "inhabilitar");
    await cambiarEstadoCategoria(codigotp, estado);
    revalidatePath("/categoria");
    return estado ? "Categoría habilitada" : "Categoría inhabilitada: ya no aparece en el registro de productos ni en el catálogo";
  });
}

export async function consultarCategoria(q: string): Promise<Resultado> {
  return correr(async () => {
    await exigir("categoria", "consultar");
    if (!q.trim()) throw new ErrorNegocio("Ingrese un código o una descripción para consultar");
    const filas = await listarCategorias(q);
    if (!filas.length) throw new ErrorNegocio("No se encontraron categorías con ese criterio");
    return { mensaje: filas.length === 1 ? "1 categoría encontrada" : `${filas.length} categorías encontradas`, filas };
  });
}
