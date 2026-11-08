import { eq } from "drizzle-orm";
import { user } from "@/db/schema";
import { buscarUsuario } from "./usuarios";

export const MSG = {
  vacioUsuario: "Ingrese su usuario",
  vacioClave: "Ingrese su contraseña",
  noRegistrado: "El usuario no se encuentra registrado",
  inhabilitado: "Su usuario está inhabilitado. Contacte al administrador",
  claveIncorrecta: "La contraseña es incorrecta",
};

// Orden del parcial: campos vacíos -> usuario inexistente -> inhabilitado.
// La contraseña la verifica Better Auth después de pasar esta validación.
export async function validarAcceso(nombreu: string, contrasena: string): Promise<string | null> {
  if (!nombreu) return MSG.vacioUsuario;
  if (!contrasena) return MSG.vacioClave;
  const u = await buscarUsuario(eq(user.username, nombreu));
  if (!u) return MSG.noRegistrado;
  return u.vigente ? null : MSG.inhabilitado;
}
