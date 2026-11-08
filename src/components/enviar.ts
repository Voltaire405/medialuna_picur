import { startTransition, type FormEvent } from "react";

// Envía sin el reset automático de formularios de React 19 (conserva lo digitado si hay error).
export const enviar = (accion: (fd: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => accion(fd));
};
