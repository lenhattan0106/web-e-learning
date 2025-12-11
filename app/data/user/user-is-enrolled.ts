import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

export async function checkIfCourseBought(courseId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user) return false;

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.user.id,
        courseId: courseId,
      },
    },
  });

  if (!enrollment) return false;

  // Tự động hủy enrollment "DangXuLy" quá 15 phút
  if (enrollment.status === "DangXuLy") {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    if (enrollment.createdAt < fifteenMinutesAgo) {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { status: "DaHuy" },
      });
      return false;
    }
    
    // Còn trong thời gian chờ → Coi như chưa mua
    return false;
  }

  // Chỉ return true nếu đã thanh toán
  return enrollment.status === "DaThanhToan";
}