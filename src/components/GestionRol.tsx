import { permisosDe, type Rol } from "@/lib/permisos";
import { listarRol } from "@/lib/roles";
import { exigirPagina } from "@/lib/session";
import { camposRol } from "./camposRol";
import { GestionForm } from "./GestionForm";

type Props = {
  rol: Rol;
  titulo: string;
  acciones: React.ComponentProps<typeof GestionForm>["acciones"];
};

// Gestión de Productores y de Compradores: el formulario de Persona adaptado, más los datos de acceso al crear.
export async function GestionRol({ rol, titulo, acciones }: Props) {
  const u = await exigirPagina(rol);
  return (
    <GestionForm
      titulo={titulo}
      registro={rol}
      idCampo="idpersona"
      buscarPor="documento, nombre, apellido o correo"
      campos={[
        ...camposRol(rol),
        { name: "nombreu", label: "Usuario", requerido: true, bloqueado: "edicion", maxLength: 30, minuscula: true, ayuda: "Con él inicia sesión" },
        { name: "contrasena", label: "Contraseña", tipo: "password", requerido: true, soloCreacion: true, ayuda: "Mínimo 8 caracteres. Luego la cambia en «Mi contraseña»" },
      ]}
      columnas={[
        { name: "idpersona", label: "Documento" },
        { name: "nom1", label: "Nombre" },
        { name: "apell1", label: "Apellido" },
        { name: "movil", label: "Celular" },
        { name: "correo", label: "Correo" },
        ...(rol === "productor" ? [{ name: "productos", label: "Productos publicados" }] : []),
      ]}
      filas={await listarRol(rol)}
      permisos={permisosDe(u.idperfil, rol)}
      acciones={acciones}
    />
  );
}
