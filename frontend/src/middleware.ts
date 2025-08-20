import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, NEXTAUTH_SECRET } from "./app/config/env";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: NEXTAUTH_SECRET, cookieName: COOKIE_NAME });

  const isAuthPage = req.nextUrl.pathname === "/login";

  if (!token && !isAuthPage) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAuthPage) {
    const dashboardUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Apply middleware to protected routes
export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/drivedock/:path*", "/dispatchsafe/:path*"],
};
