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

// Bọc POST handler với các bảo vệ của Arcjet
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
        // Đây là trường hợp bắt tất cả, nhưng các điều kiện trên nên đầy đủ
        // dựa trên các quy tắc đã cấu hình.
        message = "Email không hợp lệ.";
      }

      return Response.json({ message }, { status: 400 });
    } else {
      return new Response(null, { status: 403 });
    }
  }

  // Xử lý signup: Tạo Account record sau khi better-auth tạo User
  const isSignup = req.nextUrl.pathname === "/api/auth/sign-up";
  
  if (isSignup) {
    try {
      // Đọc body trước khi gọi better-auth (body chỉ đọc được 1 lần)
      const body = await req.json().catch(() => null);
      const email = body?.email;
      
      // Tạo lại request với body để gửi cho better-auth
      const newReq = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(body),
      });
      
      // Gọi better-auth handler
      const response = await authHandlers.POST(newReq);
      
      // Nếu signup thành công (status 200/201), kiểm tra và tạo Account record nếu cần
      // Better-auth với email/password có thể không tự động tạo Account record
      // Nên cần kiểm tra và tạo thủ công nếu chưa có
      if ((response.status === 200 || response.status === 201) && email) {
        // Đợi một chút để đảm bảo User đã được tạo trong DB bởi better-auth
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        try {
          const user = await prisma.user.findUnique({
            where: { email: email },
            select: { id: true, email: true },
          });

          if (user) {
            // Kiểm tra xem đã có Account record với providerId = "credential" chưa
            const existingAccount = await prisma.account.findFirst({
              where: {
                userId: user.id,
                providerId: "credential",
              },
            });

            // Nếu chưa có Account record với providerId = "credential", tạo một Account record
            // Better-auth sẽ lưu password trong Account table khi login
            // Nhưng khi signup, có thể chưa tạo Account record
            if (!existingAccount) {
              // Tìm xem có Account record nào khác không (có thể better-auth đã tạo với password)
              const anyAccount = await prisma.account.findFirst({
                where: {
                  userId: user.id,
                },
                select: { password: true },
              });

              await prisma.account.create({
                data: {
                  id: randomBytes(16).toString("hex"),
                  accountId: user.email,
                  providerId: "credential",
                  userId: user.id,
                  // Copy password từ Account khác nếu có, nếu không để null
                  // Better-auth sẽ tự động set password khi user login lần đầu
                  password: anyAccount?.password || null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });
              console.log(`✅ [API Route] Đã tạo Account record cho user: ${user.email}`);
            } else {
              console.log(`ℹ️ [API Route] Account record đã tồn tại cho user: ${user.email}`);
            }
          }
        } catch (error) {
          console.error("❌ [API Route] Lỗi khi kiểm tra/tạo Account record:", error);
          // Không throw error để không làm gián đoạn flow signup
          // Better-auth đã xử lý signup thành công rồi
        }
      }
      
      return response;
    } catch (error) {
      console.error("❌ [API Route] Lỗi trong POST handler:", error);
      // Fallback: thử gọi better-auth với request gốc
      return authHandlers.POST(req);
    }
  }

  return authHandlers.POST(req);
};