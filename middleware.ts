import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";
import { env } from "./lib/env";
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { auth } from "./lib/auth";

export const config = {
  // matcher cho Next.js biết middleware sẽ chạy trên route nào
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/payment/ipn|payment/return).*)",
  ],
  //Node.js runtime to support better-auth (Edge Runtime doesn't support 'stream' module)
  runtime: 'nodejs',
};

const aj = arcjet({
  key: env.ARCJET_KEY!,
  rules: [
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE",
        "CATEGORY:MONITOR",
        "CATEGORY:PREVIEW",
      ],
    }),
    shield({
      mode: "LIVE",
    }),
  ],
});

export async function authMiddleWare(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// Role-based middleware with full session check
export async function roleMiddleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Get full session with role
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const pathname = request.nextUrl.pathname;
  const role = session.user.role;

  // Admin route protection
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Teacher route protection - allow both teacher and admin
  if (pathname.startsWith("/teacher")) {
    if (role !== "teacher" && role !== "admin") {
      return NextResponse.redirect(new URL("/not-teacher", request.url));
    }
  }

  return NextResponse.next();
}

export default createMiddleware(aj, async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/api/payment/ipn") ||
    pathname.startsWith("/payment/return")
  ) {
    console.log("Payment route - bỏ qua Arcjet:", pathname);
    return NextResponse.next();
  }

  //  Check protected routes with role validation
  if (pathname.startsWith("/teacher") || pathname.startsWith("/admin")) {
    return roleMiddleware(request);
  }

  return NextResponse.next();
});