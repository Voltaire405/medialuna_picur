import { consultarProductor, guardarProductor, inhabilitarProductor } from "@/actions/rol";
import { GestionRol } from "@/components/GestionRol";

export default function ProductorPage() {
  return (
    <GestionRol
      rol="productor"
      titulo="Gestión Productores"
      acciones={{ guardar: guardarProductor, inhabilitar: inhabilitarProductor, consultar: consultarProductor }}
    />
  );
}
