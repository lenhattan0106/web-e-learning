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
      async sendVerificationOTP({ email, otp, type }) {
        let subject = "NT E-Learning - Mã xác minh";
        let html = "";

        if (type === "forget-password") {
          subject = "NT E-Learning - Mã OTP đặt lại mật khẩu";
          html = `
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Mã OTP đặt lại mật khẩu</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
                <tr>
                  <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-collapse: collapse;">
                      <!-- Header -->
                      <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 12px 12px 0 0;">
                          <div style="display: inline-block; width: 64px; height: 64px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                            <span style="font-size: 32px;">🔐</span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Đặt lại mật khẩu</h1>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px;">
                          <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                            Xin chào,
                          </p>
                          <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                            Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản NT E-Learning của mình. 
                            Vui lòng sử dụng mã OTP bên dưới để tiếp tục quá trình đặt lại mật khẩu.
                          </p>
                          
                          <!-- OTP Box -->
                          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px dashed #2563eb; border-radius: 12px; padding: 32px; text-align: center; margin: 32px 0;">
                            <p style="margin: 0 0 12px; color: #1e40af; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                              Mã OTP của bạn
                            </p>
                            <div style="display: inline-block; background-color: #ffffff; padding: 20px 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                              <span style="font-size: 36px; font-weight: 700; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                ${otp}
                              </span>
                            </div>
                            <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">
                              Mã này sẽ hết hạn sau 10 phút
                            </p>
                          </div>
                          
                          <!-- Warning Box -->
                          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 24px 0;">
                            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                              <strong>⚠️ Lưu ý bảo mật:</strong>
                            </p>
                            <ul style="margin: 8px 0 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
                              <li>Không chia sẻ mã OTP này với bất kỳ ai</li>
                              <li>NT E-Learning sẽ không bao giờ yêu cầu bạn cung cấp mã OTP qua điện thoại</li>
                              <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
                            </ul>
                          </div>
                          
                          <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                            Nếu bạn không thực hiện yêu cầu này, tài khoản của bạn vẫn an toàn và không có thay đổi nào được thực hiện.
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.6;">
                            Email này được gửi tự động từ hệ thống NT E-Learning.<br>
                            Vui lòng không trả lời email này.
                          </p>
                          <p style="margin: 16px 0 0; text-align: center;">
                            <a href="${env.BETTER_AUTH_URL || 'http://localhost:3000'}" 
                               style="color: #2563eb; text-decoration: none; font-size: 14px; font-weight: 500;">
                              Truy cập NT E-Learning
                            </a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;
        } else {
          // Fallback cho các trường hợp khác (nếu có)
          subject = "NT E-Learning - Mã xác minh";
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Mã xác minh của bạn</h2>
              <p>Mã OTP của bạn là: <strong style="font-size: 24px; color: #2563eb;">${otp}</strong></p>
            </div>
          `;
        }

        await transporter.sendMail({
          from: `NT E-Learning <${env.GMAIL_USER}>`,
          to: email,
          subject: subject,
          html: html,
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
