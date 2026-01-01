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
import { Icon123 } from "@tabler/icons-react";
import { ArrowLeft, GithubIcon, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function SignUpForm() {
  const router = useRouter();
  const [githubPending, startGithubTransition] = useTransition();
  const [passwordPending, startPassWordTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassWord] = useState("");
  const [confirmPassword, setConfirmPassWord] = useState("");
  const [name, setName] = useState("");

  const passwordsMatch = password === confirmPassword;
  const canSubmit = !!email && !!password && passwordsMatch;

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

  async function signUpWithPassWord() {
    if (!canSubmit) {
      if (!passwordsMatch) {
        toast.error("Mật khẩu và xác nhận mật khẩu không khớp.");
      } else {
        toast.error("Vui lòng điền đầy đủ thông tin trước khi đăng ký.");
      }
      return;
    }

    startPassWordTransition(async () => {
      // Sử dụng avatar.vercel.sh dựa trên email người dùng
      const avatarUrl = `https://avatar.vercel.sh/${encodeURIComponent(email)}`;

      await authClient.signUp.email({
        name: name,
        email: email,
        password: password,
        image: avatarUrl,
        callbackURL: `/login?verified=true`,
        fetchOptions: {
          onSuccess: () => {
            toast.success("Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản.");
            // Redirect đến trang verify email
            router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          },
          onError: (ctx) => {
            // Better-auth sẽ tự động gửi verification email khi signup thành công
            // Nếu có lỗi, hiển thị thông báo
            const errorMessage = ctx.error?.message?.toLowerCase() || "";
            const isEmailExists = 
              (ctx.error?.status === 403 || ctx.error?.status === 400) &&
              (errorMessage.includes("email") && errorMessage.includes("already") ||
              errorMessage.includes("email") && errorMessage.includes("exists") ||
              errorMessage.includes("email") && errorMessage.includes("tồn tại") ||
              errorMessage.includes("email đã được sử dụng"));
            
            if (isEmailExists) {
              toast.error("Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác.");
              // Có thể redirect đến login page
              setTimeout(() => {
                router.push(`/login?email=${encodeURIComponent(email)}`);
              }, 2000);
            } else {
              toast.error(ctx.error?.message || "Lỗi đăng ký. Vui lòng kiểm tra lại thông tin.");
            }
          },
        },
      });
    });
  }

  return (
    <div>
      <Link
        href="/login"
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
          <CardTitle className="text-xl">
            Chào mừng đến với trang đăng ký
          </CardTitle>
          <CardDescription>Đăng nhập ký tài khoản</CardDescription>
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

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                type="text"
                placeholder="Tên của bạn"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                placeholder="email@example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                value={password}
                onChange={(e) => setPassWord(e.target.value)}
                required
                type="password"
                placeholder="Nhập mật khẩu"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Xác nhận lại mật khẩu</Label>
              <Input
                value={confirmPassword}
                onChange={(e) => setConfirmPassWord(e.target.value)}
                required
                type="password"
                placeholder="Nhập lại mật khẩu"
              />
              {!passwordsMatch && confirmPassword.length > 0 && (
                <p className="text-sm text-destructive">Mật khẩu không khớp.</p>
              )}
            </div>
          </div>

          <Button
            disabled={passwordPending || !canSubmit}
            onClick={signUpWithPassWord}
            className="w-full"
            variant={"default"}
          >
            {passwordPending ? (
              <span>Đang tải...</span>
            ) : (
              <>
                <UserPlus className="size-4"></UserPlus>
                Đăng ký tài khoản
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
