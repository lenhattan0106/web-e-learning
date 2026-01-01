"use client";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { ArrowLeft, GithubIcon, Loader, LogInIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect, useRef } from "react";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [githubPending, startGithubTransition] = useTransition();
  const [passwordPending, startPassWordTransition] = useTransition();
  const hasShownToast = useRef(false);
  
  // Khởi tạo email từ URL params nếu có (khi user vừa verify email)
  const emailFromParams = params.get("email") || "";
  const [email, setEmail] = useState(emailFromParams);
  const [password, setPassWord] = useState("");

  // Kiểm tra nếu user vừa verify email và được redirect đến đây
  useEffect(() => {
    if (hasShownToast.current) return;
    
    const verified = params.get("verified");
    const alreadyVerified = params.get("already_verified");
    
    if (verified === "true") {
      hasShownToast.current = true;
      toast.success("Email đã được xác minh thành công! Bạn có thể đăng nhập ngay.", {
        duration: 5000,
      });
    } else if (alreadyVerified === "true") {
      hasShownToast.current = true;
      toast.info("Email này đã được xác minh trước đó. Bạn có thể đăng nhập ngay.", {
        duration: 5000,
      });
    }
  }, [params]);

  async function signInWithGithub() {
    startGithubTransition(async () => {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
        fetchOptions: {
          onSuccess: () => {
            toast.success(
              "Đăng nhập bằng Github thành công, bạn sẽ được chuyển hướng..."
            );
          },
          onError: () => {
            toast.error("Lỗi máy chủ nội bộ");
          },
        },
      });
    });
  }
  async function signInWithPassWord() {
    startPassWordTransition(async () => {
      await authClient.signIn.email({
        email: email, // required
        password: password, // required
        rememberMe: true,
        fetchOptions: {
          onSuccess: () => {
            toast.success("Đăng nhập thành công, bạn sẽ được chuyển hướng...");
            // Đợi một chút để session được set, sau đó redirect
            setTimeout(() => {
              router.push("/");
              router.refresh();
            }, 500);
          },
          onError: (ctx) => {
            // Xử lý lỗi khi email chưa được verify
            // Better-auth trả về status 403 với message cụ thể khi email chưa verify
            const errorMessage = ctx.error?.message?.toLowerCase() || "";
            const isEmailNotVerified = 
              ctx.error?.status === 403 && 
              ((errorMessage.includes("email") && errorMessage.includes("verify")) ||
              errorMessage.includes("email not verified") ||
              errorMessage.includes("email chưa được xác minh"));
            
            if (isEmailNotVerified) {
              toast.error("Email chưa được xác minh. Vui lòng kiểm tra email và click vào link xác minh.");
              router.push(`/verify-email?email=${encodeURIComponent(email)}`);
            } else if (ctx.error?.status === 403) {
              // Lỗi 403 khác (có thể là banned, invalid credentials, etc.)
              toast.error(ctx.error?.message || "Tài khoản của bạn không có quyền truy cập. Vui lòng liên hệ hỗ trợ.");
            } else {
              toast.error(ctx.error?.message || "Vui lòng kiểm tra lại mật khẩu và tài khoản của bạn");
            }
          },
        },
      });
    });
  }

  return (
    <div>
      <Link
              href="/"
              className={buttonVariants({
                variant: "outline",
                className: "absolute top-4 left-4",
              })}
            >
              <ArrowLeft className="size-4"></ArrowLeft>
              Quay lại
            </Link>
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Chào mừng trở lại</CardTitle>
        <CardDescription>
          Đăng nhập bằng tài khoản Github hoặc Email của bạn
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button
          disabled={githubPending}
          onClick={signInWithGithub}
          className="w-full"
          variant={"outline"}
        >
          {githubPending ? (
            <>
              <Loader className="size-4 animate-spin"></Loader>
              <span>Đang tải...</span>
            </>
          ) : (
            <>
              <GithubIcon className="size-4"></GithubIcon>
              Đăng nhập với Github
            </>
          )}
        </Button>
        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span className="relative z-10 bg-card px-2 text-muted-foreground">
            Hoặc tiếp tục với
          </span>
        </div>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              placeholder="email@example.com"
            ></Input>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Mật khẩu</Label>
            <Input
              value={password}
              onChange={(e) => setPassWord(e.target.value)}
              required
              type="password"
              placeholder="Vui lòng nhập mật khẩu của bạn"
            ></Input>
          </div>
          <Button
            disabled={passwordPending}
            onClick={signInWithPassWord}
            className="w-full"
            variant={"default"}
          >
            {passwordPending ? (
              <>
                <Loader className="size-4 animate-spin"></Loader>
                <span>Đang tải...</span>
              </>
            ) : (
              <>
                <LogInIcon className="size-4"></LogInIcon>
                Đăng nhập
              </>
            )}
          </Button>
        </div>
        <div className="flex items-center justify-center gap-2">
          <p>Bạn chưa có tài khoản?</p>
          <Link href="/signup" className="text-primary underline">
            Đăng ký
          </Link>
        </div>
        <div className="mx-auto"><Link href="/forget-password" className="text-primary underline mt-2">Quên mật khẩu</Link></div>
      </CardContent>
    </Card>
  </div>
  );
}
