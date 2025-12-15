"use server";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { tr } from "zod/v4/locales";

export async function markLessonComplete(
  lessonId: string,
  slug:string
): Promise<ApiResponse> {
  const session = await requireUser();
  try {
    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: session.id,
          lessonId: lessonId,
        },
      },
      update:{
        completed:true,
      },
      create:{
        lessonId: lessonId,
        userId: session.id,
        completed:true
      }
    });
    revalidatePath(`/dashboard/${slug}`);
    return {
        status:"success",
        message:"Tiến trình đã được cập nhật"
    }
  } catch {
    return {
      status: "error",
      message: "Không thể đánh dấu hoàn thành khóa học",
    };
  }
}
