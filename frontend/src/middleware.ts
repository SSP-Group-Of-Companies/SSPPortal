import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
   console.log("Middleware token:", token); 

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

