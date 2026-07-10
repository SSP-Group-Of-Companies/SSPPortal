import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, NEXTAUTH_SECRET } from "./app/config/env";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: NEXTAUTH_SECRET, cookieName: AUTH_COOKIE_NAME });

  const { pathname } = req.nextUrl;
  const isAuthPage = pathname === "/login";

  if (!token && !isAuthPage) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAuthPage) {
    const dashboardUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Accounts disabled in the directory are cut off at the edge.
  if (token && token.status === "disabled") {
    return NextResponse.redirect(new URL("/api/auth/logout", req.url));
  }

  // Admin console is role-gated; the API routes enforce it again server-side.
  if (pathname.startsWith("/admin")) {
    const role = typeof token?.role === "string" ? token.role : "";
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

// Apply middleware to protected routes
export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/admin/:path*", "/settings", "/settings/:path*", "/drivedock/:path*", "/dispatchsafe/:path*"],
};
