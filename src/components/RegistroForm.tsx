"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registrar } from "@/actions/auth";
import { ClaveInput } from "./ClaveInput";
import { aMinuscula, enviar, soloDigitos } from "./enviar";
import { Mensaje } from "./Mensaje";

function Seccion({ icono, titulo, children }: { icono: string; titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 flex w-full items-center gap-2 border-b border-hoja-100 pb-2 text-sm font-semibold tracking-wide text-hoja-700 uppercase">
        <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-hoja-100 text-base">{icono}</span>
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

type Opciones = React.InputHTMLAttributes<HTMLInputElement> & { digitos?: boolean };

export function RegistroForm() {
  const [r, accion, pendiente] = useActionState(registrar, null);
  // Aviso inmediato cuando se intenta digitar una letra en un campo numérico.
  const [avisos, setAvisos] = useState<Record<string, string>>({});
  const f = (name: string, label: string, { digitos, ...props }: Opciones = {}) => {
    const error = avisos[name] ?? r?.errores?.[name];
    const comunes = { id: name, name, "aria-invalid": !!error, "aria-describedby": error ? `${name}-error` : undefined, ...props };
    return (
      <div>
        <label htmlFor={name} className="etiqueta">
          {label}
          {props.required && <span className="text-red-600"> *</span>}
        </label>
        {props.type === "password" ? (
          <ClaveInput {...comunes} />
        ) : (
          <input
            className="campo"
            {...comunes}
            inputMode={digitos ? "numeric" : props.inputMode}
            onInput={(e) => {
              props.onInput?.(e);
              if (digitos) setAvisos({ ...avisos, [name]: soloDigitos(e) ? "Solo se permiten números" : "" });
            }}
          />
        )}
        {error && <p id={`${name}-error`} role="alert" className="mt-1 text-xs font-semibold text-red-700">{error}</p>}
      </div>
    );
  };

  return (
    <form noValidate onSubmit={enviar(accion)} className="space-y-8">
      <Seccion icono="🧺" titulo="¿Quién es usted?">
        <div className="grid gap-4 sm:grid-cols-2">
          {f("idpersona", "Identificación", { required: true, digitos: true, maxLength: 15 })}
          {f("fecha_nac", "Fecha de nacimiento", { required: true, type: "date" })}
          {f("nom1", "Primer nombre", { required: true })}
          {f("nom2", "Segundo nombre")}
          {f("apell1", "Primer apellido", { required: true })}
          {f("apell2", "Segundo apellido")}
        </div>
      </Seccion>

      <Seccion icono="📍" titulo="¿Dónde lo encontramos?">
        <div className="grid gap-4 sm:grid-cols-2">
          {f("movil", "Teléfono celular (WhatsApp)", { required: true, digitos: true, maxLength: 10, placeholder: "3001234567" })}
          {f("correo", "Correo electrónico (no temporal)", { required: true, type: "email", placeholder: "nombre@correo.com" })}
          {f("direccion", "Dirección de entrega (vereda / municipio)", { required: true, placeholder: "Vereda La Esperanza, Marinilla" })}
        </div>
      </Seccion>

      <Seccion icono="🔑" titulo="Datos de acceso">
        <div className="grid gap-4 sm:grid-cols-2">
          {f("nombreu", "Usuario", { required: true, autoComplete: "username", autoCapitalize: "none", onInput: aMinuscula })}
          {f("contrasena", "Contraseña (mín. 8)", { required: true, type: "password", autoComplete: "new-password", minLength: 8 })}
        </div>
      </Seccion>

      <label className="flex items-start gap-3 rounded-xl bg-luna/10 p-4 text-sm text-hoja-900">
        <input type="checkbox" name="autoriza" className="mt-0.5 h-4 w-4 accent-hoja-600" />
        <span>Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.</span>
      </label>

      <Mensaje r={r} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/login" className="btn-suave">{r?.ok ? "Ir a ingresar" : "Volver"}</Link>
        <button className="btn-primario sm:min-w-48" disabled={pendiente}>{pendiente ? "Registrando…" : "Crear mi cuenta"}</button>
      </div>
    </form>
  );
}
