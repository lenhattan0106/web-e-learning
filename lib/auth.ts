import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { env } from "./env";
import { emailOTP } from "better-auth/plugins";
import { admin as adminPlugin } from "better-auth/plugins";
import { ac, admin as adminRole, teacher, user } from "./permissions";
import { transporter } from "./smtp";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    github: {
      clientId: env.AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // Bắt buộc verify email trước khi đăng nhập
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // Gửi email verification với link
      await transporter.sendMail({
        from: `NT E-Learning <${env.GMAIL_USER}>`,
        to: user.email,
        subject: "NT E-Learning - Xác minh email của bạn",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Xác minh email của bạn</h2>
            <p>Xin chào <strong>${user.name}</strong>,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản tại NT E-Learning!</p>
            <p>Vui lòng click vào link bên dưới để xác minh email của bạn:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Xác minh email
              </a>
            </div>
            <p>Hoặc copy và paste link này vào trình duyệt:</p>
            <p style="word-break: break-all; color: #666;">${url}</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Link này sẽ hết hạn sau 24 giờ. Nếu bạn không yêu cầu đăng ký tài khoản này, 
              vui lòng bỏ qua email này.
            </p>
          </div>
        `,
      });
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        await transporter.sendMail({
          from: `NT E-Learning <${env.GMAIL_USER}>`,
          to: email,
          subject: "NT E-Learning - Verify your email",
          html: `<p>Your OTP is: <strong>${otp}</strong> </p>`,
        });
      },
    }),
    adminPlugin({
      ac,
      roles: {
        admin: adminRole,
        teacher,
        user,
      },
      defaultRole: "user",
    }),
  ],
});
