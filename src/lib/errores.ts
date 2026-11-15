import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";

export class ErrorNegocio extends Error {
  // `campo`: nombre del campo del formulario que debe marcarse con el mensaje.
  constructor(
    mensaje: string,
    readonly campo?: string,
  ) {
    super(mensaje);
  }
}

// Borrado lógico bloqueado porque otros registros activos dependen del que se quiere inhabilitar.
export const errorDependientes = (registro: string, dependientes: string) =>
  new ErrorNegocio(`No se puede inhabilitar ${registro}: existe información dependiente (${dependientes})`);

export type Fila = Record<string, string | number | null>;
export type Resultado = { ok: boolean; mensaje: string; fila?: Fila; filas?: Fila[]; errores?: Record<string, string> };

const erroresPorCampo = (e: ZodError) => {
  const errores: Record<string, string> = {};
  for (const { path, message } of e.issues) {
    const campo = path[0];
    if (typeof campo === "string" && !(campo in errores)) errores[campo] = message;
  }
  return errores;
};

// Ejecuta una acción y convierte excepciones esperadas en mensajes para el formulario.
export async function correr(fn: () => Promise<string | { mensaje: string; fila?: Fila; filas?: Fila[] }>): Promise<Resultado> {
  try {
    const r = await fn();
    return { ok: true, ...(typeof r === "string" ? { mensaje: r } : r) };
  } catch (e) {
    unstable_rethrow(e); // redirect() y similares deben propagarse
    if (e instanceof ErrorNegocio)
      return { ok: false, mensaje: e.message, ...(e.campo && { errores: { [e.campo]: e.message } }) };
    if (e instanceof ZodError) {
      const errores = erroresPorCampo(e);
      const general = e.issues.find((i) => !i.path.length)?.message;
      return { ok: false, mensaje: general ?? "Revise los campos marcados en rojo", errores };
    }
    console.error(e);
    return { ok: false, mensaje: "Ocurrió un error inesperado. Intente de nuevo." };
  }
}
