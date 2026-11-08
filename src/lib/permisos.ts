// Matriz de permisos del parcial: Administrador hace todo. Cualquier otro perfil solo consulta
// y modifica su propia Persona. El "Crear persona" del actor Persona es el autorregistro
// (/registro, sin sesión): con sesión nadie salvo el administrador da de alta personas.
// Ids sembrados en src/db/seed.ts.
export const ADMIN_PERFIL = 1;
export const PRODUCTOR_PERFIL = 2; // lo da de alta el administrador; debe verificar su correo
export const COMPRADOR_PERFIL = 3; // único perfil autorregistrable; verificación opcional

export type Gestion = "perfil" | "usuario" | "persona";
export type Accion = "crear" | "consultar" | "modificar" | "inhabilitar";

const PERSONA: Partial<Record<Gestion, Accion[]>> = {
  persona: ["consultar", "modificar"],
};

export function puede(esAdmin: boolean, gestion: Gestion, accion: Accion): boolean {
  return esAdmin || (PERSONA[gestion]?.includes(accion) ?? false);
}

// Los 4 botones de una gestión, derivados de la misma matriz que valida el servidor.
export const permisosDe = (esAdmin: boolean, gestion: Gestion) => ({
  crear: puede(esAdmin, gestion, "crear"),
  consultar: puede(esAdmin, gestion, "consultar"),
  modificar: puede(esAdmin, gestion, "modificar"),
  inhabilitar: puede(esAdmin, gestion, "inhabilitar"),
});
