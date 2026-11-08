import { Logo } from "@/components/Logo";
import { VerificarForm } from "@/components/CuentaForms";

// Destino del enlace del correo. La confirmación va por POST (botón), no al abrir el enlace,
// para que los antivirus que pre-abren enlaces no verifiquen por el usuario.
export default async function VerificarPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-hoja-900 via-hoja-700 to-hoja-500 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white/95 p-7 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <h1 className="text-xl font-bold text-hoja-900">Verificar correo</h1>
        </div>
        <VerificarForm token={token} />
      </div>
    </main>
  );
}
