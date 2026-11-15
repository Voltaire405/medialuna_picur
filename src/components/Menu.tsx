"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Menu({ opciones }: { opciones: { href: string; label: string }[] }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Menú principal" className="border-t border-white/10 bg-hoja-700/60">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 py-2">
        {opciones.map((o) => {
          const actual = ruta === o.href;
          return (
            <Link
              key={o.href}
              href={o.href}
              aria-current={actual ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${actual ? "bg-luna font-semibold text-hoja-900" : "hover:bg-hoja-700"}`}
            >
              {o.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
