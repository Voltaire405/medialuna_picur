import { sql } from "drizzle-orm";
import { blob, check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// estado: 1 = activo, 0 = inhabilitado (borrado lógico, nunca DELETE).
const estado = () => integer("estado").notNull().default(1);
const ahora = () => new Date();
const fecha = (nombre: string) => integer(nombre, { mode: "timestamp_ms" }).notNull();

export const perfil = sqliteTable("perfil", {
  idperfil: integer("idperfil").primaryKey({ autoIncrement: true }),
  descripc: text("descripc").notNull().unique(),
  estado: estado(),
});

export const persona = sqliteTable("persona", {
  idpersona: text("idpersona").primaryKey(), // documento de identidad
  nom1: text("nom1").notNull(),
  nom2: text("nom2"),
  apell1: text("apell1").notNull(),
  apell2: text("apell2"),
  direccion: text("direccion"),
  tele: text("tele"),
  movil: text("movil").notNull(),
  correo: text("correo").notNull().unique(),
  fecha_nac: text("fecha_nac"), // yyyy-MM-dd
  // Evidencia de la autorización de tratamiento de datos (Ley 1581 de 2012, art. 9).
  fecha_autoriza: integer("fecha_autoriza", { mode: "timestamp_ms" }),
  estado: estado(),
});

// Tabla `usuario` del modelo = tabla `user` de Better Auth.
// La contraseña (hash) vive en `cuenta.contrasena`.
export const user = sqliteTable("usuario", {
  id: text("idusuario").primaryKey(),
  username: text("nombreu").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  idperfil: integer("idperfil")
    .notNull()
    .references(() => perfil.idperfil),
  idpersona: text("idpersona")
    .notNull()
    .unique() // 1 persona <-> 1 usuario
    .references(() => persona.idpersona),
  estado: estado(),
  createdAt: fecha("created_at").$defaultFn(ahora),
  updatedAt: fecha("updated_at").$defaultFn(ahora).$onUpdateFn(ahora),
});

export const categoria = sqliteTable("categoria", {
  codigotp: text("codigotp").primaryKey(),
  descripcion: text("descripcion").notNull().unique(),
  estado: estado(),
});

// Productor = persona cuyo usuario tiene el perfil Productor: no hay tabla propia que duplique sus datos.
// El precio final no se guarda: se calcula de precio_venta y descuento.
export const producto = sqliteTable(
  "producto",
  {
    codigo: text("codigo").primaryKey(),
    nombre: text("nombre").notNull(),
    // ponytail: la imagen (JPG/PNG de hasta 2 MB) vive en la BD porque el disco de Vercel no persiste;
    // pasar a almacenamiento de objetos con miniaturas cuando el catálogo crezca.
    imagen: blob("imagen", { mode: "buffer" }),
    precio_venta: integer("precio_venta").notNull(), // pesos por empaque
    empaque_unidades: integer("empaque_unidades").notNull(),
    descuento: integer("descuento").notNull().default(0), // porcentaje
    codigotp: text("codigotp")
      .notNull()
      .references(() => categoria.codigotp),
    idproductor: text("idproductor")
      .notNull()
      .references(() => persona.idpersona),
    estado: estado(),
  },
  (t) => [
    check("producto_precio_positivo", sql`${t.precio_venta} > 0`),
    check("producto_empaque_positivo", sql`${t.empaque_unidades} > 0`),
    check("producto_descuento_porcentaje", sql`${t.descuento} between 0 and 100`),
  ],
);

export const session = sqliteTable("sesion", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("idusuario")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: fecha("expires_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: fecha("created_at").$defaultFn(ahora),
  updatedAt: fecha("updated_at").$defaultFn(ahora).$onUpdateFn(ahora),
});

export const account = sqliteTable("cuenta", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("idusuario")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("contrasena"), // hash scrypt
  createdAt: fecha("created_at").$defaultFn(ahora),
  updatedAt: fecha("updated_at").$defaultFn(ahora).$onUpdateFn(ahora),
});

export const verification = sqliteTable("verificacion", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: fecha("expires_at"),
  createdAt: fecha("created_at").$defaultFn(ahora),
  updatedAt: fecha("updated_at").$defaultFn(ahora).$onUpdateFn(ahora),
});
