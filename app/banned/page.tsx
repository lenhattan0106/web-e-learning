import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Ban, CalendarClock, Mail, ShieldAlert, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/public/logo e-learning.png";
import { HeaderNotification } from "@/components/notifications";
import { ThemeToggle } from "@/components/ui/themeToggle";
import { UserMenu } from "@/components/shared/UserMenu";
import { Button } from "@/components/ui/button";
import {
  Card
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { BannedListener } from "./_components/BannedListener";

export default async function BannedPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // ... (existing code for fetching user)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      banned: true,
      banReason: true,
      banExpires: true,
      image: true,
      name: true,
      email: true,
    },
  });

  // If not banned, redirect to home
  if (!user?.banned) {
    redirect("/");
  }

  // Check if ban has expired
  if (user.banExpires && new Date() > user.banExpires) {
    // Auto-unban
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        banned: false,
        banReason: null,
        banExpires: null,
      },
    });
    redirect("/");
  }

  const isPermanent = !user.banExpires;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <BannedListener userId={session.user.id} />
      {/* Facebook-like Header */}

      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-4">
          <Link href="/" className="mr-6 flex items-center gap-2">
            <Image src={Logo} alt="Logo" width={32} height={32} className="rounded-md" />
            <span className="font-bold text-lg hidden md:inline-block">NT E-Learning</span>
          </Link>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <HeaderNotification />
            <ThemeToggle />
            <UserMenu variant="dashboard" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl overflow-hidden grid md:grid-cols-5 shadow-xl border-destructive/20">
          {/* Left Side - Visual */}
          <div className="md:col-span-2 bg-gradient-to-br from-destructive/5 to-orange-50/50 dark:from-destructive/10 dark:to-orange-950/20 p-8 flex flex-col items-center justify-center text-center space-y-4 border-b md:border-b-0 md:border-r border-destructive/10">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-2 animate-in zoom-in duration-500">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-destructive">Tài khoản bị khóa</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Quyền truy cập của bạn đã bị tạm ngưng do vi phạm tiêu chuẩn cộng đồng.
              </p>
            </div>
          </div>

          {/* Right Side - Details */}
          <div className="md:col-span-3 p-6 md:p-8 flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-destructive font-medium">
                  <Ban className="h-4 w-4" />
                  <span>Lý do khóa</span>
                </div>
                <div className="p-3 bg-destructive/5 rounded-lg text-sm text-foreground/90 border border-destructive/10">
                  {user.banReason || "Vi phạm quy định hệ thống"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                    <CalendarClock className="h-4 w-4" />
                    <span>Thời hạn</span>
                  </div>
                  <p className="text-sm font-medium pl-6">
                    {isPermanent ? "Vĩnh viễn" : new Date(user.banExpires!).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                 <div className="space-y-1.5">
                   <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                    <LogOut className="h-4 w-4" />
                    <span>Hiệu lực</span>
                  </div>
                  <p className="text-sm font-medium pl-6">
                     {isPermanent ? "Không thời hạn" : "Tạm thời"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground text-center">
                Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ đến email:
              </p>
              <div className="flex justify-center">
                <p className="font-semibold text-foreground bg-muted py-2 px-4 rounded-md border text-sm select-all">
                  tanlienthuy1@gmail.com
                </p>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
