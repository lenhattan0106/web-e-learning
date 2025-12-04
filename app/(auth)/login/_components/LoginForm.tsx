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
import { GithubIcon, Loader, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const [githubPending, startGithubTransition] = useTransition();
  const [emailPending, startEmailTransition] = useTransition();
  const [email, setEmail] = useState("");
  
  async function signInWithGithub() {
    startGithubTransition(async () => {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
        fetchOptions: {
          onSuccess: () => {
            toast.success("Đăng nhập bằng Github thành công, bạn sẽ được chuyển hướng...");
          },
          onError: () => {
            toast.error("Lỗi máy chủ nội bộ");
          },
        },
      });
    });
  }
  
  function signInWithEmail() {
    startEmailTransition(async () => {
      await authClient.emailOtp.sendVerificationOtp({
        email: email,
        type: "sign-in",
        fetchOptions: {
          onSuccess: () => {
            toast.success("Email đã được gửi");
            router.push(`/verify-request?email=${email}`);
          },
          onError: ()=>{
            toast.error('Lỗi khi gửi email')
          }
        },
      });
    });
  }
  
  return (
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
          <Button onClick={signInWithEmail} disabled={emailPending}>
            {emailPending ?(
              <>
                <Loader2 className="size-4 animate-spin"></Loader2>
                <span>Đang tải...</span>
               </>
            ):(
              <>
               <Send className="size-4"></Send>
               <span>Tiếp tục với Email</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
