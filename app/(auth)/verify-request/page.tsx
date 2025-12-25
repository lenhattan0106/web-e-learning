"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export default function VerifyRequest() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [emailPending, startTransition] = useTransition();
  const params = useSearchParams();
  const email = params.get('email') as string;
  const type = params.get('type'); // Kiểm tra type để biết đây là forget-password hay không
  const isOtpCompleted = otp.length === 6;

  function verifyOtp(){
    if (!email) {
      toast.error("Không tìm thấy email. Vui lòng thử lại từ đầu.");
      router.push("/forget-password");
      return;
    }

    startTransition(async ()=>{
        await authClient.emailOtp.checkVerificationOtp({
            email: email,
            otp: otp,
            type: type === "forget-password" ? "forget-password" : "email-verification",
            fetchOptions:{
                onSuccess:()=>{
                    if (type === "forget-password") {
                      // Lưu OTP đã verify vào sessionStorage (an toàn, chỉ tồn tại trong tab hiện tại)
                      const storageKey = `reset-password-otp-${email}`;
                      sessionStorage.setItem(storageKey, otp);
                      
                      toast.success('OTP đã được xác minh. Vui lòng nhập mật khẩu mới.');
                      // Redirect đến reset-password chỉ với email (KHÔNG có OTP trong URL)
                      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
                    } else {
                      // Nếu không phải forget-password, giữ nguyên flow cũ (redirect về trang chủ)
                    toast.success('Email đã được xác minh');
                    router.push("/");
                    }
                },
                onError:(ctx) => {
                    const errorMessage = ctx.error?.message?.toLowerCase() || "";
                    if (errorMessage.includes("invalid") || errorMessage.includes("không hợp lệ") || errorMessage.includes("expired")) {
                      toast.error('Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
                    } else {
                      toast.error('Lỗi khi xác minh Email/OTP. Vui lòng thử lại.');
                    }
                }
            }
        })
    })
  }
  return (
    <Card className="w-full mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Vui lòng kiểm tra email của bạn</CardTitle>
        <CardDescription>
          Chúng tôi đã gửi mã xác minh đến địa chỉ email của bạn. Vui lòng
          mở email và dán mã bên dưới.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-2">
          <InputOTP
            value={otp}
            onChange={(value) => setOtp(value)}
            maxLength={6}
            className="gap-2"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0}></InputOTPSlot>
              <InputOTPSlot index={1}></InputOTPSlot>
              <InputOTPSlot index={2}></InputOTPSlot>
            </InputOTPGroup>
            <InputOTPGroup>
              <InputOTPSlot index={3}></InputOTPSlot>
              <InputOTPSlot index={4}></InputOTPSlot>
              <InputOTPSlot index={5}></InputOTPSlot>
            </InputOTPGroup>
          </InputOTP>
          <p className="text-sm text-muted-foreground">Nhập mã 6 chữ số đã gửi đến email của bạn</p>
        </div>
        <Button onClick={verifyOtp} disabled={emailPending || !isOtpCompleted} className="w-full">
            {emailPending ? (
                <>
                <Loader2 className="size-4 animate-spin"></Loader2>
                <span>Đang tải... </span>
                </>
            ):("Xác minh tài khoản")}
        </Button>
      </CardContent>
    </Card>
  );
}
