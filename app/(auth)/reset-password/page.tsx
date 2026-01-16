"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { Eye, EyeOff, KeyRound, Loader2, Lock, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Loading fallback component
function ResetPasswordSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg animate-pulse">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <div className="h-6 bg-muted rounded w-48 mx-auto animate-pulse" />
          <div className="h-4 bg-muted rounded w-64 mx-auto mt-2 animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            <div className="h-11 bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-32 animate-pulse" />
            <div className="h-11 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-12 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

// Main content component that uses useSearchParams
function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email");

  // Lấy OTP từ sessionStorage
  const getOtpFromStorage = (): string | null => {
    if (email && typeof window !== "undefined") {
      const storageKey = `reset-password-otp-${email}`;
      return sessionStorage.getItem(storageKey);
    }
    return null;
  };

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, startResetting] = useState(false);
  const [otp] = useState<string | null>(getOtpFromStorage());
  const hasOtp = !!otp;

  // Password validation - chỉ yêu cầu 8 ký tự
  const isPasswordValid = password.length >= 8;
  const isPasswordMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = isPasswordValid && isPasswordMatch && password && confirmPassword && !isResetting && !!otp;

  async function handleResetPassword() {
    if (!email) {
      toast.error("Thiếu thông tin email. Vui lòng thử lại từ đầu.");
      router.push("/forget-password");
      return;
    }

    let currentOtp = otp;
    if (!currentOtp && typeof window !== "undefined") {
      const storageKey = `reset-password-otp-${email}`;
      currentOtp = sessionStorage.getItem(storageKey);
    }

    if (!currentOtp) {
      toast.error("Mã OTP đã hết hạn. Vui lòng yêu cầu mã OTP mới.");
      router.push(`/forget-password?email=${encodeURIComponent(email)}`);
      return;
    }

    if (!isPasswordValid) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    if (!isPasswordMatch) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    startResetting(true);
    try {
      await authClient.emailOtp.resetPassword({
        email: email,
        otp: currentOtp,
        password: password,
        fetchOptions: {
          onSuccess: () => {
            if (typeof window !== "undefined") {
              const storageKey = `reset-password-otp-${email}`;
              sessionStorage.removeItem(storageKey);
            }
            
            toast.success("Đặt lại mật khẩu thành công!");
            router.push(`/login?email=${encodeURIComponent(email)}&reset=success`);
          },
          onError: (ctx) => {
            const errorMessage = ctx.error?.message?.toLowerCase() || "";
            if (errorMessage.includes("invalid") || errorMessage.includes("không hợp lệ") || errorMessage.includes("expired")) {
              toast.error("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.");
              if (typeof window !== "undefined") {
                const storageKey = `reset-password-otp-${email}`;
                sessionStorage.removeItem(storageKey);
              }
              router.push(`/forget-password?email=${encodeURIComponent(email)}`);
            } else if (errorMessage.includes("not found")) {
              toast.error("Email không tồn tại trong hệ thống.");
            } else {
              toast.error(ctx.error?.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.");
            }
          },
        },
      });
    } catch {
      toast.error("Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      startResetting(false);
    }
  }

  // Missing info screen
  if (!email || !hasOtp) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <ShieldCheck className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Phiên làm việc hết hạn</CardTitle>
            <CardDescription className="mt-2">
              {!email 
                ? "Không tìm thấy email. Vui lòng bắt đầu lại."
                : "Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Button 
              onClick={() => router.push(`/forget-password${email ? `?email=${encodeURIComponent(email)}` : ''}`)} 
              className="w-full"
              size="lg"
            >
              Yêu cầu mã mới
            </Button>
            <div className="text-center mt-4">
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

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Đặt lại mật khẩu</CardTitle>
          <CardDescription className="mt-2">
            Tạo mật khẩu mới cho tài khoản{" "}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-4">
          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Mật khẩu mới
            </Label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                disabled={isResetting}
                autoComplete="new-password"
                className={cn(
                  "w-full h-11 px-4 pr-12 rounded-lg border-2 bg-background text-base transition-all",
                  "placeholder:text-muted-foreground/60",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "[&::-ms-reveal]:hidden [&::-ms-clear]:hidden",
                  password && !isPasswordValid && "border-destructive focus:border-destructive focus:ring-destructive/20"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={isResetting}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {password && !isPasswordValid && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Mật khẩu phải có ít nhất 8 ký tự
              </p>
            )}
            {isPasswordValid && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Mật khẩu hợp lệ
              </p>
            )}
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Xác nhận mật khẩu
            </Label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                disabled={isResetting}
                autoComplete="new-password"
                className={cn(
                  "w-full h-11 px-4 pr-12 rounded-lg border-2 bg-background text-base transition-all",
                  "placeholder:text-muted-foreground/60",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "[&::-ms-reveal]:hidden [&::-ms-clear]:hidden",
                  confirmPassword && !isPasswordMatch && "border-destructive focus:border-destructive focus:ring-destructive/20"
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={isResetting}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {confirmPassword && !isPasswordMatch && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Mật khẩu không khớp
              </p>
            )}
            {isPasswordMatch && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Mật khẩu khớp
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleResetPassword}
            disabled={!canSubmit}
            className="w-full h-12 text-base font-medium shadow-lg"
            size="lg"
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Đang đặt lại...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-5 w-5" />
                Đặt lại mật khẩu
              </>
            )}
          </Button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← Quay lại đăng nhập
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main page component with Suspense wrapper
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
