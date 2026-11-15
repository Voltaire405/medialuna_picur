import { and, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { persona, producto, user } from "@/db/schema";
import { ErrorNegocio } from "./errores";
import { COMPRADOR_PERFIL, PRODUCTOR_PERFIL, type Rol } from "./permisos";
import { crearPersona, modificarPersona } from "./personas";
import { cambiarEstadoUsuario, crearUsuario, validarAltaUsuario } from "./usuarios";
import { compradorSchema, contrasenaSchema, nombreuSchema, productorSchema } from "./validators";
import { enviarVerificacion, exigirCorreoConfiable } from "./verificacion";

// Productor y Comprador no tienen tabla propia: son personas cuyo usuario tiene ese perfil.
// Su «estado» es el de su usuario: inhabilitado no ingresa y sus productos salen del catálogo.
const ROLES: Record<Rol, { idperfil: number; schema: typeof compradorSchema }> = {
  productor: { idperfil: PRODUCTOR_PERFIL, schema: productorSchema },
  comprador: { idperfil: COMPRADOR_PERFIL, schema: compradorSchema },
};

// `q` busca por coincidencia (documento, nombre, apellido o correo); `idpersona` trae exactamente a esa persona.
export async function listarRol(rol: Rol, { q, idpersona }: { q?: string; idpersona?: string } = {}) {
  const t = q?.trim();
  return db
    .select({
      idpersona: persona.idpersona,
      nom1: persona.nom1,
      nom2: persona.nom2,
      apell1: persona.apell1,
      apell2: persona.apell2,
      movil: persona.movil,
      direccion: persona.direccion,
      fecha_nac: persona.fecha_nac,
      correo: persona.correo,
      nombreu: user.username,
      productos: sql<number>`(select count(*) from ${producto} where ${producto.idproductor} = ${persona.idpersona} and ${producto.estado} = 1)`,
      estado: user.estado,
    })
    .from(user)
    .innerJoin(persona, eq(user.idpersona, persona.idpersona))
    .where(
      and(
        eq(user.idperfil, ROLES[rol].idperfil),
        idpersona ? eq(persona.idpersona, idpersona) : undefined,
        t ? or(eq(persona.idpersona, t), like(persona.nom1, `%${t}%`), like(persona.apell1, `%${t}%`), like(persona.correo, `%${t}%`)) : undefined,
      ),
    )
    .orderBy(persona.apell1, persona.nom1);
}

// Alta de persona + usuario con el perfil del rol. `fecha_autoriza` solo cuando la propia persona autoriza (registro).
export async function altaConRol(rol: Rol, f: Record<string, string>, fecha_autoriza?: Date) {
  const { idperfil, schema } = ROLES[rol];
  const { nombreu, contrasena, ...p } = schema.extend({ nombreu: nombreuSchema, contrasena: contrasenaSchema }).parse(f);
  await exigirCorreoConfiable(p.correo);
  // Todo lo validable va antes de la primera escritura: nunca se borra una persona.
  // ponytail: un fallo inesperado entre ambos inserts (BD caída) deja la persona sin usuario;
  // el administrador puede crearle el usuario desde Gestión Usuario.
  await validarAltaUsuario(nombreu, idperfil);
  await crearPersona({ ...p, fecha_autoriza });
  const idusuario = await crearUsuario({ nombreu, contrasena, idperfil, idpersona: p.idpersona });
  // Si el correo falla el alta sigue siendo válida: el enlace se reenvía al ingresar o lo marca el administrador.
  try {
    await enviarVerificacion(idusuario, p.correo);
  } catch (e) {
    console.error(e);
  }
}

const usuarioDe = async (rol: Rol, idpersona: string) => {
  const [u] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.idpersona, idpersona), eq(user.idperfil, ROLES[rol].idperfil)));
  if (!u) throw new ErrorNegocio(`No existe un ${rol} con ese documento`);
  return u.id;
};

export async function modificarConRol(rol: Rol, f: Record<string, string>) {
  const p = ROLES[rol].schema.parse(f);
  await usuarioDe(rol, p.idpersona);
  await modificarPersona(p);
}

export async function cambiarEstadoRol(rol: Rol, idpersona: string, estado: 0 | 1, actor: { idusuario: string }) {
  await cambiarEstadoUsuario(await usuarioDe(rol, idpersona), estado, actor);
}
