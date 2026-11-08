import { startTransition, type FormEvent } from "react";

// Pasa a minúsculas mientras se escribe, conservando la posición del cursor.
export const aMinuscula = (e: FormEvent<HTMLInputElement>) => {
  const el = e.currentTarget;
  const { selectionStart: a, selectionEnd: b } = el;
  el.value = el.value.toLowerCase();
  el.setSelectionRange(a, b);
};

// Envía sin el reset automático de formularios de React 19 (conserva lo digitado si hay error).
export const enviar = (accion: (fd: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => accion(fd));
};
