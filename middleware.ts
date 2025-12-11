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
      mode: "LIVE", // "LIVE" = chặn thật, "DRY_RUN" = chỉ ghi log
      
      // Các bot được phép truy cập
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, Yandex (cho SEO)
        "CATEGORY:MONITOR",       // UptimeRobot, Pingdom (kiểm tra uptime)
        "CATEGORY:PREVIEW",       // Facebook, Twitter crawler (xem trước link)
      ],

    }),

    shield({
      mode: "LIVE",
      // Shield tự động chặn:
      // Automated tools: curl, wget, httpie, Postman
      // Tấn công phổ biến: SQL Injection, XSS, Path Traversal
      // Request bất thường: thiếu headers, HTTP method lạ
      // Suspicious patterns: query params nguy hiểm
    }),
  ],
});


export async function authMiddleWare(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    // Không có session → Chuyển hướng đến trang login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Có session → Cho phép truy cập
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

  // Arcjet đã kiểm tra bot & shield TRƯỚC middleware này
  // Nếu bị chặn, request sẽ trả về 403 Forbidden
  
  // Kiểm tra nếu request đến route /admin/*
  if (pathname.startsWith("/admin")) {
    return authMiddleWare(request);
  }
  
  // Route khác (public) → Cho phép truy cập
  return NextResponse.next();
});