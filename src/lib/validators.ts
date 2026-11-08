import { z } from "zod";

const texto = (campo: string, max = 60) =>
  z.string().trim().min(1, `${campo} es obligatorio`).max(max, `${campo} es demasiado largo`);
const opcional = (max = 120) => z.string().trim().max(max).default("").transform((v) => v || null);

export const personaSchema = z.object({
  idpersona: z.string().trim().regex(/^\d{5,15}$/, "La identificación debe tener entre 5 y 15 dígitos"),
  nom1: texto("El primer nombre"),
  nom2: opcional(60),
  apell1: texto("El primer apellido"),
  apell2: opcional(60),
  direccion: opcional(),
  tele: z.string().trim().regex(/^(\d{7,10})?$/, "El teléfono debe tener entre 7 y 10 dígitos").default("").transform((v) => v || null),
  movil: z.string().trim().regex(/^3\d{9}$/, "El móvil debe tener 10 dígitos y empezar por 3"),
  correo: z.string().trim().toLowerCase().email("El correo no es válido").max(120),
  fecha_nac: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= new Date().toISOString().slice(0, 10)), "La fecha debe tener formato yyyy-MM-dd y no ser futura")
    .default("")
    .transform((v) => v || null),
});

export const perfilSchema = z.object({
  descripc: z.string().trim().min(3, "La descripción debe tener al menos 3 caracteres").max(40),
});

export const nombreuSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,30}$/, "El usuario debe tener 3 a 30 caracteres: letras, números, punto o guion bajo");

export const contrasenaSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100);

export const usuarioSchema = z.object({
  nombreu: nombreuSchema,
  idperfil: z.coerce.number().int("Seleccione un perfil"),
  idpersona: z.string().trim().min(1, "Seleccione una persona"),
});

// FormData -> objeto plano de strings (ignora archivos).
export const plano = (fd: FormData) =>
  Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
