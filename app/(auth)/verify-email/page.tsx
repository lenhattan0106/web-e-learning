"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { CheckCircle2, Loader2, Mail, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [isVerifying, startVerifying] = useTransition();
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "success" | "error">("pending");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { data: session, isPending: sessionPending } = authClient.useSession();

  // Kiểm tra trạng thái verification dựa trên URL params và session
  useEffect(() => {
    const checkVerificationStatus = async () => {
      // Kiểm tra error trong URL params
      const error = params.get("error");
      if (error === "invalid_token") {
        setVerificationStatus("error");
        setErrorMessage("Link xác minh không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại email xác minh.");
        return;
      } else if (error) {
        setVerificationStatus("error");
        setErrorMessage("Đã xảy ra lỗi khi xác minh email. Vui lòng thử lại.");
        return;
      }

      // Kiểm tra session để xem email đã được verify chưa
      if (!sessionPending && session?.user) {
        // Nếu có session và email đã verified → verification thành công
        if (session.user.emailVerified) {
          setVerificationStatus("success");
          toast.success("Email đã được xác minh thành công!");
          // Tự động redirect về login sau 2 giây
          setTimeout(() => {
            router.push("/login");
          }, 2000);
          return;
        } else {
          // Có session nhưng chưa verify → đang chờ verify
          setVerificationStatus("pending");
          return;
        }
      }

      // Không có session → đang chờ verify hoặc chưa click link
      setVerificationStatus("pending");
    };

    checkVerificationStatus();
  }, [params, session, sessionPending, router]);

  async function resendVerificationEmail() {
    const email = params.get("email");
    if (!email) {
      toast.error("Không tìm thấy email. Vui lòng đăng ký lại.");
      return;
    }

    startVerifying(async () => {
      try {
        await authClient.sendVerificationEmail({
          email: email,
          callbackURL: `/verify-email?email=${encodeURIComponent(email)}`,
        });
        toast.success("Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư của bạn.");
      } catch {
        toast.error("Không thể gửi email xác minh. Vui lòng thử lại sau.");
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {verificationStatus === "success" ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Email đã được xác minh!</CardTitle>
              <CardDescription>
                Tài khoản của bạn đã được kích hoạt thành công.
              </CardDescription>
            </>
          ) : verificationStatus === "error" ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Xác minh thất bại</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Kiểm tra email của bạn</CardTitle>
              <CardDescription>
                Chúng tôi đã gửi link xác minh đến địa chỉ email của bạn.
                Vui lòng click vào link trong email để kích hoạt tài khoản.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {verificationStatus === "pending" && (
            <>
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium mb-2">Chưa nhận được email?</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Kiểm tra thư mục Spam hoặc Quảng cáo</li>
                  <li>Đảm bảo email đúng địa chỉ bạn đã đăng ký</li>
                  <li>Đợi vài phút, email có thể đến chậm</li>
                </ul>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={async () => {
                    // Kiểm tra lại session sau khi user click link verification
                    startVerifying(async () => {
                      try {
                        const currentSession = await authClient.getSession();
                        if (currentSession?.data?.user?.emailVerified) {
                          setVerificationStatus("success");
                          toast.success("Email đã được xác minh thành công!");
                          setTimeout(() => {
                            router.push("/login");
                          }, 1500);
                        } else {
                          toast.info("Email chưa được xác minh. Vui lòng click vào link trong email.");
                        }
                      } catch {
                        toast.error("Không thể kiểm tra trạng thái. Vui lòng thử lại.");
                      }
                    });
                  }}
                  disabled={isVerifying}
                  className="w-full"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang kiểm tra...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Đã click link xác minh? Kiểm tra lại
                    </>
                  )}
                </Button>
                <Button
                  onClick={resendVerificationEmail}
                  disabled={isVerifying}
                  variant="outline"
                  className="w-full"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Gửi lại email xác minh
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {verificationStatus === "success" && (
            <Button
              onClick={() => router.push("/login")}
              className="w-full"
            >
              Đăng nhập ngay
            </Button>
          )}

          {verificationStatus === "error" && (
            <div className="space-y-2">
              <Button
                onClick={resendVerificationEmail}
                disabled={isVerifying}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Gửi lại email xác minh
                  </>
                )}
              </Button>
              <Button
                onClick={() => router.push("/signup")}
                variant="outline"
                className="w-full"
              >
                Đăng ký lại
              </Button>
            </div>
          )}

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

