"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email");

  // Lấy OTP từ sessionStorage (đã được lưu ở verify-request page sau khi verify thành công)
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

  // Validation: Password phải có ít nhất 8 ký tự
  const isPasswordValid = password.length >= 8;
  const isPasswordMatch = password === confirmPassword;
  const canSubmit = isPasswordValid && isPasswordMatch && password && confirmPassword && !isResetting && !!otp;

  async function handleResetPassword() {
    if (!email) {
      toast.error("Thiếu thông tin email. Vui lòng thử lại từ đầu.");
      router.push("/forget-password");
      return;
    }

    // Lấy OTP từ sessionStorage (fallback nếu state chưa có)
    let currentOtp = otp;
    if (!currentOtp && typeof window !== "undefined") {
      const storageKey = `reset-password-otp-${email}`;
      currentOtp = sessionStorage.getItem(storageKey);
    }

    if (!currentOtp) {
      toast.error("Mã OTP đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu mã OTP mới.");
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
        otp: currentOtp, // Sử dụng OTP từ sessionStorage
        password: password,
        fetchOptions: {
          onSuccess: () => {
            // Xóa OTP khỏi sessionStorage sau khi reset thành công (bảo mật)
            if (typeof window !== "undefined") {
              const storageKey = `reset-password-otp-${email}`;
              sessionStorage.removeItem(storageKey);
            }
            
            toast.success("Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.");
            // Redirect đến trang login với email đã điền sẵn
            router.push(`/login?email=${encodeURIComponent(email)}&reset=success`);
          },
          onError: (ctx) => {
            const errorMessage = ctx.error?.message?.toLowerCase() || "";
            if (errorMessage.includes("invalid") || errorMessage.includes("không hợp lệ") || errorMessage.includes("expired")) {
              toast.error("Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã OTP mới.");
              // Xóa OTP khỏi sessionStorage nếu đã hết hạn
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
      toast.error("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.");
    } finally {
      startResetting(false);
    }
  }

  // Nếu không có email hoặc không có OTP trong sessionStorage, redirect về forget-password
  if (!email || !hasOtp) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Thiếu thông tin</CardTitle>
            <CardDescription>
              {!email 
                ? "Không tìm thấy email. Vui lòng thử lại từ đầu."
                : "Mã OTP đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu mã OTP mới."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push(`/forget-password${email ? `?email=${encodeURIComponent(email)}` : ''}`)} 
              className="w-full"
            >
              Quay lại quên mật khẩu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <KeyRound className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Đặt lại mật khẩu</CardTitle>
          <CardDescription>
            Nhập mật khẩu mới cho tài khoản <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu mới</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                className="pr-10"
                disabled={isResetting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isResetting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {password && !isPasswordValid && (
              <p className="text-xs text-destructive">
                Mật khẩu phải có ít nhất 8 ký tự
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="pr-10"
                disabled={isResetting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isResetting}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {confirmPassword && !isPasswordMatch && (
              <p className="text-xs text-destructive">
                Mật khẩu xác nhận không khớp
              </p>
            )}
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Yêu cầu mật khẩu:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Tối thiểu 8 ký tự</li>
              <li>Nên bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt</li>
            </ul>
          </div>

          <Button
            onClick={handleResetPassword}
            disabled={!canSubmit}
            className="w-full"
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang đặt lại mật khẩu...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Đặt lại mật khẩu
              </>
            )}
          </Button>

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

