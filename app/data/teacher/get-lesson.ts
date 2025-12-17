import "server-only";

import { prisma } from "@/lib/db";
import { requireTeacher } from "./require-teacher";
import { redirect } from "next/navigation";

export async function TeacherGetLesson(id: string) {
  const session = await requireTeacher();

  const data = await prisma.baiHoc.findFirst({
    where: {
      id: id,
      chuong: {
        khoaHoc: {
          idNguoiDung: session.user.id, // Ensure teacher owns this course
        },
      },
    },
    select: {
      tenBaiHoc: true,
      maVideo: true,
      anhBaiHoc: true,
      moTa: true,
      id: true,
      thuTu: true,
      chuong: {
        select: {
          idKhoaHoc: true,
        },
      },
    },
  });

  if (!data) {
    redirect("/not-teacher");
  }

  return data;
}

export type TeacherLessonType = Awaited<ReturnType<typeof TeacherGetLesson>>;