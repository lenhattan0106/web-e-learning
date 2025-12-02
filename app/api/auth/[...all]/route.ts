import aj from "@/lib/arcjet";
import { auth } from "@/lib/auth";
import ip from "@arcjet/ip";
import arcjet, {
  type ArcjetDecision,
  type BotOptions,
  type EmailOptions,
  type ProtectSignupOptions,
  type SlidingWindowRateLimitOptions,
  detectBot,
  protectSignup, 
  shield,
  slidingWindow,
} from "@arcjet/next";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const emailOptions = {
  mode: "LIVE", // sẽ chặn yêu cầu. Sử dụng "DRY_RUN" để chỉ ghi log
  // Chặn email dùng tạm, không hợp lệ, hoặc không có bản ghi MX
  block: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
} satisfies EmailOptions;

const botOptions = {
  mode: "LIVE",
  // cấu hình danh sách bot được phép từ
  // https://arcjet.com/bot-list
  allow: [], // ngăn bot gửi form
} satisfies BotOptions;

const rateLimitOptions = {
  mode: "LIVE",
  interval: "2m", // đếm yêu cầu trong khung thời gian 2 phút
  max: 5, // cho phép 5 lần gửi trong khung thời gian
} satisfies SlidingWindowRateLimitOptions<[]>;

const signupOptions = {
  email: emailOptions,
  // sử dụng giới hạn tốc độ theo khung thời gian trượt
  bots: botOptions,
  // Sẽ bất thường nếu form được gửi hơn 5 lần trong 10 phút
  // từ cùng một địa chỉ IP
  rateLimit: rateLimitOptions,
} satisfies ProtectSignupOptions<[]>;

async function protect(req: NextRequest): Promise<ArcjetDecision> {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  // Nếu người dùng đã đăng nhập, chúng ta sẽ sử dụng ID của họ làm định danh.
  // Điều này cho phép áp dụng giới hạn trên tất cả thiết bị và phiên (bạn cũng
  // có thể sử dụng session ID). Nếu không, sẽ dùng địa chỉ IP.
  let userId: string;
  if (session?.user.id) {
    userId = session.user.id;
  } else {
    userId = ip(req) || "127.0.0.1"; // Dự phòng IP local nếu không có
  }

  // Nếu đây là đăng ký thì sử dụng quy tắc protectSignup đặc biệt
  // Xem https://docs.arcjet.com/signup-protection/quick-start
  if (req.nextUrl.pathname.startsWith("/api/auth/sign-up")) {
    // Better-Auth đọc body, nên chúng ta cần clone request trước
    const body = await req.clone().json();

    // Nếu email có trong body của request thì chúng ta có thể chạy
    // các kiểm tra xác thực email. Xem
    // https://www.better-auth.com/docs/concepts/hooks#example-enforce-email-domain-restriction
    if (typeof body.email === "string") {
      return aj 
        .withRule(protectSignup(signupOptions))
        .protect(req, { email: body.email, fingerprint: userId });
    } else {
      // Nếu không thì sử dụng rate limit và phát hiện bot
      return aj
        .withRule(detectBot(botOptions))
        .withRule(slidingWindow(rateLimitOptions))
        .protect(req, { fingerprint:userId });
    }
  } else {
    // Cho tất cả các yêu cầu auth khác
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

  return authHandlers.POST(req);
};