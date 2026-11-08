"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cambiarMiContrasena, verificarCorreo } from "@/actions/auth";
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

export function ContrasenaForm() {
  const [r, accion, pendiente] = useActionState(cambiarMiContrasena, null);
  const campo = (name: string, label: string, auto: string) => (
    <div>
      <label htmlFor={name} className="etiqueta">{label} <span className="text-red-600">*</span></label>
      <input id={name} name={name} type="password" required autoComplete={auto} className="campo" />
    </div>
  );
  return (
    <form onSubmit={enviar(accion)} className="space-y-4">
      {campo("actual", "Contraseña actual", "current-password")}
      {campo("nueva", "Nueva contraseña (mín. 8)", "new-password")}
      {campo("confirmar", "Confirmar nueva contraseña", "new-password")}
      <Mensaje r={r} />
      <div className="flex flex-wrap gap-2">
        <button className="btn-primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Cambiar contraseña"}</button>
        <Link href="/" className="btn-suave">Salir</Link>
      </div>
    </form>
  );
}
