"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { Fila, Resultado } from "@/lib/errores";
import { ClaveInput } from "./ClaveInput";
import { aMinuscula } from "./enviar";
import { Mensaje } from "./Mensaje";

export type Campo = {
  name: string;
  label: string;
  tipo?: "text" | "email" | "date" | "password" | "tel" | "select" | "file";
  requerido?: boolean | "creacion"; // "creacion": solo obligatorio al crear (p. ej. contraseña)
  opciones?: { value: string; label: string; deshabilitada?: boolean }[];
  bloqueado?: "edicion" | "siempre"; // "edicion": solo editable al crear (llave)
  soloEdicion?: boolean; // se muestra únicamente con un registro cargado
  soloCreacion?: boolean; // se muestra únicamente al crear
  ayuda?: string;
  maxLength?: number;
  minuscula?: boolean; // se pasa a minúsculas mientras se escribe (p. ej. usuario)
  soloDigitos?: boolean; // no deja digitar letras (cédula, teléfono, precio)
  accept?: string; // tipo "file": tipos MIME admitidos, separados por coma
  maxBytes?: number; // tipo "file": tamaño máximo
};

type Props = {
  titulo: string;
  registro: string; // nombre del registro en singular y minúscula: «Nuevo registro de categoría»
  descripcion?: string;
  campos: Campo[];
  columnas: { name: string; label: string; tipo?: "imagen" }[];
  filas: Fila[];
  idCampo: string; // llave visible de la fila
  buscarPor: string;
  inicial?: string; // llave del registro que se abre al entrar (p. ej. «Mis datos»)
  permisos: { crear: boolean; consultar: boolean; modificar: boolean; inhabilitar: boolean };
  acciones: {
    guardar: (modo: "crear" | "modificar", fd: FormData) => Promise<Resultado>;
    inhabilitar?: (id: string, estado: 0 | 1) => Promise<Resultado>;
    consultar?: (q: string) => Promise<Resultado>;
  };
};

const activa = (f: Fila) => f.estado === 1;
const sin = (o: Record<string, string>, llave: string) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== llave));
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

// Las imágenes se sirven con sesión desde /imagen: el optimizador de Next no podría leerlas.
function Miniatura({ src, alt, className }: { src: string; alt: string; className: string }) {
  return <Image unoptimized src={src} alt={alt} width={96} height={96} className={`rounded-lg object-cover ${className}`} />;
}

export function GestionForm(p: Props) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const id = (f: Fila) => String(f[p.idCampo]);
  const filaInicial = p.filas.find((f) => id(f) === p.inicial);
  const [selId, setSelId] = useState<string | null>(filaInicial ? id(filaInicial) : null);
  const [valores, setValores] = useState<Record<string, string>>(filaInicial ? aValores(p.campos, filaInicial) : vacio(p.campos));
  const [busqueda, setBusqueda] = useState("");
  const [encontrados, setEncontrados] = useState<string[] | null>(null);
  const [msg, setMsg] = useState<Resultado | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState(false);
  // Los campos de archivo no son controlados: se anota el nombre elegido y cambiar la llave los vacía.
  // La llave va en todo el bloque de campos para que también se olvide el :user-invalid del intento anterior.
  const [archivos, setArchivos] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);

  const editando = selId !== null;
  // La fila vigente viene del servidor (se refresca tras cada acción).
  const actual = p.filas.find((f) => id(f) === selId);
  const activo = !actual || activa(actual);
  // Registro del sistema (p. ej. perfiles base): solo lectura. El servidor lo valida igual.
  const protegido = actual?.protegido === 1;
  const soloLectura = protegido || (editando && !p.permisos.modificar);
  const original = actual ? aValores(p.campos, actual) : null;
  const hayCambios =
    !original || Object.keys(archivos).length > 0 || p.campos.some((c) => c.tipo !== "file" && valores[c.name] !== original[c.name]);
  const nombre = (f: Fila) => p.columnas.filter((c) => !c.tipo).map((c) => f[c.name]).filter(Boolean).slice(0, 2).join(" · ");
  const visibles = encontrados ? p.filas.filter((f) => encontrados.includes(id(f))) : p.filas;

  const soltarArchivos = () => {
    setArchivos({});
    setVersion((v) => v + 1);
  };
  const seleccionar = (f: Fila | null) => {
    setSelId(f ? id(f) : null);
    setValores(f ? aValores(p.campos, f) : vacio(p.campos));
    setErrores({});
    setConfirmando(false);
    soltarArchivos();
  };
  const abrir = (f: Fila | null) => {
    seleccionar(f);
    setMsg(null);
  };
  const avisar = (name: string, aviso?: string) => setErrores((e) => (aviso ? { ...e, [name]: aviso } : sin(e, name)));
  const cambiar = (name: string, valor: string, aviso?: string) => {
    setValores((v) => ({ ...v, [name]: valor }));
    avisar(name, aviso);
  };

  const ejecutar = (fn: () => Promise<Resultado>, despues?: (r: Resultado) => void) =>
    iniciar(async () => {
      let r: Resultado;
      try {
        r = await fn();
      } catch {
        // La petición no llegó a ejecutarse (red caída o cuerpo mayor al límite del servidor).
        r = { ok: false, mensaje: "No se pudo completar la acción. Revise su conexión e intente de nuevo" };
      }
      setMsg(r);
      setErrores(r.errores ?? {});
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
        if (!editando) seleccionar(null); // listo para el siguiente registro
        else soltarArchivos();
      },
    );
  };

  const consultar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const accion = p.acciones.consultar;
    if (!accion) return;
    ejecutar(
      () => accion(busqueda),
      (r) => {
        const filas = r.filas ?? (r.fila ? [r.fila] : []);
        if (r.filas) setEncontrados(filas.map(id));
        if (filas.length === 1) seleccionar(filas[0]);
      },
    );
  };

  const elegirArchivo = (c: Campo, input: HTMLInputElement) => {
    const archivo = input.files?.[0];
    const aviso = !archivo
      ? undefined
      : c.accept && !c.accept.split(",").includes(archivo.type)
        ? "La imagen debe ser JPG o PNG"
        : c.maxBytes && archivo.size > c.maxBytes
          ? `La imagen no puede superar ${c.maxBytes / 1024 / 1024} MB`
          : undefined;
    // Se rechaza antes de enviar: un archivo mayor al límite del servidor ni siquiera llegaría a validarse allá.
    if (aviso) input.value = "";
    setArchivos((a) => (archivo && !aviso ? { ...a, [c.name]: archivo.name } : sin(a, c.name)));
    avisar(c.name, aviso);
  };

  // Sin permiso de crear y sin registro cargado no hay nada que diligenciar.
  const formularioVisible = editando || p.permisos.crear;
  const descripcion =
    p.descripcion ??
    (p.permisos.crear
      ? "Use «Crear» para un registro nuevo o haga clic en una fila de la tabla para modificarla o inhabilitarla."
      : "Haga clic en una fila de la tabla para ver su detalle.");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-hoja-900">{p.titulo}</h1>
          <p className="text-sm text-tierra">{descripcion}</p>
        </div>
        <div className="flex gap-2">
          {p.permisos.crear && (
            <button type="button" className="btn-luna" onClick={() => abrir(null)} disabled={pendiente}>
              <span aria-hidden="true">＋</span> Crear
            </button>
          )}
          <Link href="/" className="btn-suave">Salir</Link>
        </div>
      </div>

      {p.permisos.consultar && p.acciones.consultar && (
        <form role="search" className="flex flex-wrap items-end gap-2 rounded-2xl bg-white p-4 shadow" onSubmit={consultar}>
          <div className="min-w-48 flex-1">
            <label htmlFor="buscar" className="etiqueta">Buscar por {p.buscarPor}</label>
            <input id="buscar" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="campo" />
          </div>
          <button className="btn-suave" disabled={pendiente || !busqueda.trim()}>
            <span aria-hidden="true">🔍</span> Consultar
          </button>
          {encontrados && (
            <button
              type="button"
              className="btn-suave"
              disabled={pendiente}
              onClick={() => {
                setEncontrados(null);
                setBusqueda("");
                setMsg(null);
              }}
            >
              Ver todos
            </button>
          )}
        </form>
      )}

      {formularioVisible && (
        <form
          noValidate
          onSubmit={guardar}
          className={`overflow-hidden rounded-2xl border-t-4 bg-white shadow ${editando ? "border-luna" : "border-hoja-500"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hoja-100 px-5 py-3">
            <p className="text-sm font-semibold text-hoja-900">
              {editando ? (
                <>
                  <span className="text-tierra">{soloLectura ? "Detalle de" : "Editando"}</span> {actual ? nombre(actual) : selId}
                </>
              ) : (
                `Nuevo registro de ${p.registro}`
              )}
            </p>
            {editando && <Estado activo={activo} />}
          </div>

          <div key={version} className="grid gap-4 p-5 sm:grid-cols-2">
            {p.campos
              .filter((c) => !(c.soloEdicion && !editando) && !(c.soloCreacion && editando))
              .map((c) => {
                const bloq = soloLectura || c.bloqueado === "siempre" || (c.bloqueado === "edicion" && editando);
                const idCampo = `f-${c.name}`;
                const requerido = c.requerido === true || (c.requerido === "creacion" && !editando);
                const error = errores[c.name];
                const comunes = {
                  id: idCampo,
                  required: requerido,
                  "aria-invalid": !!error,
                  "aria-describedby": error ? `${idCampo}-error` : undefined,
                };
                return (
                  <div key={c.name}>
                    <label htmlFor={idCampo} className="etiqueta">
                      {c.label}
                      {requerido && <span className="text-red-600"> *</span>}
                      {bloq && <span className="ml-1 text-xs font-normal text-gray-500">(no editable)</span>}
                    </label>
                    {c.tipo === "select" ? (
                      <>
                        <select
                          {...comunes}
                          name={bloq ? undefined : c.name}
                          disabled={bloq}
                          value={valores[c.name]}
                          onChange={(e) => cambiar(c.name, e.target.value)}
                          className="campo"
                        >
                          <option value="" disabled>Seleccione…</option>
                          {c.opciones?.map((o) => (
                            <option key={o.value} value={o.value} disabled={o.deshabilitada}>{o.label}</option>
                          ))}
                        </select>
                        {bloq && <input type="hidden" name={c.name} value={valores[c.name]} />}
                      </>
                    ) : c.tipo === "password" ? (
                      <ClaveInput
                        {...comunes}
                        name={c.name}
                        readOnly={bloq}
                        maxLength={c.maxLength}
                        autoComplete="new-password"
                        value={valores[c.name]}
                        onChange={(e) => cambiar(c.name, e.target.value)}
                      />
                    ) : c.tipo === "file" ? (
                      <div className="flex items-center gap-3">
                        {actual?.[c.name] && <Miniatura src={String(actual[c.name])} alt="Imagen actual" className="h-14 w-14 shrink-0" />}
                        {!bloq && (
                          <input
                            {...comunes}
                            name={c.name}
                            type="file"
                            accept={c.accept}
                            onChange={(e) => elegirArchivo(c, e.currentTarget)}
                            className="campo file:mr-3 file:rounded-lg file:border-0 file:bg-hoja-100 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-hoja-900"
                          />
                        )}
                      </div>
                    ) : (
                      <input
                        {...comunes}
                        name={c.name}
                        type={c.tipo ?? "text"}
                        inputMode={c.soloDigitos ? "numeric" : undefined}
                        readOnly={bloq}
                        maxLength={c.maxLength}
                        autoComplete="off"
                        autoCapitalize={c.minuscula ? "none" : undefined}
                        value={valores[c.name]}
                        onChange={(e) => {
                          if (c.minuscula) aMinuscula(e);
                          const valor = e.target.value;
                          const digitos = valor.replace(/\D/g, "");
                          if (c.soloDigitos && digitos !== valor) cambiar(c.name, digitos, "Solo se permiten números");
                          else cambiar(c.name, valor);
                        }}
                        className="campo"
                      />
                    )}
                    {error ? (
                      <p id={`${idCampo}-error`} role="alert" className="mt-1 text-xs font-semibold text-red-700">{error}</p>
                    ) : (
                      c.ayuda && <p className="mt-1 text-xs text-gray-500">{c.ayuda}</p>
                    )}
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
                {editando && !soloLectura && (
                  <button type="submit" className="btn-primario" disabled={pendiente || !hayCambios}>
                    {pendiente ? "Guardando…" : "Modificar"}
                  </button>
                )}
                {editando && !p.inicial && (
                  <button type="button" className="btn-suave" onClick={() => abrir(null)} disabled={pendiente}>
                    {p.permisos.crear ? "Cancelar" : "Cerrar"}
                  </button>
                )}
                {protegido ? (
                  <span className="text-xs text-gray-500">
                    <span aria-hidden="true">🔒</span> Registro del sistema: no se puede modificar ni inhabilitar
                  </span>
                ) : (
                  editando && !soloLectura && !hayCambios && <span className="text-xs text-gray-500">Sin cambios por guardar</span>
                )}
              </div>

              {/* Zona de riesgo, separada y con confirmación. */}
              {editando && p.permisos.inhabilitar && p.acciones.inhabilitar && actual && !protegido && (
                <div className="flex flex-wrap items-center gap-2">
                  {!activo ? (
                    <button
                      type="button"
                      className="btn-suave"
                      disabled={pendiente}
                      onClick={() => ejecutar(() => p.acciones.inhabilitar!(selId!, 1))}
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
                        onClick={() => ejecutar(() => p.acciones.inhabilitar!(selId!, 0))}
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
              {visibles.map((f) => {
                const sel = id(f) === selId;
                return (
                  <tr
                    key={id(f)}
                    onClick={() => abrir(f)}
                    aria-selected={sel}
                    className={`cursor-pointer border-t border-hoja-100 transition hover:bg-hoja-50 ${sel ? "bg-luna/15 shadow-[inset_4px_0_0_var(--color-luna)]" : ""} ${activa(f) ? "" : "text-gray-400"}`}
                  >
                    {p.columnas.map((c) => (
                      <td key={c.name} className="px-4 py-2.5">
                        {c.tipo !== "imagen" ? f[c.name] : f[c.name] ? <Miniatura src={String(f[c.name])} alt="" className="h-10 w-10" /> : "—"}
                      </td>
                    ))}
                    <td className="px-4 py-2.5"><Estado activo={activa(f)} /></td>
                  </tr>
                );
              })}
              {!visibles.length && (
                <tr>
                  <td colSpan={p.columnas.length + 1} className="px-4 py-6 text-center text-gray-500">Sin registros</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {visibles.length > 0 && (
          <p className="border-t border-hoja-100 px-4 py-2 text-xs text-gray-500">
            {encontrados ? `Resultado de la consulta: ${visibles.length} de ${p.filas.length}. ` : ""}Haga clic en una fila para cargarla en el formulario.
          </p>
        )}
      </div>
    </div>
  );
}
