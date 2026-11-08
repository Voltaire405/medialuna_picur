import { ContrasenaForm } from "@/components/CuentaForms";

export default function ContrasenaPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold text-hoja-900">Cambiar mi contraseña</h1>
      <div className="rounded-2xl bg-white p-5 shadow">
        <ContrasenaForm />
      </div>
    </div>
  );
}
