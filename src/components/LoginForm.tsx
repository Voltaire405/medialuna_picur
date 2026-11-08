"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ingresar, recuperar } from "@/actions/auth";
import { enviar } from "./enviar";
import { Mensaje } from "./Mensaje";

export function LoginForm() {
  const [recuperando, setRecuperando] = useState(false);
  const [rLogin, accionLogin, pendLogin] = useActionState(ingresar, null);
  const [rRec, accionRec, pendRec] = useActionState(recuperar, null);

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white/95 p-7 shadow-xl backdrop-blur">
      <h2 className="mb-5 text-center text-xl font-bold text-hoja-900">
        {recuperando ? "RECUPERAR ACCESO" : "INICIAR SESIÓN"}
      </h2>

      {!recuperando ? (
        <form onSubmit={enviar(accionLogin)} className="space-y-4">
          <div>
            <label htmlFor="nombreu" className="etiqueta">Usuario</label>
            <input id="nombreu" name="nombreu" autoComplete="username" className="campo" />
          </div>
          <div>
            <label htmlFor="contrasena" className="etiqueta">Contraseña</label>
            <input id="contrasena" name="contrasena" type="password" autoComplete="current-password" className="campo" />
          </div>
          <Mensaje r={rLogin} />
          <button className="btn-primario w-full" disabled={pendLogin}>{pendLogin ? "Ingresando…" : "Ingresar"}</button>
          <div className="flex items-center justify-between gap-2">
            <button type="reset" className="btn-suave">Cancelar</button>
            <Link href="/registro" className="btn-luna">Registrarse</Link>
          </div>
          <button type="button" onClick={() => setRecuperando(true)} className="w-full text-center text-sm text-hoja-700 underline">
            ¿Olvidó su usuario o contraseña?
          </button>
        </form>
      ) : (
        <form onSubmit={enviar(accionRec)} className="space-y-4">
          <div>
            <label htmlFor="identificador" className="etiqueta">Identificación o correo electrónico</label>
            <input id="identificador" name="identificador" className="campo" />
          </div>
          <Mensaje r={rRec} />
          <button className="btn-primario w-full" disabled={pendRec}>{pendRec ? "Enviando…" : "Enviar usuario y contraseña"}</button>
          <button type="button" onClick={() => setRecuperando(false)} className="w-full text-center text-sm text-hoja-700 underline">
            Volver a iniciar sesión
          </button>
        </form>
      )}
    </div>
  );
}
