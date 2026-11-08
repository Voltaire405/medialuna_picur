// Medialuna: la herramienta con la que se cosechan frutos de ramas altas.
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#2f5c28" />
      <path d="M33 10a15 15 0 1 0 5 21 12 12 0 0 1-5-21z" fill="#f2b632" />
      <path d="M10 38c6-3 12-3 28 0" stroke="#8fc07d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
