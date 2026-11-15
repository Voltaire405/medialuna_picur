import { consultarProducto, guardarProducto, inhabilitarProducto } from "@/actions/producto";
import { GestionForm } from "@/components/GestionForm";
import { categoriasActivas } from "@/lib/categorias";
import { permisosDe } from "@/lib/permisos";
import { listarProductos, MAX_IMAGEN } from "@/lib/productos";
import { exigirPagina } from "@/lib/session";

// El productor gestiona «Mis productos»; el administrador consulta todos y puede inhabilitarlos.
export default async function ProductoPage() {
  const u = await exigirPagina("producto");
  const [filas, categorias] = await Promise.all([
    listarProductos({ idproductor: u.esAdmin ? undefined : u.idpersona }),
    categoriasActivas(),
  ]);
  return (
    <GestionForm
      titulo={u.esAdmin ? "Gestión Productos" : "Mis productos"}
      registro="producto"
      descripcion={u.esAdmin ? "Consulte los productos de todos los productores e inhabilite los que incumplan las políticas." : undefined}
      idCampo="codigo"
      buscarPor="código o nombre"
      campos={[
        { name: "codigo", label: "Código", requerido: true, bloqueado: "edicion", maxLength: 15, ayuda: "De 3 a 15 letras, números o guion. Ej.: HUE-001" },
        { name: "nombre", label: "Nombre", requerido: true, maxLength: 80 },
        {
          name: "codigotp",
          label: "Categoría",
          tipo: "select",
          requerido: true,
          opciones: categorias.map((c) => ({ value: c.codigotp, label: c.descripcion })),
        },
        { name: "precio_venta", label: "Precio de venta por empaque ($)", requerido: true, maxLength: 8, soloDigitos: true, ayuda: "En pesos, sin puntos ni comas" },
        { name: "empaque_unidades", label: "Unidades por empaque", requerido: true, maxLength: 6, soloDigitos: true, ayuda: "Ej.: 30 para una canasta de 30 huevos" },
        { name: "descuento", label: "Descuento (%)", maxLength: 3, soloDigitos: true, ayuda: "De 0 a 100. Vacío se guarda en 0" },
        {
          name: "imagen",
          label: "Imagen",
          tipo: "file",
          requerido: "creacion",
          accept: "image/jpeg,image/png",
          maxBytes: MAX_IMAGEN,
          ayuda: "JPG o PNG de máximo 2 MB. Al modificar, déjela vacía para conservar la actual",
        },
      ]}
      columnas={[
        { name: "imagen", label: "Imagen", tipo: "imagen" },
        { name: "codigo", label: "Código" },
        { name: "nombre", label: "Nombre" },
        { name: "categoria", label: "Categoría" },
        ...(u.esAdmin ? [{ name: "productor", label: "Productor" }] : []),
        { name: "precio", label: "Precio" },
        { name: "descuento", label: "Dto. %" },
        { name: "precio_final", label: "Precio final" },
      ]}
      filas={filas}
      permisos={permisosDe(u.idperfil, "producto")}
      acciones={{ guardar: guardarProducto, inhabilitar: inhabilitarProducto, consultar: consultarProducto }}
    />
  );
}
