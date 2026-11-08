"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registrar } from "@/actions/auth";
import { enviar } from "./enviar";
import { Mensaje } from "./Mensaje";

type Opcion = { value: string; label: string };

export function RegistroForm({ perfiles }: { perfiles: Opcion[] }) {
  const [r, accion, pendiente] = useActionState(registrar, null);
  const f = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
        {props.required && <span className="text-red-600"> *</span>}
      </label>
      <input id={name} name={name} className="campo" {...props} />
    </div>
  );

  return (
    <form onSubmit={enviar(accion)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {f("idpersona", "Identificación", { required: true, inputMode: "numeric", maxLength: 15 })}
        {f("movil", "Móvil", { required: true, inputMode: "tel", maxLength: 10 })}
        {f("nom1", "Primer nombre", { required: true })}
        {f("nom2", "Segundo nombre")}
        {f("apell1", "Primer apellido", { required: true })}
        {f("apell2", "Segundo apellido")}
        {f("correo", "Correo electrónico", { required: true, type: "email" })}
        {f("tele", "Teléfono", { inputMode: "tel", maxLength: 10 })}
        {f("direccion", "Dirección (vereda / municipio)")}
        {f("fecha_nac", "Fecha de nacimiento", { type: "date" })}
      </div>
      <fieldset className="grid gap-4 rounded-xl bg-hoja-50 p-4 sm:grid-cols-3">
        <legend className="px-1 text-sm font-semibold text-hoja-900">Datos de acceso</legend>
        {f("nombreu", "Usuario", { required: true, autoComplete: "username" })}
        {f("contrasena", "Contraseña (mín. 8)", { required: true, type: "password", autoComplete: "new-password" })}
        <div>
          <label htmlFor="idperfil" className="mb-1 block text-sm font-medium">Soy <span className="text-red-600">*</span></label>
          <select id="idperfil" name="idperfil" required className="campo" defaultValue="">
            <option value="" disabled>Seleccione…</option>
            {perfiles.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </fieldset>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="autoriza" className="mt-1" />
        <span>Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.</span>
      </label>
      <Mensaje r={r} />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primario" disabled={pendiente}>{pendiente ? "Registrando…" : "Registrarse"}</button>
        <Link href="/login" className="btn-suave">{r?.ok ? "Ir a ingresar" : "Volver"}</Link>
      </div>
    </form>
  );
}
