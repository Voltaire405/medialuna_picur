import { z } from "zod";

const REQUERIDO = "Campo requerido";
const requerido = (max = 60) => z.string(REQUERIDO).trim().min(1, REQUERIDO).max(max, `Máximo ${max} caracteres`);
const opcional = (max = 120) => z.string().trim().max(max, `Máximo ${max} caracteres`).default("").transform((v) => v || null);
const entero = (min: number, max: number, mensaje: string) =>
  requerido(12)
    .regex(/^\d+$/, "Solo se permiten números enteros")
    .transform(Number)
    .refine((n) => n >= min && n <= max, mensaje);

const diaIso = (d: Date) => d.toISOString().slice(0, 10);
const hace = (anios: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anios);
  return diaIso(d);
};
const esFechaPasada = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && v <= diaIso(new Date());
const FECHA_INVALIDA = "La fecha debe tener formato yyyy-MM-dd y no ser futura";

export const personaSchema = z.object({
  idpersona: requerido(15).regex(/^\d{5,15}$/, "La identificación debe tener entre 5 y 15 dígitos"),
  nom1: requerido(),
  nom2: opcional(60),
  apell1: requerido(),
  apell2: opcional(60),
  direccion: opcional(),
  tele: z.string().trim().regex(/^(\d{7,10})?$/, "El teléfono debe tener entre 7 y 10 dígitos").default("").transform((v) => v || null),
  movil: requerido(10).regex(/^3\d{9}$/, "Debe ser un celular de 10 dígitos que empiece por 3"),
  correo: requerido(120).toLowerCase().email("El correo no es válido"),
  fecha_nac: z
    .string()
    .trim()
    .refine((v) => v === "" || esFechaPasada(v), FECHA_INVALIDA)
    .default("")
    .transform((v) => v || null),
});

// Comprador y Productor son personas con más campos obligatorios y un solo teléfono (el celular de WhatsApp).
export const compradorSchema = personaSchema.omit({ tele: true }).extend({
  direccion: requerido(120),
  fecha_nac: requerido(10).refine(esFechaPasada, FECHA_INVALIDA),
});

export const productorSchema = compradorSchema.extend({
  fecha_nac: requerido(10)
    .refine(esFechaPasada, FECHA_INVALIDA)
    .refine((v) => v <= hace(18), "El productor debe ser mayor de 18 años"),
});

export const perfilSchema = z.object({
  descripc: requerido(40).min(3, "La descripción debe tener al menos 3 caracteres"),
});

export const categoriaSchema = z.object({
  codigotp: requerido(10).toUpperCase().regex(/^[A-Z0-9]{2,10}$/, "De 2 a 10 letras o números, sin espacios"),
  descripcion: requerido(40).min(3, "La descripción debe tener al menos 3 caracteres"),
});

export const productoSchema = z.object({
  codigo: requerido(15).toUpperCase().regex(/^[A-Z0-9-]{3,15}$/, "De 3 a 15 caracteres: letras, números o guion"),
  nombre: requerido(80).min(3, "El nombre debe tener al menos 3 caracteres"),
  codigotp: requerido(10),
  precio_venta: entero(1, 99_999_999, "El precio debe ser mayor que cero"),
  empaque_unidades: entero(1, 100_000, "Las unidades por empaque deben ser un entero mayor que cero"),
  descuento: z
    .string()
    .trim()
    .default("")
    .refine((v) => /^\d*$/.test(v), "Solo se permiten números enteros")
    .transform((v) => (v === "" ? 0 : Number(v)))
    .refine((n) => n <= 100, "El descuento debe estar entre 0 y 100"),
});

export const nombreuSchema = requerido(30)
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,30}$/, "El usuario debe tener 3 a 30 caracteres: letras, números, punto o guion bajo");

export const contrasenaSchema = z
  .string(REQUERIDO)
  .min(1, REQUERIDO)
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(100, "Máximo 100 caracteres");

export const usuarioSchema = z.object({
  nombreu: nombreuSchema,
  idperfil: z.coerce.number("Seleccione un perfil").int("Seleccione un perfil").min(1, "Seleccione un perfil"),
  idpersona: requerido(15),
});

// FormData -> objeto plano de strings (ignora archivos).
export const plano = (fd: FormData) =>
  Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
