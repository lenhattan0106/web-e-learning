import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkBanStatus } from "@/app/data/user/check-ban-status";
import { DashboardLayoutClient } from "./_components/DashboardLayoutClient";
import { ReactNode } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  await checkBanStatus(session.user.id);

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
