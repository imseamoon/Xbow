import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/auth/login",
  "/auth/register",
  "/_next",
  "/api",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // For dashboard pages, redirect to login if no auth cookie
  // We check the cookie presence — actual validation happens client-side
  const token = request.cookies.get("rs_token")?.value;

  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
