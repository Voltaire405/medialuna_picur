import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { categoriasActivas } from "@/lib/categorias";
import { listarProductos } from "@/lib/productos";
import { listarRol } from "@/lib/roles";
import { getUsuario } from "@/lib/session";

type Parametro = string | string[] | undefined;
// Un parámetro repetido en la URL llega como arreglo: se toma el primero.
const texto = (v: Parametro) => (Array.isArray(v) ? v[0] : v) ?? "";

// Catálogo que ve el comprador: solo productos activos, de categorías y productores activos.
export default async function CatalogoPage({ searchParams }: { searchParams: Promise<Record<string, Parametro>> }) {
  if (!(await getUsuario())) redirect("/login");
  const sp = await searchParams;
  const [q, categoria, productor] = [texto(sp.q), texto(sp.categoria), texto(sp.productor)];
  const [productos, categorias, productores] = await Promise.all([
    listarProductos({ q, codigotp: categoria, idproductor: productor, soloPublicados: true }),
    categoriasActivas(),
    listarRol("productor"),
  ]);
  const hayFiltros = !!(q || categoria || productor);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hoja-900">Catálogo de productos</h1>
        <p className="text-sm text-tierra">Productos del campo publicados por sus productores. El precio es por empaque.</p>
      </div>

      <form role="search" className="grid gap-3 rounded-2xl bg-white p-4 shadow sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="q" className="etiqueta">Buscar por nombre</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Ej.: huevos" className="campo" />
        </div>
        <div>
          <label htmlFor="categoria" className="etiqueta">Categoría</label>
          <select id="categoria" name="categoria" defaultValue={categoria} className="campo">
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.codigotp} value={c.codigotp}>{c.descripcion}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="productor" className="etiqueta">Productor</label>
          <select id="productor" name="productor" defaultValue={productor} className="campo">
            <option value="">Todos</option>
            {productores
              .filter((p) => p.estado === 1)
              .map((p) => (
                <option key={p.idpersona} value={p.idpersona}>{p.nom1} {p.apell1}</option>
              ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-primario"><span aria-hidden="true">🔍</span> Consultar</button>
          {hayFiltros && <Link href="/catalogo" className="btn-suave">Ver todos</Link>}
        </div>
      </form>

      <p role="status" className="text-sm text-tierra">
        {productos.length === 1 ? "1 producto encontrado" : `${productos.length} productos encontrados`}
      </p>

      {productos.length === 0 ? (
        <p className="rounded-2xl bg-white p-10 text-center text-gray-500 shadow">
          No hay productos publicados{hayFiltros ? " con ese criterio" : ""}.
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productos.map((p) => (
            <li key={p.codigo} className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="relative aspect-[4/3] bg-hoja-50">
                {p.imagen ? (
                  // Las imágenes se sirven con sesión desde /imagen: el optimizador de Next no podría leerlas.
                  <Image unoptimized src={p.imagen} alt={p.nombre} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
                ) : (
                  <span aria-hidden="true" className="grid h-full place-items-center text-5xl">🧺</span>
                )}
                {p.descuento > 0 && (
                  <span className="absolute left-3 top-3 rounded-full bg-luna px-2.5 py-1 text-xs font-bold text-hoja-900 shadow">−{p.descuento}%</span>
                )}
                <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-hoja-700 shadow">{p.categoria}</span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <h2 className="font-semibold text-hoja-900">{p.nombre}</h2>
                <p className="text-xs text-tierra">
                  <span aria-hidden="true">🌱</span> {p.productor} · Empaque de {p.empaque_unidades} {p.empaque_unidades === 1 ? "unidad" : "unidades"}
                </p>
                <p className="mt-auto pt-3">
                  {p.descuento > 0 && <span className="mr-2 text-sm text-gray-400 line-through">{p.precio}</span>}
                  <span className="text-xl font-extrabold text-hoja-700">{p.precio_final}</span>
                </p>
                <p className="text-[11px] text-gray-400">Código {p.codigo}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
