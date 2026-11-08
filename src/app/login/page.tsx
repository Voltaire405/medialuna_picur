import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import { getUsuario } from "@/lib/session";

export default async function LoginPage() {
  if (await getUsuario()) redirect("/");
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-hoja-900 via-hoja-700 to-hoja-500 p-4">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-luna/90" />
      <div className="pointer-events-none absolute -right-8 -top-32 h-96 w-96 rounded-full bg-hoja-900" />
      <div className="relative grid w-full max-w-4xl items-center gap-8 md:grid-cols-2">
        <section className="text-white">
          <Logo className="h-14 w-14" />
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">Medialuna</h1>
          <p className="mt-2 text-lg text-hoja-100">Mercado campesino digital</p>
          <p className="mt-4 max-w-sm text-sm text-hoja-100/90">
            El productor publica, el comprador encuentra. Menos intermediarios, mejor precio para el campo antioqueño.
          </p>
        </section>
        <div className="flex justify-center md:justify-end">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
