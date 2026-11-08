import Image from "next/image";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { RegistroForm } from "@/components/RegistroForm";
import { getUsuario } from "@/lib/session";

// Botón "Registrarse" del parcial: carga Gestión Persona sin sesión. Solo compradores.
export default async function RegistroPage() {
  if (await getUsuario()) redirect("/");
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-hoja-900 via-hoja-700 to-hoja-500 p-4 py-8 md:py-12">
      <div className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_70%)] md:inset-y-0 md:right-auto md:w-1/2 md:[mask-image:linear-gradient(to_right,black_45%,transparent)]">
        <Image src="/images/login-bg.jpg" alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover opacity-40 blur-[1px]" />
      </div>
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-luna/90" />
      <div className="pointer-events-none absolute -right-8 -top-32 h-96 w-96 rounded-full bg-hoja-900" />

      <div className="relative mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_1.6fr] md:items-start">
        <section className="text-white md:sticky md:top-12">
          <Logo className="h-12 w-12" />
          <p className="mt-4 text-sm font-semibold tracking-wide text-luna uppercase">Gestión Persona</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Regístrese como comprador</h1>
          <p className="mt-2 text-hoja-100">Encuentre productos del campo Colombiano directamente de quien los cultiva.</p>
          <ul className="mt-6 hidden space-y-3 text-sm text-hoja-100/90 md:block">
            <li className="flex gap-2"><span aria-hidden="true">🧺</span> Compre directo al productor.</li>
            <li className="flex gap-2"><span aria-hidden="true">🤝</span> Menos intermediarios, mejor precio para el campo.</li>
          </ul>
          <p className="mt-6 rounded-xl bg-white/10 p-3 text-sm text-hoja-100">
            <span aria-hidden="true">🌱</span> ¿Es productor? Su cuenta la crea la asociación (administrador) para validar su identidad.
          </p>
        </section>
        <div className="rounded-3xl bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8">
          <RegistroForm />
        </div>
      </div>
    </main>
  );
}
