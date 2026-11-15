import { consultarComprador, guardarComprador, inhabilitarComprador } from "@/actions/rol";
import { GestionRol } from "@/components/GestionRol";

export default function CompradorPage() {
  return (
    <GestionRol
      rol="comprador"
      titulo="Gestión Compradores"
      acciones={{ guardar: guardarComprador, inhabilitar: inhabilitarComprador, consultar: consultarComprador }}
    />
  );
}
