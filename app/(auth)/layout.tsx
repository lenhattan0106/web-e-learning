import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/public/logo e-learning.png"
import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center">
      <Link href="/" className={buttonVariants({
        variant:"outline",
        className:"absolute top-4 left-4"
      })}>
      <ArrowLeft className="size-4"></ArrowLeft>
      Quay lại
      </Link>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
         <Image src={Logo} alt="Logo" width={32} height={32}></Image>
           NT E-learning
        </Link>
        {children}
        <div className="text-balance text-center text-xs text-muted-foreground">
         Bằng cách nhấp tiếp tục, bạn đồng ý với <span className="hover:text-primary hover:underline">Điều khoản dịch vụ</span>{" "}
         và <span className="hover:text-primary hover:underline">Chính sách bảo mật</span> của chúng tôi.
        </div>
        </div>
    </div>
  );
}
