// Matriz de permisos del parcial: Administrador hace todo. Cualquier otro perfil solo consulta
// y modifica su propia Persona. El "Crear persona" del actor Persona es el autorregistro
// (/registro, sin sesión): con sesión nadie salvo el administrador da de alta personas.
// Ids sembrados en src/db/seed.ts.
export const ADMIN_PERFIL = 1;
export const PRODUCTOR_PERFIL = 2; // lo da de alta el administrador; debe verificar su correo
export const COMPRADOR_PERFIL = 3; // único perfil autorregistrable; verificación opcional

// Perfiles del sistema: el código depende de su id, así que no se renombran ni se inhabilitan
// (inhabilitar Comprador rompería el registro; Productor dejaría fuera a todos los productores).
export const esPerfilSistema = (id: number) => id === ADMIN_PERFIL || id === PRODUCTOR_PERFIL || id === COMPRADOR_PERFIL;

// Qué puede hacer cada perfil, para mostrarlo en Gestión Perfil.
export const alcanceDe = (id: number) =>
  id === ADMIN_PERFIL
    ? "Todas las gestiones"
    : id === PRODUCTOR_PERFIL
      ? "Sus datos · lo crea el administrador · verifica su correo"
      : id === COMPRADOR_PERFIL
        ? "Sus datos · se registra solo"
        : "Sus datos (consultar y modificar)";

// Fila para Gestión Perfil: alcance visible y marca de protegido (el formulario oculta Modificar/Inhabilitar).
export const filaPerfil = (p: { idperfil: number; descripc: string; estado: number }) => ({
  ...p,
  alcance: alcanceDe(p.idperfil),
  protegido: esPerfilSistema(p.idperfil) ? 1 : 0,
});

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
