import { eq } from "drizzle-orm";
import { GestionForm, type Campo } from "@/components/GestionForm";
import { consultarPersona, guardarPersona, inhabilitarPersona } from "@/actions/persona";
import { db } from "@/db";
import { persona } from "@/db/schema";
import { permisosDe } from "@/lib/permisos";
import { exigirPagina } from "@/lib/session";

const campos: Campo[] = [
  { name: "idpersona", label: "ID Persona (identificación)", requerido: true, bloqueado: "edicion", maxLength: 15 },
  { name: "nom1", label: "Primer nombre", requerido: true, maxLength: 60 },
  { name: "nom2", label: "Segundo nombre", maxLength: 60 },
  { name: "apell1", label: "Primer apellido", requerido: true, maxLength: 60 },
  { name: "apell2", label: "Segundo apellido", maxLength: 60 },
  { name: "direccion", label: "Dirección (vereda / municipio)", maxLength: 120 },
  { name: "tele", label: "Teléfono", tipo: "tel", maxLength: 10 },
  { name: "movil", label: "Móvil", tipo: "tel", requerido: true, maxLength: 10, ayuda: "10 dígitos, empieza por 3" },
  { name: "correo", label: "Correo electrónico", tipo: "email", requerido: true, maxLength: 120 },
  { name: "fecha_nac", label: "Fecha de nacimiento", tipo: "date" },
];

export default async function PersonaPage() {
  const u = await exigirPagina("persona");
  // Perfiles no administradores solo ven y editan su propia persona.
  const filas = await db.select().from(persona).where(u.esAdmin ? undefined : eq(persona.idpersona, u.idpersona)).orderBy(persona.idpersona);
  return (
    <GestionForm
      titulo="Persona"
      idCampo="idpersona"
      buscarPor="identificación"
      campos={campos}
      columnas={[
        { name: "idpersona", label: "ID" },
        { name: "nom1", label: "Nombre" },
        { name: "apell1", label: "Apellido" },
        { name: "correo", label: "Correo" },
      ]}
      filas={filas}
      inicial={u.esAdmin ? undefined : filas[0]}
      permisos={permisosDe(u.esAdmin, "persona")}
      acciones={{ guardar: guardarPersona, inhabilitar: inhabilitarPersona, consultar: consultarPersona }}
    />
  );
}
