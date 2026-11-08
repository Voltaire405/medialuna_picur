// Matriz de permisos del parcial: Administrador hace todo. Cualquier otro perfil opera
// Persona (crear, consultar, modificar; consulta y modificación solo de la propia) y no inhabilita.
export const ADMIN_PERFIL = 1;

export type Gestion = "perfil" | "usuario" | "persona";
export type Accion = "crear" | "consultar" | "modificar" | "inhabilitar";

const PERSONA: Partial<Record<Gestion, Accion[]>> = {
  persona: ["crear", "consultar", "modificar"],
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
