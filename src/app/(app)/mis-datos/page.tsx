import { redirect } from "next/navigation";
import { guardarMisDatos } from "@/actions/persona";
import { camposRol } from "@/components/camposRol";
import { GestionForm } from "@/components/GestionForm";
import { rolDe } from "@/lib/permisos";
import { listarRol } from "@/lib/roles";
import { getUsuario } from "@/lib/session";

// El productor o el comprador consulta y modifica sus propios datos, nunca su documento ni su estado.
export default async function MisDatosPage() {
  const u = await getUsuario();
  if (!u) redirect("/login");
  const rol = rolDe(u.idperfil);
  if (!rol) redirect("/");
  return (
    <GestionForm
      titulo="Mis datos"
      registro={rol}
      descripcion="Consulte y actualice sus datos. El documento y el estado solo los cambia el administrador."
      idCampo="idpersona"
      buscarPor=""
      inicial={u.idpersona}
      campos={camposRol(rol)}
      columnas={[
        { name: "idpersona", label: "Documento" },
        { name: "nom1", label: "Nombre" },
        { name: "apell1", label: "Apellido" },
        { name: "movil", label: "Celular" },
        { name: "correo", label: "Correo" },
      ]}
      filas={await listarRol(rol, { idpersona: u.idpersona })}
      permisos={{ crear: false, consultar: false, modificar: true, inhabilitar: false }}
      acciones={{ guardar: guardarMisDatos }}
    />
  );
}
