import { eq } from "drizzle-orm";
import { db } from "@/db";
import { producto } from "@/db/schema";
import { tipoImagen } from "@/lib/productos";
import { getUsuario } from "@/lib/session";

// Sirve la imagen de un producto a cualquier usuario con sesión.
export async function GET(_: Request, { params }: { params: Promise<{ codigo: string }> }) {
  if (!(await getUsuario())) return new Response(null, { status: 401 });
  const { codigo } = await params;
  const [p] = await db.select({ imagen: producto.imagen }).from(producto).where(eq(producto.codigo, codigo));
  if (!p?.imagen) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(p.imagen), {
    headers: {
      "Content-Type": tipoImagen(p.imagen) ?? "application/octet-stream",
      // La URL lleva ?v=<tamaño>: si la imagen cambia, cambia la URL, así que el navegador puede guardarla.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
