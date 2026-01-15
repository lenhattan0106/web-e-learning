"use server";

import { requireTeacher } from "@/app/data/teacher/require-teacher";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { updateLessonFormSchema } from "@/lib/zodSchemas";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { generateEmbedding } from "@/lib/ai/embedding";
import { cleanText } from "@/lib/utils/clean";
import { recalculateCourseDuration } from "@/app/teacher/actions/courses";

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
    if (data.thoiLuong !== undefined && data.thoiLuong !== lesson.thoiLuong) {
      updateData.thoiLuong = data.thoiLuong;
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

    // Recalculate Course Duration if thoiLuong changed
    if (updateData.thoiLuong !== undefined) {
      await recalculateCourseDuration(lesson.chuong.idKhoaHoc);
    }

    if (updateData.moTa !== undefined) {
      try {
        const content = typeof updateData.moTa === 'string' ? updateData.moTa : "";
        const cleanedContent = cleanText(content);
        
        if (cleanedContent.length > 10) {
           const embedding = await generateEmbedding(cleanedContent);
           const vectorQuery = `[${embedding.join(",")}]`;
           
           await prisma.$executeRaw`
             UPDATE "baiHoc"
             SET embedding = ${vectorQuery}::vector
             WHERE id = ${idBaiHoc}
           `;
        }
      } catch (aiError) {
        console.error("Lỗi khi cập nhật embedding cho bài học:", aiError);
      }
    }

    // Only notify if there are meaningful content updates (Video, Name, Description)
    if (updateData.maVideo || updateData.tenBaiHoc || updateData.moTa) {
       try {
         // 1. Fetch enrolled students
         const enrollments = await prisma.dangKyHoc.findMany({
           where: { 
             idKhoaHoc: lesson.chuong.idKhoaHoc,
             trangThai: "DaThanhToan"
           },
           select: { idNguoiDung: true }
         });

         if (enrollments.length > 0) {
           // 2. Prepare course info for deep link
           const courseInfo = await prisma.khoaHoc.findUnique({
             where: { id: lesson.chuong.idKhoaHoc },
             select: { duongDan: true, tenKhoaHoc: true }
           });

           if (courseInfo) {
              // 3. Bulk Create Notifications
              await prisma.thongBao.createMany({
                data: enrollments.map(enrollment => ({
                  tieuDe: `Cập nhật: ${courseInfo.tenKhoaHoc}`,
                  noiDung: `Bài học "${updateData.tenBaiHoc || lesson.tenBaiHoc}" vừa được cập nhật nội dung mới.`,
                  loai: "HE_THONG", // System notification for students
                  idNguoiDung: enrollment.idNguoiDung,
                  metadata: {
                    type: "LESSON_UPDATE",
                    courseId: lesson.chuong.idKhoaHoc,
                    lessonId: idBaiHoc,
                    path: `/dashboard/${courseInfo.duongDan}/${idBaiHoc}` // Direct link to lesson
                  }
                }))
              });
           }
         }
       } catch (notifyError) {
         console.error("Failed to notify students:", notifyError);
       }
    }

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
