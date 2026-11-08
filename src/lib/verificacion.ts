import { createHash, randomBytes } from "node:crypto";
import { resolveMx } from "node:dns/promises";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { persona, user, verification } from "@/db/schema";
import { ErrorNegocio } from "./errores";
import { enviarCorreo } from "./mail";
import { PRODUCTOR_PERFIL } from "./permisos";

// ponytail: lista corta de dominios desechables; cambiar por el paquete
// `disposable-email-domains` si se cuelan otros.
const DESECHABLES = new Set([
  "mailinator.com", "yopmail.com", "yopmail.fr", "guerrillamail.com", "sharklasers.com", "10minutemail.com",
  "temp-mail.org", "tempmail.com", "tempmail.net", "trashmail.com", "getnada.com", "maildrop.cc",
  "dispostable.com", "fakeinbox.com", "throwawaymail.com", "mintemail.com", "emailondeck.com", "mohmal.com",
  "tempr.email", "discard.email", "mailnesia.com", "moakt.com", "spamgourmet.com", "mailcatch.com",
]);

// Correo confiable: dominio no desechable y que recibe correo (registro MX).
// Ante fallas de red del DNS deja pasar: no se bloquea el registro por un problema propio.
export async function exigirCorreoConfiable(correo: string) {
  const dominio = correo.split("@")[1]?.toLowerCase() ?? "";
  if (DESECHABLES.has(dominio)) throw new ErrorNegocio("No se aceptan correos temporales o desechables");
  let mx;
  try {
    mx = await resolveMx(dominio);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND" || code === "ENODATA") throw new ErrorNegocio("El dominio del correo no recibe mensajes");
    return;
  }
  // "Null MX" (RFC 7505): el dominio declara que no recibe correo.
  if (!mx.some((r) => r.exchange && r.exchange !== ".")) throw new ErrorNegocio("El dominio del correo no recibe mensajes");
}

export const exigeVerificacion = (u: { idperfil: number; verificado: boolean }) =>
  u.idperfil === PRODUCTOR_PERFIL && !u.verificado;

const hash = (t: string) => createHash("sha256").update(t).digest("hex");
// El token queda atado al usuario y al correo: si el correo cambia, el enlace viejo no sirve.
const clave = (idusuario: string, correo: string) => `correo:${idusuario}:${correo}`;
const VIGENCIA = 24 * 60 * 60_000;

// Envía el enlace de verificación (máx. uno por minuto por usuario).
export async function enviarVerificacion(idusuario: string, correo: string) {
  const identifier = clave(idusuario, correo);
  const [reciente] = await db
    .select()
    .from(verification)
    .where(and(eq(verification.identifier, identifier), gt(verification.createdAt, new Date(Date.now() - 60_000))));
  if (reciente) return;
  const token = randomBytes(24).toString("base64url");
  await db.insert(verification).values({
    id: randomBytes(12).toString("hex"),
    identifier,
    value: hash(token),
    expiresAt: new Date(Date.now() + VIGENCIA),
  });
  const url = `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/verificar?token=${token}`;
  await enviarCorreo(
    correo,
    "Verifique su correo - Medialuna",
    `Para activar su cuenta en Medialuna abra este enlace (vence en 24 horas):\n\n${url}\n\nSi usted no creó esta cuenta, ignore este mensaje.`,
  );
}

// Consume el token: marca el correo como verificado y registra la autorización de datos si faltaba.
export async function confirmarVerificacion(token: string) {
  const [v] = await db
    .select()
    .from(verification)
    .where(and(eq(verification.value, hash(token)), gt(verification.expiresAt, new Date())));
  const [, idusuario, correo] = v?.identifier.split(":") ?? [];
  const [u] = idusuario
    ? await db
        .select({ idpersona: user.idpersona, correo: persona.correo })
        .from(user)
        .innerJoin(persona, eq(user.idpersona, persona.idpersona))
        .where(eq(user.id, idusuario))
    : [];
  if (!u || u.correo !== correo) throw new ErrorNegocio("El enlace no es válido o ya venció. Ingrese de nuevo para recibir otro");

  await db.update(user).set({ emailVerified: true }).where(eq(user.id, idusuario));
  await db
    .update(persona)
    .set({ fecha_autoriza: new Date() })
    .where(and(eq(persona.idpersona, u.idpersona), isNull(persona.fecha_autoriza)));
  // Tabla de tokens de Better Auth (no es perfil/usuario/persona): el token es de un solo uso.
  await db.delete(verification).where(eq(verification.id, v.id));
}
