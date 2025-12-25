import aj from "@/lib/arcjet";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ip from "@arcjet/ip";
import {
  type ArcjetDecision,
  type BotOptions,
  type EmailOptions,
  type ProtectSignupOptions,
  type SlidingWindowRateLimitOptions,
  detectBot,
  protectSignup,
  slidingWindow,
} from "@arcjet/next";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";
import { randomBytes } from "crypto";

const emailOptions = {
  mode: "LIVE", 
  block: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
} satisfies EmailOptions;

const botOptions = {
  mode: "LIVE",
  allow: [], // ngăn bot gửi form
} satisfies BotOptions;

const rateLimitOptions = {
  mode: "LIVE",
  interval: "2m", 
  max: 5,
} satisfies SlidingWindowRateLimitOptions<[]>;

const signupOptions = {
  email: emailOptions,
  bots: botOptions,
  rateLimit: rateLimitOptions,
} satisfies ProtectSignupOptions<[]>;

async function protect(req: NextRequest): Promise<ArcjetDecision> {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  let userId: string;
  if (session?.user.id) {
    userId = session.user.id;
  } else {
    userId = ip(req) || "127.0.0.1"; // Dự phòng IP local nếu không có
  }

  if (req.nextUrl.pathname.startsWith("/api/auth/sign-up")) {
    const body = await req.clone().json();
    if (typeof body.email === "string") {
      return aj 
        .withRule(protectSignup(signupOptions))
        .protect(req, { email: body.email, fingerprint: userId });
    } else {
      return aj
        .withRule(detectBot(botOptions))
        .withRule(slidingWindow(rateLimitOptions))
        .protect(req, { fingerprint:userId });
    }
  } else {
    return aj.withRule(detectBot(botOptions)).protect(req, { fingerprint:userId });
  }
}

const authHandlers = toNextJsHandler(auth.handler);

export const { GET } = authHandlers;

// Bọc POST handler với các bảo vệ của Arcjet,
// sau đó giao hoàn toàn cho better-auth xử lý (không tự tạo Account thủ công)
export const POST = async (req: NextRequest) => {
  const decision = await protect(req);

  console.log("Quyết định Arcjet:", decision);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return new Response(null, { status: 429 });
    } else if (decision.reason.isEmail()) {
      let message: string;

      if (decision.reason.emailTypes.includes("INVALID")) {
        message = "Định dạng địa chỉ email không hợp lệ. Có lỗi chính tả không?";
      } else if (decision.reason.emailTypes.includes("DISPOSABLE")) {
        message = "Chúng tôi không cho phép địa chỉ email tạm thời.";
      } else if (decision.reason.emailTypes.includes("NO_MX_RECORDS")) {
        message =
          "Tên miền email của bạn không có bản ghi MX. Có lỗi chính tả không?";
      } else {
        message = "Email không hợp lệ.";
      }

      return Response.json({ message }, { status: 400 });
    } else {
      return new Response(null, { status: 403 });
    }
  }

  // Không làm thêm bất cứ xử lý signup thủ công nào:
  // - Better-Auth + Prisma Adapter sẽ tự động tạo User + Account (providerId: "credential")
  // - Mật khẩu được lưu trong Account theo đúng thiết kế của Better-Auth
  return authHandlers.POST(req);
};