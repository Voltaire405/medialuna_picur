import { consultarCategoria, guardarCategoria, inhabilitarCategoria } from "@/actions/categoria";
import { GestionForm } from "@/components/GestionForm";
import { listarCategorias } from "@/lib/categorias";
import { permisosDe } from "@/lib/permisos";
import { exigirPagina } from "@/lib/session";

export default async function CategoriaPage() {
  const u = await exigirPagina("categoria");
  return (
    <GestionForm
      titulo="Gestión Categorías"
      registro="categoría"
      idCampo="codigotp"
      buscarPor="código o descripción"
      campos={[
        { name: "codigotp", label: "Código", requerido: true, bloqueado: "edicion", maxLength: 10, ayuda: "De 2 a 10 letras o números. Ej.: FRU" },
        { name: "descripcion", label: "Descripción", requerido: true, maxLength: 40, ayuda: "Ej.: Frutas, Verduras, Tubérculos, Lácteos, Granos, Huevos" },
      ]}
      columnas={[
        { name: "codigotp", label: "Código" },
        { name: "descripcion", label: "Descripción" },
        { name: "productos", label: "Productos activos" },
      ]}
      filas={await listarCategorias()}
      permisos={permisosDe(u.idperfil, "categoria")}
      acciones={{ guardar: guardarCategoria, inhabilitar: inhabilitarCategoria, consultar: consultarCategoria }}
    />
  );
}
