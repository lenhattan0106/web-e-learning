import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkBanStatus } from "@/app/data/user/check-ban-status";
import { TeacherLayoutClient } from "./_components/TeacherLayoutClient";
import { ReactNode } from "react";

export default async function TeacherLayout({
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

  return <TeacherLayoutClient>{children}</TeacherLayoutClient>;
}

