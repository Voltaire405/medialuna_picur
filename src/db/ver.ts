// Imprime lo que hay guardado en una tabla, para evidenciar que cada acción de la app queda en la base.
// Uso: pnpm db:ver <tabla>
import { argv, exit, loadEnvFile } from "node:process";

try {
  loadEnvFile();
} catch {}

// Sin la imagen (binaria) ni el hash de la contraseña, que vive en `cuenta`.
const CONSULTAS: Record<string, string> = {
  perfil: "SELECT idperfil, descripc, estado FROM perfil",
  persona: "SELECT idpersona, nom1, apell1, movil, direccion, fecha_nac, correo, estado FROM persona",
  usuario: "SELECT nombreu, idperfil, idpersona, email_verified AS correo_verificado, estado FROM usuario",
  categoria: "SELECT codigotp, descripcion, estado FROM categoria",
  producto:
    "SELECT codigo, nombre, length(imagen) AS imagen_bytes, precio_venta, empaque_unidades, descuento, codigotp, idproductor, estado FROM producto",
};

async function main() {
  const sql = CONSULTAS[argv[2]];
  if (!sql) throw new Error(`Indique la tabla: ${Object.keys(CONSULTAS).join(", ")}`);
  const { db } = await import("./index");
  const { columns, rows } = await db.$client.execute(sql);
  console.table(rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]]))));
}

main().catch((err) => {
  console.error(err.message);
  exit(1);
});
