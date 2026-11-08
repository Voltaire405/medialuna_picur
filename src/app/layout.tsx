import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medialuna · Mercado campesino digital",
  description: "Plataforma que conecta pequeños productores de Antioquia con compradores locales.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
