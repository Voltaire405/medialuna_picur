// Datos de demostración para sustentar el Parcial II: un productor verificado con productos, un comprador y categorías.
// Idempotente; requiere haber corrido antes pnpm db:setup. Uso: pnpm db:demo
import { readFileSync } from "node:fs";
import { join } from "node:path";

try {
  process.loadEnvFile();
} catch {}

const PRODUCTOR = { idpersona: "1000000002", nom1: "Rosa", apell1: "Giraldo", movil: "3101234567", direccion: "Vereda El Chagualo, Marinilla", fecha_nac: "1980-05-20", correo: "rosa@medialuna.local" };
const COMPRADOR = { idpersona: "1000000003", nom1: "Carlos", apell1: "Pérez", movil: "3209876543", direccion: "Calle 49 # 50-21, Rionegro", fecha_nac: "1992-11-03", correo: "carlos@medialuna.local" };

// Verduras queda sin productos: sirve para mostrar una categoría que sí se puede inhabilitar.
const CATEGORIAS = [
  { codigotp: "FRU", descripcion: "Frutas" },
  { codigotp: "HUE", descripcion: "Huevos" },
  { codigotp: "LAC", descripcion: "Lácteos" },
  { codigotp: "VER", descripcion: "Verduras" },
];

const PRODUCTOS = [
  { codigo: "HUE-001", nombre: "Huevos criollos AA", codigotp: "HUE", precio_venta: 18000, empaque_unidades: 30, descuento: 10, archivo: "huevos.jpg" },
  { codigo: "LAC-001", nombre: "Queso campesino", codigotp: "LAC", precio_venta: 14000, empaque_unidades: 1, descuento: 0, archivo: "queso.jpg" },
  { codigo: "FRU-001", nombre: "Aguacate Hass", codigotp: "FRU", precio_venta: 12000, empaque_unidades: 6, descuento: 15, archivo: "aguacate.jpg" },
];

async function main() {
  const { db } = await import("./index");
  const { categoria, persona, producto, user } = await import("./schema");
  const { COMPRADOR_PERFIL, PRODUCTOR_PERFIL } = await import("@/lib/permisos");
  const { crearUsuario } = await import("@/lib/usuarios");
  const { eq } = await import("drizzle-orm");
  const e = process.env;
  // En una base remota (Turso) no se acepta la contraseña de ejemplo: es pública en el repo.
  if (e.TURSO_DATABASE_URL && (!e.SEED_DEMO_PASSWORD || e.SEED_DEMO_PASSWORD === "Demo12345"))
    throw new Error("Defina SEED_DEMO_PASSWORD (distinta de la de ejemplo) para cargar la demostración en una base remota");
  const contrasena = e.SEED_DEMO_PASSWORD ?? "Demo12345";

  const cuenta = async (p: typeof PRODUCTOR, nombreu: string, idperfil: number) => {
    await db.insert(persona).values(p).onConflictDoNothing();
    const [existe] = await db.select().from(user).where(eq(user.username, nombreu));
    if (!existe) await crearUsuario({ nombreu, contrasena, idperfil, idpersona: p.idpersona });
    // El productor no ingresa sin correo verificado, y estos correos de ejemplo no reciben el enlace.
    await db.update(user).set({ emailVerified: true }).where(eq(user.username, nombreu));
  };
  await cuenta(PRODUCTOR, "rosa", PRODUCTOR_PERFIL);
  await cuenta(COMPRADOR, "carlos", COMPRADOR_PERFIL);

  await db.insert(categoria).values(CATEGORIAS).onConflictDoNothing();
  await db
    .insert(producto)
    .values(
      PRODUCTOS.map(({ archivo, ...p }) => ({
        ...p,
        imagen: readFileSync(join("src/db/demo", archivo)),
        idproductor: PRODUCTOR.idpersona,
      })),
    )
    .onConflictDoNothing();

  console.log("Demostración lista. Productor: rosa · Comprador: carlos");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
