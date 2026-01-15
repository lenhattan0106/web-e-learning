"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function deleteActivityLog(logId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await prisma.nhatKyXuLy.delete({
    where: { id: logId },
  });

  revalidatePath("/admin/activity-logs");
  return { success: true, message: "Đã xóa nhật ký" };
}