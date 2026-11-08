import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { perfil, persona, user } from "@/db/schema";
import { getUsuario } from "@/lib/session";

const FLUJO = [
  ["1", "El productor publica", "Producto, cantidad, precio y fecha de cosecha en el catálogo."],
  ["2", "El comprador pide", "Por la web o por WhatsApp: texto, nota de voz o foto."],
  ["3", "El agente recomienda", "Combina precio, cercanía y reputación del vendedor."],
  ["4", "Pedido y entrega", "El productor confirma y ambos acuerdan la entrega."],
  ["5", "Calificación", "El comprador califica y se construye la reputación."],
];

export default async function Panel() {
  const u = (await getUsuario())!;
  const contar = async (t: typeof persona | typeof user | typeof perfil) =>
    (await db.select({ n: count() }).from(t).where(eq(t.estado, 1)))[0].n;
  const [personas, usuarios, perfiles] = await Promise.all([contar(persona), contar(user), contar(perfil)]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-hoja-700 to-hoja-500 p-8 text-white shadow">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-luna/90" />
        <div className="absolute -right-2 -top-14 h-56 w-56 rounded-full bg-hoja-700" />
        <p className="text-sm text-hoja-100">Bienvenido, {u.nombre}</p>
        <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Del campo a tu mesa, sin intermediarios</h1>
        <p className="mt-3 max-w-xl text-hoja-100">
          Medialuna conecta a pequeños productores de Antioquia con compradores locales, con catálogo web y un agente de
          IA en WhatsApp.
        </p>
      </section>

      <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-3">
        {[
          ["Personas activas", personas],
          ["Usuarios activos", usuarios],
          ["Perfiles activos", perfiles],
        ].map(([t, n]) => (
          <div key={t} className="rounded-2xl border-l-4 border-luna bg-white p-5 shadow">
            <p className="text-sm text-tierra">{t}</p>
            <p className="text-4xl font-extrabold text-hoja-700">{n}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-hoja-900">¿Cómo funciona Medialuna?</h2>
        <ol className="grid gap-3 md:grid-cols-5">
          {FLUJO.map(([n, t, d]) => (
            <li key={n} className="rounded-2xl bg-white p-4 shadow">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-luna font-bold text-hoja-900">{n}</span>
              <h3 className="mt-2 font-semibold text-hoja-900">{t}</h3>
              <p className="mt-1 text-sm text-gray-600">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
