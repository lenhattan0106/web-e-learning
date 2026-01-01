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
import { CheckCircle2, Loader2, Mail, XCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { checkEmailVerificationStatus } from "./action";

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [isVerifying, startVerifying] = useTransition();
  const [isResending, startResending] = useTransition();
  const [isChecking, setIsChecking] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "success" | "error" | "already_verified">("pending");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const email = params.get("email") || "";

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Kiểm tra trạng thái verification khi trang load
  useEffect(() => {
    const checkInitialStatus = async () => {
      // Kiểm tra error trong URL params
      const error = params.get("error");
      if (error === "invalid_token") {
        setVerificationStatus("error");
        setErrorMessage("Link xác minh không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại email xác minh.");
        setIsChecking(false);
        return;
      } else if (error) {
        setVerificationStatus("error");
        setErrorMessage("Đã xảy ra lỗi khi xác minh email. Vui lòng thử lại.");
        setIsChecking(false);
        return;
      }

      // Kiểm tra session trước
      if (!sessionPending && session?.user) {
        if (session.user.emailVerified) {
          setVerificationStatus("success");
          toast.success("Email đã được xác minh thành công!");
          setTimeout(() => {
            router.push("/login");
          }, 2000);
          setIsChecking(false);
          return;
        }
      }

      // Nếu có email trong URL, kiểm tra trong database
      if (email) {
        const result = await checkEmailVerificationStatus(email);
        
        if (result.verified) {
          // Email đã được xác minh → Redirect về login với thông báo
          setVerificationStatus("already_verified");
          toast.info("Email này đã được xác minh trước đó. Bạn có thể đăng nhập ngay.");
          setTimeout(() => {
            router.push("/login?already_verified=true");
          }, 2000);
          setIsChecking(false);
          return;
        }

        if (!result.exists) {
          // Email không tồn tại trong hệ thống
          setVerificationStatus("error");
          setErrorMessage("Email này chưa được đăng ký. Vui lòng đăng ký tài khoản mới.");
          setIsChecking(false);
          return;
        }
      }

      // Email chưa xác minh → hiển thị trang chờ xác minh
      setVerificationStatus("pending");
      setIsChecking(false);
    };

    if (!sessionPending) {
      checkInitialStatus();
    }
  }, [params, session, sessionPending, router, email]);

  async function resendVerificationEmail() {
    if (!email) {
      toast.error("Không tìm thấy email. Vui lòng đăng ký lại.");
      return;
    }

    startResending(async () => {
      try {
        await authClient.sendVerificationEmail({
          email: email,
          callbackURL: `/login?verified=true`,
        });
        toast.success("Đã gửi lại email xác minh!");
        setResendCooldown(60);
      } catch {
        toast.error("Không thể gửi email. Vui lòng thử lại sau.");
      }
    });
  }

  async function checkVerificationManually() {
    startVerifying(async () => {
      try {
        // Kiểm tra trong database
        const result = await checkEmailVerificationStatus(email);
        
        if (result.verified) {
          setVerificationStatus("already_verified");
          toast.success("Email đã được xác minh thành công!");
          setTimeout(() => {
            router.push("/login?verified=true");
          }, 1500);
        } else {
          // Thử kiểm tra session
          const currentSession = await authClient.getSession();
          if (currentSession?.data?.user?.emailVerified) {
            setVerificationStatus("success");
            toast.success("Email đã được xác minh thành công!");
            setTimeout(() => {
              router.push("/login");
            }, 1500);
          } else {
            toast.info("Chưa xác minh. Vui lòng click vào link trong email.");
          }
        }
      } catch {
        toast.error("Không thể kiểm tra. Vui lòng thử lại.");
      }
    });
  }

  // Loading state
  if (isChecking || sessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Đang kiểm tra trạng thái...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {(verificationStatus === "success" || verificationStatus === "already_verified") ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">
                {verificationStatus === "already_verified" ? "Đã xác minh trước đó" : "Xác minh thành công!"}
              </CardTitle>
              <CardDescription>
                {verificationStatus === "already_verified" 
                  ? "Email này đã được xác minh. Đang chuyển đến trang đăng nhập..."
                  : "Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng..."
                }
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
              <CardTitle className="text-2xl">Kiểm tra email</CardTitle>
              <CardDescription>
                Chúng tôi đã gửi link xác minh đến{" "}
                {email && <strong className="text-foreground">{email}</strong>}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {verificationStatus === "pending" && (
            <>
              {/* Tips Section */}
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium mb-2">Chưa nhận được email?</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Kiểm tra thư mục Spam hoặc Quảng cáo</li>
                  <li>Đợi vài phút, email có thể đến chậm</li>
                </ul>
              </div>

              {/* Primary Action: Resend Email */}
              <Button
                onClick={resendVerificationEmail}
                disabled={isResending || resendCooldown > 0}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : resendCooldown > 0 ? (
                  <>Gửi lại sau {resendCooldown}s</>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Gửi lại email xác minh
                  </>
                )}
              </Button>

              {/* Secondary Action: Check Status (as text link) */}
              <div className="text-center">
                <button
                  onClick={checkVerificationManually}
                  disabled={isVerifying}
                  className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Đang kiểm tra...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3" />
                      Đã xác minh? Nhấn để kiểm tra
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {(verificationStatus === "success" || verificationStatus === "already_verified") && (
            <Button
              onClick={() => router.push("/login")}
              className="w-full"
            >
              Đăng nhập ngay
            </Button>
          )}

          {verificationStatus === "error" && (
            <div className="space-y-3">
              {errorMessage.includes("chưa được đăng ký") ? (
                <Button
                  onClick={() => router.push("/signup")}
                  className="w-full"
                >
                  Đăng ký tài khoản
                </Button>
              ) : (
                <>
                  <Button
                    onClick={resendVerificationEmail}
                    disabled={isResending || resendCooldown > 0}
                    className="w-full"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang gửi...
                      </>
                    ) : resendCooldown > 0 ? (
                      <>Gửi lại sau {resendCooldown}s</>
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
                </>
              )}
            </div>
          )}

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              ← Quay lại đăng nhập
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
