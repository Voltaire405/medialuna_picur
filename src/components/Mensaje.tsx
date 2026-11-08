import type { Resultado } from "@/lib/errores";

export function Mensaje({ r }: { r: Resultado | null }) {
  if (!r) return null;
  return (
    <p
      role={r.ok ? "status" : "alert"}
      className={`rounded-lg px-3 py-2 text-sm ${r.ok ? "bg-hoja-100 text-hoja-900" : "bg-red-100 text-red-800"}`}
    >
      {r.mensaje}
    </p>
  );
}
