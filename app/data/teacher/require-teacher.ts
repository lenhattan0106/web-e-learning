import "server-only";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export const requireTeacher = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/login");
  }

  // Chỉ cho phép teacher và admin (admin có thể impersonate nếu cần)
  if (session.user.role !== "teacher" && session.user.role !== "admin") {
    return redirect("/not-teacher");
  }

  return session;
});