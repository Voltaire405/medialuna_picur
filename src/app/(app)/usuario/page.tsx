import { eq } from "drizzle-orm";
import { GestionForm } from "@/components/GestionForm";
import { consultarUsuario, guardarUsuario, inhabilitarUsuario } from "@/actions/usuario";
import { db } from "@/db";
import { perfil, persona, user } from "@/db/schema";
import { permisosDe } from "@/lib/permisos";
import { exigirPagina } from "@/lib/session";
import { filaUsuario } from "@/lib/usuarios";

export default async function UsuarioPage() {
  const u = await exigirPagina("usuario");
  const [usuarios, perfiles, personas] = await Promise.all([
    db
      .select({
        idusuario: user.id,
        nombreu: user.username,
        idpersona: user.idpersona,
        idperfil: user.idperfil,
        perfil: perfil.descripc,
        verificado: user.emailVerified,
        estado: user.estado,
      })
      .from(user)
      .innerJoin(perfil, eq(user.idperfil, perfil.idperfil))
      .orderBy(user.username),
    db.select().from(perfil).where(eq(perfil.estado, 1)).orderBy(perfil.idperfil),
    db.select().from(persona).where(eq(persona.estado, 1)).orderBy(persona.idpersona),
  ]);
  const filas = usuarios.map(filaUsuario);
  const conUsuario = new Set(filas.map((f) => f.idpersona)); // 1 persona = 1 usuario (incluye inhabilitados)
  return (
    <GestionForm
      titulo="Usuario"
      idCampo="idusuario"
      buscarPor="nombre de usuario"
      campos={[
        { name: "idusuario", label: "ID Usuario", bloqueado: "siempre", soloEdicion: true },
        {
          name: "idpersona",
          label: "Persona",
          tipo: "select",
          requerido: true,
          bloqueado: "edicion",
          opciones: personas.map((p) => {
            const conCuenta = conUsuario.has(p.idpersona);
            return {
              value: p.idpersona,
              label: `${p.idpersona} — ${p.nom1} ${p.apell1}${conCuenta ? " (ya tiene usuario)" : ""}`,
              deshabilitada: conCuenta,
            };
          }),
          ayuda: "Solo personas ya registradas sin usuario",
        },
        { name: "nombreu", label: "Usuario", requerido: true, maxLength: 30, minuscula: true },
        { name: "contrasena", label: "Contraseña", tipo: "password", requerido: "creacion", ayuda: "Al modificar, déjela vacía para conservarla" },
        {
          name: "idperfil",
          label: "Perfil",
          tipo: "select",
          requerido: true,
          opciones: perfiles.map((p) => ({ value: String(p.idperfil), label: p.descripc })),
        },
        {
          name: "verificado",
          label: "Correo verificado",
          tipo: "select",
          requerido: true,
          opciones: [
            { value: "0", label: "No" },
            { value: "1", label: "Sí" },
          ],
          ayuda: "Obligatorio para que un productor ingrese. Marcar «Sí» solo si el administrador validó el correo",
        },
      ]}
      columnas={[
        { name: "nombreu", label: "Usuario" },
        { name: "idpersona", label: "Persona" },
        { name: "perfil", label: "Perfil" },
        { name: "verificadoTxt", label: "Verificado" },
      ]}
      filas={filas}
      permisos={permisosDe(u.esAdmin, "usuario")}
      acciones={{ guardar: guardarUsuario, inhabilitar: inhabilitarUsuario, consultar: consultarUsuario }}
    />
  );
}
