"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { Fila, Resultado } from "@/lib/errores";
import { Mensaje } from "./Mensaje";

export type Campo = {
  name: string;
  label: string;
  tipo?: "text" | "email" | "date" | "password" | "tel" | "select";
  requerido?: boolean | "creacion"; // "creacion": solo obligatorio al crear (p. ej. contraseña)
  opciones?: { value: string; label: string; deshabilitada?: boolean }[];
  bloqueado?: "edicion" | "siempre"; // "edicion": solo editable al crear (llave)
  soloEdicion?: boolean; // se muestra únicamente con un registro cargado
  ayuda?: string;
  maxLength?: number;
};

type Props = {
  titulo: string;
  campos: Campo[];
  columnas: { name: string; label: string }[];
  filas: Fila[];
  idCampo: string; // llave visible de la fila
  buscarPor: string;
  permisos: { crear: boolean; consultar: boolean; modificar: boolean; inhabilitar: boolean };
  acciones: {
    guardar: (modo: "crear" | "modificar", fd: FormData) => Promise<Resultado>;
    inhabilitar: (id: string, estado: 0 | 1) => Promise<Resultado>;
    consultar: (q: string) => Promise<Resultado>;
  };
  inicial?: Fila; // fila preseleccionada (p. ej. la propia persona)
};

const activa = (f: Fila) => f.estado === 1;
const vacio = (campos: Campo[]) => Object.fromEntries(campos.map((c) => [c.name, ""]));
const aValores = (campos: Campo[], f: Fila) =>
  Object.fromEntries(campos.map((c) => [c.name, f[c.name] == null ? "" : String(f[c.name])]));

export function GestionForm(p: Props) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [selId, setSelId] = useState<string | null>(p.inicial ? String(p.inicial[p.idCampo]) : null);
  const [valores, setValores] = useState<Record<string, string>>(p.inicial ? aValores(p.campos, p.inicial) : vacio(p.campos));
  const [busqueda, setBusqueda] = useState("");
  const [msg, setMsg] = useState<Resultado | null>(null);

  const editando = selId !== null;
  // La fila vigente viene del servidor (se refresca tras cada acción).
  const actual = p.filas.find((f) => String(f[p.idCampo]) === selId);
  const activo = !actual || activa(actual);

  const limpiar = () => {
    setSelId(null);
    setValores(vacio(p.campos));
  };
  const nuevo = () => {
    limpiar();
    setMsg(null);
  };
  const cargar = (f: Fila) => {
    setSelId(String(f[p.idCampo]));
    setValores(aValores(p.campos, f));
    setMsg(null);
  };
  const ejecutar = (fn: () => Promise<Resultado>, despues?: (r: Resultado) => void) =>
    iniciar(async () => {
      const r = await fn();
      setMsg(r);
      if (r.ok) {
        despues?.(r);
        router.refresh();
      }
    });

  const guardar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    ejecutar(() => p.acciones.guardar(editando ? "modificar" : "crear", fd), () => !editando && limpiar());
  };

  const mostrarEstado = (f: Fila) => (activa(f) ? "Activo" : "Inhabilitado");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-hoja-900">Gestión {p.titulo}</h1>
        <Link href="/" className="btn-suave">Salir</Link>
      </div>

      <form onSubmit={guardar} className="space-y-4 rounded-2xl bg-white p-5 shadow">
        <div className="grid gap-4 sm:grid-cols-2">
          {p.campos
            .filter((c) => !(c.soloEdicion && !editando))
            .map((c) => {
              const bloq = c.bloqueado === "siempre" || (c.bloqueado === "edicion" && editando);
              const id = `f-${c.name}`;
              const requerido = c.requerido === true || (c.requerido === "creacion" && !editando);
              return (
                <div key={c.name}>
                  <label htmlFor={id} className="mb-1 block text-sm font-medium">
                    {c.label}
                    {requerido && <span className="text-red-600"> *</span>}
                  </label>
                  {c.tipo === "select" ? (
                    <>
                      <select
                        id={id}
                        name={bloq ? undefined : c.name}
                        disabled={bloq}
                        required={requerido}
                        value={valores[c.name]}
                        onChange={(e) => setValores({ ...valores, [c.name]: e.target.value })}
                        className="campo"
                      >
                        <option value="" disabled>Seleccione…</option>
                        {c.opciones?.map((o) => (
                          <option key={o.value} value={o.value} disabled={o.deshabilitada}>{o.label}</option>
                        ))}
                      </select>
                      {bloq && <input type="hidden" name={c.name} value={valores[c.name]} />}
                    </>
                  ) : (
                    <input
                      id={id}
                      name={c.name}
                      type={c.tipo ?? "text"}
                      readOnly={bloq}
                      required={requerido}
                      maxLength={c.maxLength}
                      autoComplete={c.tipo === "password" ? "new-password" : "off"}
                      value={valores[c.name]}
                      onChange={(e) => setValores({ ...valores, [c.name]: e.target.value })}
                      className="campo"
                    />
                  )}
                  {c.ayuda && <p className="mt-1 text-xs text-gray-500">{c.ayuda}</p>}
                </div>
              );
            })}
          <div>
            <span className="mb-1 block text-sm font-medium">Estado</span>
            <span
              className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${activo ? "bg-hoja-100 text-hoja-700" : "bg-red-100 text-red-700"}`}
            >
              {actual ? mostrarEstado(actual) : "Activo"}
            </span>
          </div>
        </div>

        <Mensaje r={msg} />

        <div className="flex flex-wrap gap-2">
          {p.permisos.crear && (
            <button type="button" className="btn-suave" onClick={nuevo} disabled={pendiente}>Crear</button>
          )}
          {p.permisos.crear && (
            <button type="submit" className="btn-primario" disabled={pendiente || editando}>Guardar</button>
          )}
          {p.permisos.modificar && (
            <button type="submit" className="btn-luna" disabled={pendiente || !editando}>Modificar</button>
          )}
          {p.permisos.inhabilitar && (
            <button
              type="button"
              className={activo ? "btn-peligro" : "btn-primario"}
              disabled={pendiente || !editando}
              onClick={() =>
                ejecutar(
                  () => p.acciones.inhabilitar(selId!, activo ? 0 : 1),
                )
              }
            >
              {activo ? "Inhabilitar" : "Habilitar"}
            </button>
          )}
        </div>
      </form>

      {p.permisos.consultar && (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-white p-4 shadow">
          <div className="min-w-48 flex-1">
            <label htmlFor="buscar" className="mb-1 block text-sm font-medium">Buscar por {p.buscarPor}</label>
            <input id="buscar" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="campo" />
          </div>
          <button
            type="button"
            className="btn-suave"
            disabled={pendiente}
            onClick={() =>
              ejecutar(() => p.acciones.consultar(busqueda), (r) => r.fila && cargar(r.fila))
            }
          >
            Consultar
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-hoja-700 text-white">
            <tr>
              {p.columnas.map((c) => (
                <th key={c.name} className="px-4 py-3 font-semibold">{c.label}</th>
              ))}
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {p.filas.map((f) => (
              <tr
                key={String(f[p.idCampo])}
                onClick={() => cargar(f)}
                className={`cursor-pointer border-t border-hoja-100 hover:bg-hoja-50 ${activa(f) ? "" : "text-gray-400 line-through"} ${String(f[p.idCampo]) === selId ? "bg-hoja-100" : ""}`}
              >
                {p.columnas.map((c) => (
                  <td key={c.name} className="px-4 py-2">{f[c.name]}</td>
                ))}
                <td className="px-4 py-2 no-underline">{mostrarEstado(f)}</td>
              </tr>
            ))}
            {!p.filas.length && (
              <tr>
                <td colSpan={p.columnas.length + 1} className="px-4 py-6 text-center text-gray-500">Sin registros</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
