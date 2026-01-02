import "server-only";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function checkCourseOwnership(courseId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { canEdit: false, reason: "NOT_AUTHENTICATED" };
  }

  const course = await prisma.khoaHoc.findUnique({
    where: { id: courseId },
    select: { idNguoiDung: true },
  });

  if (!course) {
    return { canEdit: false, reason: "COURSE_NOT_FOUND" };
  }

  const isOwner = course.idNguoiDung === session.user.id;
  const isTeacher = session.user.role === "teacher";
  return {
    canEdit: isOwner && isTeacher,
    reason: !isOwner ? "NOT_OWNER" : !isTeacher ? "NOT_TEACHER" : "OK",
  };
}
