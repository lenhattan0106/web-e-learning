import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";
import { env } from "./lib/env";
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export const config = {
  // matcher cho Next.js biết middleware sẽ chạy trên route nào
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/payment/ipn|payment/return).*)",
  ],
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

export default createMiddleware(aj, async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/api/payment/ipn") ||
    pathname.startsWith("/payment/return")
  ) {
    console.log("Payment route - bỏ qua Arcjet:", pathname);
    return NextResponse.next();
  }

  //  Kiểm tra teacher 
  if (pathname.startsWith("/teacher")) {
    return authMiddleWare(request);
  }

  return NextResponse.next();
});