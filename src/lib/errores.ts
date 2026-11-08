import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";

export class ErrorNegocio extends Error {}

export type Fila = Record<string, string | number | null>;
export type Resultado = { ok: boolean; mensaje: string; fila?: Fila };

// Ejecuta una acción y convierte excepciones esperadas en mensajes para el formulario.
export async function correr(fn: () => Promise<string | { mensaje: string; fila: Fila }>): Promise<Resultado> {
  try {
    const r = await fn();
    return { ok: true, ...(typeof r === "string" ? { mensaje: r } : r) };
  } catch (e) {
    unstable_rethrow(e); // redirect() y similares deben propagarse
    if (e instanceof ErrorNegocio) return { ok: false, mensaje: e.message };
    if (e instanceof ZodError) return { ok: false, mensaje: e.issues[0].message };
    console.error(e);
    return { ok: false, mensaje: "Ocurrió un error inesperado. Intente de nuevo." };
  }
}
