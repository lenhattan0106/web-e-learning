"use server";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function markLessonComplete(
  idBaiHoc: string,
  duongDan: string
): Promise<ApiResponse> {
  const session = await requireUser();
  try {
    await prisma.tienTrinhHoc.upsert({
      where: {
        idNguoiDung_idBaiHoc: {
          idNguoiDung: session.id,
          idBaiHoc: idBaiHoc,
        },
      },
      update: {
        hoanThanh: true,
      },
      create: {
        idBaiHoc: idBaiHoc,
        idNguoiDung: session.id,
        hoanThanh: true,
      },
    });
    revalidatePath(`/dashboard/${duongDan}`);
    return {
      status: "success",
      message: "Tiến trình đã được cập nhật",
    };
  } catch {
    return {
      status: "error",
      message: "Không thể đánh dấu hoàn thành khóa học",
    };
  }
}
