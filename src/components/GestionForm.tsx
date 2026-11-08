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

function Estado({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${activo ? "bg-hoja-100 text-hoja-700" : "bg-red-100 text-red-700"}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${activo ? "bg-hoja-500" : "bg-red-500"}`} />
      {activo ? "Activo" : "Inhabilitado"}
    </span>
  );
}

export function GestionForm(p: Props) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [selId, setSelId] = useState<string | null>(p.inicial ? String(p.inicial[p.idCampo]) : null);
  const [valores, setValores] = useState<Record<string, string>>(p.inicial ? aValores(p.campos, p.inicial) : vacio(p.campos));
  const [busqueda, setBusqueda] = useState("");
  const [msg, setMsg] = useState<Resultado | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const editando = selId !== null;
  // La fila vigente viene del servidor (se refresca tras cada acción).
  const actual = p.filas.find((f) => String(f[p.idCampo]) === selId);
  const activo = !actual || activa(actual);
  // Registro del sistema (p. ej. perfiles base): solo lectura. El servidor lo valida igual.
  const protegido = actual?.protegido === 1;
  const original = actual ? aValores(p.campos, actual) : null;
  const hayCambios = !original || p.campos.some((c) => valores[c.name] !== original[c.name]);
  const nombre = (f: Fila) => p.columnas.map((c) => f[c.name]).filter(Boolean).slice(0, 2).join(" · ");
  const titulo = p.titulo.toLowerCase();

  const nuevo = () => {
    setSelId(null);
    setValores(vacio(p.campos));
    setMsg(null);
    setConfirmando(false);
  };
  const cargar = (f: Fila) => {
    setSelId(String(f[p.idCampo]));
    setValores(aValores(p.campos, f));
    setMsg(null);
    setConfirmando(false);
  };
  const ejecutar = (fn: () => Promise<Resultado>, despues?: (r: Resultado) => void) =>
    iniciar(async () => {
      const r = await fn();
      setMsg(r);
      setConfirmando(false);
      if (r.ok) {
        despues?.(r);
        router.refresh();
      }
    });

  const guardar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    ejecutar(
      () => p.acciones.guardar(editando ? "modificar" : "crear", fd),
      () => {
        if (!editando) setValores(vacio(p.campos)); // listo para el siguiente registro
      },
    );
  };

  // Sin permiso de crear y sin registro cargado no hay nada que diligenciar.
  const formularioVisible = editando || p.permisos.crear;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-hoja-900">Gestión {p.titulo}</h1>
          <p className="text-sm text-tierra">
            {p.permisos.crear ? `Cree un ${titulo} nuevo o seleccione uno de la tabla para editarlo.` : `Consulte y actualice sus datos.`}
          </p>
        </div>
        <div className="flex gap-2">
          {p.permisos.crear && (
            <button type="button" className="btn-luna" onClick={nuevo} disabled={pendiente}>
              <span aria-hidden="true">＋</span> Crear
            </button>
          )}
          <Link href="/" className="btn-suave">Salir</Link>
        </div>
      </div>

      {p.permisos.consultar && (
        <form
          role="search"
          className="flex flex-wrap items-end gap-2 rounded-2xl bg-white p-4 shadow"
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar(() => p.acciones.consultar(busqueda), (r) => r.fila && cargar(r.fila));
          }}
        >
          <div className="min-w-48 flex-1">
            <label htmlFor="buscar" className="etiqueta">Buscar por {p.buscarPor}</label>
            <input id="buscar" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="campo" />
          </div>
          <button className="btn-suave" disabled={pendiente || !busqueda.trim()}>
            <span aria-hidden="true">🔍</span> Consultar
          </button>
        </form>
      )}

      {formularioVisible && (
        <form
          onSubmit={guardar}
          className={`overflow-hidden rounded-2xl border-t-4 bg-white shadow ${editando ? "border-luna" : "border-hoja-500"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hoja-100 px-5 py-3">
            <p className="text-sm font-semibold text-hoja-900">
              {editando ? (
                <>
                  <span className="text-tierra">Editando</span> {actual ? nombre(actual) : selId}
                </>
              ) : (
                `Nuevo ${titulo}`
              )}
            </p>
            {editando && <Estado activo={activo} />}
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {p.campos
              .filter((c) => !(c.soloEdicion && !editando))
              .map((c) => {
                const bloq = protegido || c.bloqueado === "siempre" || (c.bloqueado === "edicion" && editando);
                const id = `f-${c.name}`;
                const requerido = c.requerido === true || (c.requerido === "creacion" && !editando);
                return (
                  <div key={c.name}>
                    <label htmlFor={id} className="etiqueta">
                      {c.label}
                      {requerido && <span className="text-red-600"> *</span>}
                      {bloq && <span className="ml-1 text-xs font-normal text-gray-500">(no editable)</span>}
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
          </div>

          <div className="space-y-3 border-t border-hoja-100 bg-hoja-50/50 px-5 py-4">
            <Mensaje r={msg} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Una sola acción principal según el modo: Enter siempre hace lo que dice el botón. */}
              <div className="flex flex-wrap items-center gap-2">
                {!editando && p.permisos.crear && (
                  <button type="submit" className="btn-primario" disabled={pendiente}>
                    {pendiente ? "Guardando…" : "Guardar"}
                  </button>
                )}
                {editando && p.permisos.modificar && !protegido && (
                  <button type="submit" className="btn-primario" disabled={pendiente || !hayCambios}>
                    {pendiente ? "Guardando…" : "Modificar"}
                  </button>
                )}
                {editando && p.permisos.crear && (
                  <button type="button" className="btn-suave" onClick={nuevo} disabled={pendiente}>Cancelar</button>
                )}
                {protegido ? (
                  <span className="text-xs text-gray-500">
                    <span aria-hidden="true">🔒</span> Registro del sistema: no se puede modificar ni inhabilitar
                  </span>
                ) : (
                  editando && !hayCambios && <span className="text-xs text-gray-500">Sin cambios por guardar</span>
                )}
              </div>

              {/* Zona de riesgo, separada y con confirmación. */}
              {editando && p.permisos.inhabilitar && actual && !protegido && (
                <div className="flex flex-wrap items-center gap-2">
                  {!activo ? (
                    <button
                      type="button"
                      className="btn-suave"
                      disabled={pendiente}
                      onClick={() => ejecutar(() => p.acciones.inhabilitar(selId!, 1))}
                    >
                      Habilitar
                    </button>
                  ) : confirmando ? (
                    <>
                      <span className="text-sm font-medium text-red-700">¿Inhabilitar {nombre(actual)}?</span>
                      <button
                        type="button"
                        className="btn-peligro"
                        disabled={pendiente}
                        onClick={() => ejecutar(() => p.acciones.inhabilitar(selId!, 0))}
                      >
                        Sí, inhabilitar
                      </button>
                      <button type="button" className="btn-suave" onClick={() => setConfirmando(false)}>No</button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn border border-red-200 bg-white text-red-700 hover:bg-red-50"
                      disabled={pendiente}
                      onClick={() => setConfirmando(true)}
                    >
                      Inhabilitar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {!formularioVisible && <Mensaje r={msg} />}

      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <div className="overflow-x-auto">
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
              {p.filas.map((f) => {
                const sel = String(f[p.idCampo]) === selId;
                return (
                  <tr
                    key={String(f[p.idCampo])}
                    onClick={() => cargar(f)}
                    aria-selected={sel}
                    className={`cursor-pointer border-t border-hoja-100 transition hover:bg-hoja-50 ${sel ? "bg-luna/15 shadow-[inset_4px_0_0_var(--color-luna)]" : ""} ${activa(f) ? "" : "text-gray-400"}`}
                  >
                    {p.columnas.map((c) => (
                      <td key={c.name} className="px-4 py-2.5">{f[c.name]}</td>
                    ))}
                    <td className="px-4 py-2.5"><Estado activo={activa(f)} /></td>
                  </tr>
                );
              })}
              {!p.filas.length && (
                <tr>
                  <td colSpan={p.columnas.length + 1} className="px-4 py-6 text-center text-gray-500">Sin registros</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {p.filas.length > 0 && (
          <p className="border-t border-hoja-100 px-4 py-2 text-xs text-gray-500">Haga clic en una fila para cargarla en el formulario.</p>
        )}
      </div>
    </div>
  );
}
