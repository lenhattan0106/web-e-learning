"use server";

import { requireTeacher } from "@/app/data/teacher/require-teacher";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { updateLessonFormSchema } from "@/lib/zodSchemas";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

export async function EditLessonAction(
  values: unknown,
  idBaiHoc: string
): Promise<ApiResponse> {
  const session = await requireTeacher();

  try {
    const validation = updateLessonFormSchema.safeParse(values);
    if (!validation.success) {
      return {
        status: "error",
        message: "Dữ liệu không hợp lệ",
      };
    }

    // Verify ownership: ensure lesson belongs to a course of this teacher
    const lesson = await prisma.baiHoc.findFirst({
      where: {
        id: idBaiHoc,
        chuong: {
          khoaHoc: {
            idNguoiDung: session.user.id,
          },
        },
      },
      include: {
        chuong: {
          select: {
            idKhoaHoc: true,
          },
        },
      },
    });

    if (!lesson) {
      return {
        status: "error",
        message: "Bạn không có quyền chỉnh sửa bài học này",
      };
    }

    const data = validation.data;
    const updateData: Prisma.BaiHocUpdateInput = {};

    // map & chỉ gán khi khác giá trị hiện tại
    if (data.ten !== undefined && data.ten !== lesson.tenBaiHoc) {
      updateData.tenBaiHoc = data.ten;
    }
    if (data.moTa !== undefined && data.moTa !== lesson.moTa) {
      updateData.moTa = data.moTa;
    }
    if (data.maVideo !== undefined && data.maVideo !== lesson.maVideo) {
      updateData.maVideo = data.maVideo;
    }
    if (data.anhBaiHoc !== undefined && data.anhBaiHoc !== lesson.anhBaiHoc) {
      updateData.anhBaiHoc = data.anhBaiHoc;
    }

    // nếu không có gì để cập nhật → trả về no-op
    if (Object.keys(updateData).length === 0) {
      return {
        status: "success",
        message: "Không có thay đổi nào được cập nhật",
      };
    }

    await prisma.baiHoc.update({
      where: { id: idBaiHoc },
      data: updateData,
    });

    revalidatePath(`/teacher/courses/${lesson.chuong.idKhoaHoc}/edit`);

    return {
      status: "success",
      message: "Bài học đã được cập nhật",
    };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "Đã xảy ra lỗi khi cập nhật bài học",
    };
  }
}
