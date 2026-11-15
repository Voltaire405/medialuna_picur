"use server";

import { revalidatePath } from "next/cache";
import { correr, ErrorNegocio, type Resultado } from "@/lib/errores";
import type { Rol } from "@/lib/permisos";
import { altaConRol, cambiarEstadoRol, listarRol, modificarConRol } from "@/lib/roles";
import { exigir } from "@/lib/session";
import { plano } from "@/lib/validators";

const NOMBRE = { productor: "Productor", comprador: "Comprador" };

async function guardar(rol: Rol, modo: "crear" | "modificar", fd: FormData): Promise<Resultado> {
  return correr(async () => {
    await exigir(rol, modo);
    if (modo === "crear") await altaConRol(rol, plano(fd));
    else await modificarConRol(rol, plano(fd));
    revalidatePath(`/${rol}`);
    return modo === "crear"
      ? `${NOMBRE[rol]} registrado con estado Activo. Le enviamos un enlace para verificar su correo`
      : `${NOMBRE[rol]} modificado correctamente`;
  });
}

async function inhabilitar(rol: Rol, idpersona: string, estado: 0 | 1): Promise<Resultado> {
  return correr(async () => {
    await cambiarEstadoRol(rol, idpersona, estado, await exigir(rol, "inhabilitar"));
    revalidatePath(`/${rol}`);
    return `${NOMBRE[rol]} ${estado ? "habilitado" : "inhabilitado: ya no puede iniciar sesión"}`;
  });
}

async function consultar(rol: Rol, q: string): Promise<Resultado> {
  return correr(async () => {
    await exigir(rol, "consultar");
    if (!q.trim()) throw new ErrorNegocio("Ingrese un documento, nombre, apellido o correo para consultar");
    const filas = await listarRol(rol, { q });
    if (!filas.length) throw new ErrorNegocio(`No se encontraron ${rol}es con ese criterio`);
    return { mensaje: filas.length === 1 ? `1 ${rol} encontrado` : `${filas.length} ${rol}es encontrados`, filas };
  });
}

export async function guardarProductor(modo: "crear" | "modificar", fd: FormData) {
  return guardar("productor", modo, fd);
}
export async function inhabilitarProductor(id: string, estado: 0 | 1) {
  return inhabilitar("productor", id, estado);
}
export async function consultarProductor(q: string) {
  return consultar("productor", q);
}

export async function guardarComprador(modo: "crear" | "modificar", fd: FormData) {
  return guardar("comprador", modo, fd);
}
export async function inhabilitarComprador(id: string, estado: 0 | 1) {
  return inhabilitar("comprador", id, estado);
}
export async function consultarComprador(q: string) {
  return consultar("comprador", q);
}
