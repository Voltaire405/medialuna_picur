import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Filtro rápido (solo cookie). La validación real está en getUsuario() del layout y de cada action.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|registro|_next/static|_next/image|favicon.ico).*)"],
};
