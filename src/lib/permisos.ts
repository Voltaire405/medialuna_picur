// Ids sembrados en src/db/seed.ts.
export const ADMIN_PERFIL = 1;
export const PRODUCTOR_PERFIL = 2; // lo da de alta el administrador; debe verificar su correo
export const COMPRADOR_PERFIL = 3; // único perfil autorregistrable; verificación opcional

// Perfiles del sistema: el código depende de su id, así que no se renombran ni se inhabilitan
// (inhabilitar Comprador rompería el registro; Productor dejaría fuera a todos los productores).
export const esPerfilSistema = (id: number) => id === ADMIN_PERFIL || id === PRODUCTOR_PERFIL || id === COMPRADOR_PERFIL;

// Productor y Comprador son los dos perfiles que además son un rol del mercado, con datos propios que gestionar.
export type Rol = "productor" | "comprador";
export const rolDe = (idperfil: number): Rol | null =>
  idperfil === PRODUCTOR_PERFIL ? "productor" : idperfil === COMPRADOR_PERFIL ? "comprador" : null;

// Qué puede hacer cada perfil, para mostrarlo en Gestión Perfil.
export const alcanceDe = (id: number) =>
  id === ADMIN_PERFIL
    ? "Todas las gestiones · consulta e inhabilita productos"
    : id === PRODUCTOR_PERFIL
      ? "Publica sus productos · consulta el catálogo · lo crea el administrador · verifica su correo"
      : id === COMPRADOR_PERFIL
        ? "Consulta el catálogo · se registra solo"
        : "Sin gestiones · consulta el catálogo";

// Fila para Gestión Perfil: alcance visible y marca de protegido (el formulario oculta Modificar/Inhabilitar).
export const filaPerfil = (p: { idperfil: number; descripc: string; estado: number }) => ({
  ...p,
  alcance: alcanceDe(p.idperfil),
  protegido: esPerfilSistema(p.idperfil) ? 1 : 0,
});

export type Accion = "crear" | "consultar" | "modificar" | "inhabilitar";
type Permisos = Record<Accion, readonly number[]>;

const SOLO_ADMIN: Permisos = {
  crear: [ADMIN_PERFIL],
  consultar: [ADMIN_PERFIL],
  modificar: [ADMIN_PERFIL],
  inhabilitar: [ADMIN_PERFIL],
};

// Matriz de permisos: qué perfiles pueden ejecutar cada acción de cada gestión.
// El catálogo, «Mis datos» y «Mi contraseña» no son gestiones: basta la sesión (y el perfil, en «Mis datos»).
const MATRIZ = {
  perfil: SOLO_ADMIN,
  usuario: SOLO_ADMIN,
  persona: SOLO_ADMIN,
  productor: SOLO_ADMIN,
  comprador: SOLO_ADMIN,
  categoria: SOLO_ADMIN,
  // El productor gestiona solo sus productos (la propiedad se valida en lib/productos.ts);
  // el administrador consulta todos e inhabilita los que incumplan las políticas.
  producto: {
    crear: [PRODUCTOR_PERFIL],
    consultar: [ADMIN_PERFIL, PRODUCTOR_PERFIL],
    modificar: [PRODUCTOR_PERFIL],
    inhabilitar: [ADMIN_PERFIL, PRODUCTOR_PERFIL],
  },
} satisfies Record<string, Permisos>;

export type Gestion = keyof typeof MATRIZ;

export const puede = (idperfil: number, gestion: Gestion, accion: Accion): boolean =>
  (MATRIZ[gestion] as Permisos)[accion].includes(idperfil);

// Los 4 botones de una gestión, derivados de la misma matriz que valida el servidor.
export const permisosDe = (idperfil: number, gestion: Gestion) => ({
  crear: puede(idperfil, gestion, "crear"),
  consultar: puede(idperfil, gestion, "consultar"),
  modificar: puede(idperfil, gestion, "modificar"),
  inhabilitar: puede(idperfil, gestion, "inhabilitar"),
});
