"use client";

import Link from "next/link";
import { useActionState } from "react";
import { verificarCorreo } from "@/actions/auth";
import { enviar } from "./enviar";
import { Mensaje } from "./Mensaje";

export function VerificarForm({ token }: { token: string }) {
  const [r, accion, pendiente] = useActionState(verificarCorreo, null);
  return (
    <form onSubmit={enviar(accion)} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="flex items-start gap-3 rounded-xl bg-luna/10 p-4 text-sm text-hoja-900">
        <input type="checkbox" name="autoriza" className="mt-0.5 h-4 w-4 accent-hoja-600" />
        <span>Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.</span>
      </label>
      <Mensaje r={r} />
      {r?.ok ? (
        <Link href="/login" className="btn-primario w-full">Ir a ingresar</Link>
      ) : (
        <button className="btn-primario w-full" disabled={pendiente}>{pendiente ? "Verificando…" : "Verificar mi correo"}</button>
      )}
    </form>
  );
}
