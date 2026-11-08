// Datos mínimos para poder ingresar: perfiles base y el administrador.
// Idempotente. Uso: pnpm db:seed
try {
  process.loadEnvFile();
} catch {}

async function main() {
  const { db } = await import("./index");
  const { perfil, persona, user } = await import("./schema");
  const { crearUsuario } = await import("@/lib/usuarios");
  const { eq } = await import("drizzle-orm");
  const e = process.env;
  // En una base remota (Turso) no se aceptan las credenciales de ejemplo: son públicas en el repo.
  if (e.TURSO_DATABASE_URL) {
    if (!e.SEED_ADMIN_PASSWORD || e.SEED_ADMIN_PASSWORD === "Admin12345")
      throw new Error("Defina SEED_ADMIN_PASSWORD (distinta de la de ejemplo) para sembrar una base remota");
    if (!e.SEED_ADMIN_EMAIL || e.SEED_ADMIN_EMAIL === "admin@medialuna.local")
      throw new Error("Defina SEED_ADMIN_EMAIL con un correo real para sembrar una base remota");
  }

  // El id 1 debe ser Administrador (ADMIN_PERFIL en lib/permisos.ts).
  await db
    .insert(perfil)
    .values([
      { idperfil: 1, descripc: "Administrador" },
      { idperfil: 2, descripc: "Productor" },
      { idperfil: 3, descripc: "Comprador" },
    ])
    .onConflictDoNothing();

  const idpersona = e.SEED_ADMIN_ID ?? "1000000001";
  await db
    .insert(persona)
    .values({
      idpersona,
      nom1: "Administrador",
      apell1: "Medialuna",
      movil: "3000000000",
      // Login y recuperación comparan en minúsculas.
      correo: (e.SEED_ADMIN_EMAIL ?? "admin@medialuna.local").trim().toLowerCase(),
    })
    .onConflictDoNothing();

  const nombreu = (e.SEED_ADMIN_USER ?? "admin").trim().toLowerCase();
  const [existe] = await db.select().from(user).where(eq(user.username, nombreu));
  if (!existe)
    await crearUsuario({ nombreu, contrasena: e.SEED_ADMIN_PASSWORD ?? "Admin12345", idperfil: 1, idpersona });
  console.log(`Seed listo. Administrador: ${nombreu}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
