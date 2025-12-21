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
import { ArrowLeft, KeyRound, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export default function ForgetPassword() {
  const router = useRouter();
  const [emailPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  
  function forgetPassword() {
    if (!email) {
      toast.error("Vui lòng nhập email");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }
    
    startTransition(async () => {
      await authClient.forgetPassword.emailOtp({
        email: email,
        fetchOptions: {
          onSuccess: () => {
            toast.success("Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.");
            router.push(`/verify-request?email=${encodeURIComponent(email)}&type=forget-password`);
          },
          onError: (ctx) => {
            const errorMessage = ctx.error?.message || "Lỗi không xác định";
            if (errorMessage.includes("not found") || errorMessage.includes("không tồn tại")) {
              toast.error("Email này chưa được đăng ký trong hệ thống.");
            } else {
              toast.error("Lỗi không thể gửi Email/OTP. Vui lòng thử lại sau.");
            }
          },
        },
      });
    });
  }
  
  return (
    <div className="w-full">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại đăng nhập
      </Link>
      
      <Card className="w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
            <KeyRound className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">Quên mật khẩu?</CardTitle>
            <CardDescription className="text-base">
              Đừng lo lắng! Chúng tôi sẽ gửi mã xác minh OTP đến địa chỉ email của bạn để bạn có thể đặt lại mật khẩu.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Địa chỉ email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                placeholder="email@example.com"
                className="pl-10"
                disabled={emailPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !emailPending && email) {
                    forgetPassword();
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Nhập địa chỉ email đã đăng ký tài khoản của bạn
            </p>
          </div>

          <Button
            onClick={forgetPassword}
            disabled={emailPending || !email}
            className="w-full"
            size="lg"
          >
            {emailPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Đang gửi mã OTP...</span>
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Gửi mã OTP
              </>
            )}
          </Button>

          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <p className="font-medium mb-2">Lưu ý:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Mã OTP sẽ được gửi đến email của bạn</li>
              <li>Mã OTP có hiệu lực trong 10 phút</li>
              <li>Kiểm tra cả thư mục Spam nếu không thấy email</li>
            </ul>
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Nhớ mật khẩu? </span>
            <Link href="/login" className="text-primary hover:underline font-medium">
              Đăng nhập ngay
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
