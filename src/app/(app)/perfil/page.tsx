import { GestionForm } from "@/components/GestionForm";
import { consultarPerfil, guardarPerfil, inhabilitarPerfil } from "@/actions/perfil";
import { db } from "@/db";
import { perfil } from "@/db/schema";
import { filaPerfil, permisosDe } from "@/lib/permisos";
import { exigirPagina } from "@/lib/session";

export default async function PerfilPage() {
  const u = await exigirPagina("perfil");
  const filas = (await db.select().from(perfil).orderBy(perfil.idperfil)).map(filaPerfil);
  return (
    <GestionForm
      titulo="Gestión Perfil"
      registro="perfil"
      idCampo="idperfil"
      buscarPor="ID de perfil"
      campos={[
        { name: "idperfil", label: "ID Perfil", bloqueado: "siempre", soloEdicion: true, ayuda: "Se asigna automáticamente" },
        { name: "descripc", label: "Descripción", requerido: true, maxLength: 40, ayuda: "Ej.: Asociación, Técnico. Un perfil nuevo no tiene acceso a las gestiones: solo consulta el catálogo" },
      ]}
      columnas={[
        { name: "idperfil", label: "ID" },
        { name: "descripc", label: "Descripción" },
        { name: "alcance", label: "Qué puede hacer" },
      ]}
      filas={filas}
      permisos={permisosDe(u.idperfil, "perfil")}
      acciones={{ guardar: guardarPerfil, inhabilitar: inhabilitarPerfil, consultar: consultarPerfil }}
    />
  );
}
