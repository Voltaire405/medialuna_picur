// Envío por Resend (API HTTP, sin dependencias). Sin RESEND_API_KEY se imprime en consola.
export async function enviarCorreo(para: string, asunto: string, texto: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[correo simulado] Para: ${para}\nAsunto: ${asunto}\n${texto}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "Medialuna <onboarding@resend.dev>",
      to: [para],
      subject: asunto,
      text: texto,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
