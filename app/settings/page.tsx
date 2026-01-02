  import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SettingsForm } from "./_components/SettingsForm";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkBanStatus } from "@/app/data/user/check-ban-status";

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }


  await checkBanStatus(session.user.id);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8 max-w-5xl">
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link 
              href="/" 
              className="hover:text-foreground transition-colors"
            >
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Cài đặt</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <SettingsIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Cài đặt tài khoản</h1>
                  <p className="text-muted-foreground">
                    Quản lý thông tin cá nhân và cài đặt tài khoản của bạn
                  </p>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Settings Form */}
        <SettingsForm user={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? null,
        }} />
      </div>
    </div>
  );
}

