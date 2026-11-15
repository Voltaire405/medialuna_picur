import type { Campo } from "./GestionForm";

// El formulario de Persona adaptado a productores y compradores: un solo teléfono (el celular de WhatsApp)
// y dirección, fecha de nacimiento y correo obligatorios. Lo comparten las gestiones del administrador y «Mis datos».
export const camposRol = (rol: "productor" | "comprador"): Campo[] => [
  { name: "idpersona", label: "Documento", requerido: true, bloqueado: "edicion", maxLength: 15, soloDigitos: true },
  {
    name: "fecha_nac",
    label: "Fecha de nacimiento",
    tipo: "date",
    requerido: true,
    ayuda: rol === "productor" ? "Debe ser mayor de 18 años" : undefined,
  },
  { name: "nom1", label: "Primer nombre", requerido: true, maxLength: 60 },
  { name: "nom2", label: "Segundo nombre", maxLength: 60 },
  { name: "apell1", label: "Primer apellido", requerido: true, maxLength: 60 },
  { name: "apell2", label: "Segundo apellido", maxLength: 60 },
  {
    name: "movil",
    label: "Teléfono celular (WhatsApp)",
    tipo: "tel",
    requerido: true,
    maxLength: 10,
    soloDigitos: true,
    ayuda: rol === "productor" ? "10 dígitos, empieza por 3. Allí recibirá los pedidos" : "10 dígitos, empieza por 3. Allí recibirá las confirmaciones",
  },
  {
    name: "direccion",
    label: rol === "productor" ? "Dirección (vereda / municipio)" : "Dirección de entrega (vereda / municipio)",
    requerido: true,
    maxLength: 120,
  },
  {
    name: "correo",
    label: "Correo electrónico",
    tipo: "email",
    requerido: true,
    maxLength: 120,
    ayuda: "Es su medio de recuperación de acceso; si cambia, debe verificarse de nuevo",
  },
];
