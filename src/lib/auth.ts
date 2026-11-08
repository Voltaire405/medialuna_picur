import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";

// Better Auth gestiona sesión y hash de contraseña; el alta de usuarios la hace
// `crearUsuario` (lib/usuarios.ts) con el internalAdapter, por eso `input: false`.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: { enabled: true, autoSignIn: false, minPasswordLength: 8 },
  user: {
    additionalFields: {
      idperfil: { type: "number", required: true, input: false },
      idpersona: { type: "string", required: true, input: false },
      estado: { type: "number", required: true, defaultValue: 1, input: false },
    },
  },
  plugins: [username({ displayUsername: false }), nextCookies()],
});
