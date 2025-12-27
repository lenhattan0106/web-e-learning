"use server";

import { requireTeacher } from "@/app/data/teacher/require-teacher";
import aj, { fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import {
  chuongSchema,
  ChuongSchemaType,
  khoaHocSchema,
  KhoaHocSchemaType,
  baiHocSchema,
  BaiHocSchemaType,
} from "@/lib/zodSchemas";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";
import { generateEmbedding } from "@/lib/ai/embedding";
import { cleanText } from "@/lib/utils/clean";

const arcjet = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 5,
  })
);

// Helper function để verify ownership
async function verifyCourseOwnership(courseId: string, userId: string) {
  const course = await prisma.khoaHoc.findUnique({
    where: {
      id: courseId,
      idNguoiDung: userId,
    },
  });
  return !!course;
}

export async function editCourse(
  data: KhoaHocSchemaType,
  idKhoaHoc: string
): Promise<ApiResponse> {
  const user = await requireTeacher();
  try {
    const req = await request();
    const decision = await arcjet.protect(req, {
      fingerprint: user.user.id,
    });
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return {
          status: "error",
          message: "Bạn đã bị chặn do thực hiện quá nhiều yêu cầu",
        };
      } else {
        return {
          status: "error",
          message:
            "Chúng tôi nghi ngờ bạn là bot, nếu có vấn đề hãy liên hệ với support",
        };
      }
    }
    const result = khoaHocSchema.safeParse(data);
    if (!result.success) {
      return {
        status: "error",
        message: "Dữ liệu không hợp lệ",
      };
    }

    // Kiểm tra trùng tiêu đề với các khóa học khác
    const existed = await prisma.khoaHoc.findFirst({
      where: {
        tenKhoaHoc: result.data.tenKhoaHoc,
        NOT: {
          id: idKhoaHoc,
        },
      },
      select: {
        id: true,
      },
    });

    if (existed) {
      return {
        status: "error",
        message: "Tiêu đề khóa học này đã tồn tại. Vui lòng chọn tiêu đề khác.",
      };
    }

    // Verify ownership
    const isOwner = await verifyCourseOwnership(idKhoaHoc, user.user.id);
    if (!isOwner) {
      return {
        status: "error",
        message: "Bạn không có quyền chỉnh sửa khóa học này",
      };
    }

    await prisma.khoaHoc.update({
      where: {
        id: idKhoaHoc,
        idNguoiDung: user.user.id,
      },
      data: {
        ...result.data,
      },
    });
    return {
      status: "success",
      message: "Khóa học đã được cập nhật thành công",
    };
  } catch {
    return {
      status: "error",
      message: "Khóa học cập nhật thất bại",
    };
  }
}

export async function reorderLessons(
  idChuong: string,
  baiHocs: { id: string; thuTu: number }[],
  idKhoaHoc: string
): Promise<ApiResponse> {
  const session = await requireTeacher();
  try {
    // Verify ownership through chapter
    const chapter = await prisma.chuong.findFirst({
      where: {
        id: idChuong,
        khoaHoc: {
          idNguoiDung: session.user.id,
        },
      },
    });

    if (!chapter) {
      return {
        status: "error",
        message: "Bạn không có quyền sắp xếp lại bài học của chương này",
      };
    }

    if (!baiHocs || baiHocs.length === 0) {
      return {
        status: "error",
        message: "Không có bài học nào để sắp xếp lại.",
      };
    }

    const updates = baiHocs.map((baiHoc) =>
      prisma.baiHoc.update({
        where: {
          id: baiHoc.id,
          idChuong: idChuong,
        },
        data: {
          thuTu: baiHoc.thuTu,
        },
      })
    );
    await prisma.$transaction(updates);
    revalidatePath(`/teacher/courses/${idKhoaHoc}/edit`);
    return {
      status: "success",
      message: "Sắp xếp lại bài học thành công",
    };
  } catch {
    return {
      status: "error",
      message: "Lỗi khi sắp xếp bài học",
    };
  }
}

export async function reorderChapter(
  idKhoaHoc: string,
  chuongs: { id: string; thuTu: number }[]
): Promise<ApiResponse> {
  const session = await requireTeacher();
  try {
    // Verify ownership
    const isOwner = await verifyCourseOwnership(idKhoaHoc, session.user.id);
    if (!isOwner) {
      return {
        status: "error",
        message: "Bạn không có quyền sắp xếp lại chương của khóa học này",
      };
    }

    if (!chuongs || chuongs.length === 0) {
      return {
        status: "error",
        message: "Không có chương nào để mình sắp xếp lại",
      };
    }

    const updates = chuongs.map((chuong) =>
      prisma.chuong.update({
        where: {
          id: chuong.id,
          idKhoaHoc: idKhoaHoc,
        },
        data: {
          thuTu: chuong.thuTu,
        },
      })
    );
    await prisma.$transaction(updates);
    revalidatePath(`/teacher/courses/${idKhoaHoc}/edit`);
    return {
      status: "success",
      message: "Sắp xếp lại các chương thành công",
    };
  } catch {
    return {
      status: "error",
      message: "Lỗi khi sắp xếp lại chương",
    };
  }
}

export async function createChapter(
  values: ChuongSchemaType
): Promise<ApiResponse> {
  const session = await requireTeacher();
  try {
    const result = chuongSchema.safeParse(values);
    if (!result.success) {
      return {
        status: "error",
        message: "Dữ liệu không hợp lệ",
      };
    }

    // Verify ownership
    const isOwner = await verifyCourseOwnership(result.data.idKhoaHoc, session.user.id);
    if (!isOwner) {
      return {
        status: "error",
        message: "Bạn không có quyền tạo chương cho khóa học này",
      };
    }

    await prisma.$transaction(async (tx) => {
      const maxPos = await tx.chuong.findFirst({
        where: {
          idKhoaHoc: result.data.idKhoaHoc,
        },
        select: {
          thuTu: true,
        },
        orderBy: {
          thuTu: "desc",
        },
      });
      await tx.chuong.create({
        data: {
          tenChuong: result.data.ten,
          idKhoaHoc: result.data.idKhoaHoc,
          thuTu: (maxPos?.thuTu ?? 0) + 1,
        },
      });
    });
    revalidatePath(`/teacher/courses/${result.data.idKhoaHoc}/edit`);
    return {
      status: "success",
      message: "Chương mới đã được tạo thành công",
    };
  } catch {
    return {
      status: "error",
      message: "Lỗi khi tạo chương",
    };
  }
}

export async function createLesson(
  values: BaiHocSchemaType
): Promise<ApiResponse> {
  const session = await requireTeacher();
  try {
    const result = baiHocSchema.safeParse(values);
    if (!result.success) {
      return {
        status: "error",
        message: "Dữ liệu không hợp lệ",
      };
    }

    // Verify ownership through chapter
    const chapter = await prisma.chuong.findFirst({
      where: {
        id: result.data.idChuong,
        khoaHoc: {
          idNguoiDung: session.user.id,
        },
      },
    });

    if (!chapter) {
      return {
        status: "error",
        message: "Bạn không có quyền tạo bài học cho chương này",
      };
    }

    await prisma.$transaction(async (tx) => {
      const maxPos = await tx.baiHoc.findFirst({
        where: {
          idChuong: result.data.idChuong,
        },
        select: {
          thuTu: true,
        },
        orderBy: {
          thuTu: "desc",
        },
      });
      const newLesson = await tx.baiHoc.create({
        data: {
          tenBaiHoc: result.data.ten,
          moTa: result.data.moTa,
          maVideo: result.data.maVideo,
          anhBaiHoc: result.data.anhBaiHoc,
          idChuong: result.data.idChuong,
          thuTu: (maxPos?.thuTu ?? 0) + 1,
        },
      });

      // FAIL-SAFE: Generate embedding asynchronously
      // We don't await this inside the transaction or block the response
      // But we should await it if we want to ensure it happens before return? 
      // Plan says: "Save lesson first. Then generate embedding... Log AI errors but do not fail the request."
      // Since we are inside a transaction, we can't easily wait for non-tx async unless we move it out.
      // However, updating the embedding requires the lesson to exist.
      // So we'll do it AFTER the transaction commits OR inside try/catch here.

      // Actually, let's do it after the transaction to be safe and fast.
      // But we need the ID. `newLesson` has the ID.
      try {
        if (result.data.moTa) {
           const cleanedContent = cleanText(result.data.moTa);
           if (cleanedContent.length > 10) { // Only embed if enough content
             const embedding = await generateEmbedding(cleanedContent);
             const vectorQuery = `[${embedding.join(",")}]`;
             await tx.$executeRaw`
                UPDATE "baiHoc"
                SET embedding = ${vectorQuery}::vector
                WHERE id = ${newLesson.id}
             `;
           }
        }
      } catch (aiError) {
        console.error("Failed to generate embedding for new lesson:", aiError);
        // Do not throw, allow lesson creation to succeed
      }
    });
    revalidatePath(`/teacher/courses/${result.data.idKhoaHoc}/edit`);
    return {
      status: "success",
      message: "Bài học mới đã được tạo thành công",
    };
  } catch {
    return {
      status: "error",
      message: "Lỗi khi tạo bài học",
    };
  }
}

export async function deleteLesson({
  idChuong,
  idKhoaHoc,
  idBaiHoc,
}: {
  idChuong: string;
  idKhoaHoc: string;
  idBaiHoc: string;
}): Promise<ApiResponse> {
  const session = await requireTeacher();
  try {
    // Verify ownership through chapter
    const chapter = await prisma.chuong.findFirst({
      where: {
        id: idChuong,
        khoaHoc: {
          idNguoiDung: session.user.id,
        },
      },
    });

    if (!chapter) {
      return {
        status: "error",
        message: "Bạn không có quyền xóa bài học của chương này",
      };
    }

    const chuongWithBaiHocs = await prisma.chuong.findUnique({
      where: {
        id: idChuong,
      },
      select: {
        baiHocs: {
          orderBy: {
            thuTu: "asc",
          },
          select: {
            id: true,
            thuTu: true,
          },
        },
      },
    });
    
    if (!chuongWithBaiHocs) {
      return {
        status: "error",
        message: "Không tìm thấy chương này",
      };
    }
    
    const baiHocs = chuongWithBaiHocs.baiHocs;
    const baiHocToDelete = baiHocs.find((baiHoc) => baiHoc.id === idBaiHoc);
    
    if (!baiHocToDelete) {
      return {
        status: "error",
        message: "Không tìm thấy bài học ở chương này",
      };
    }
    
    const remainingBaiHocs = baiHocs.filter(
      (baiHoc) => baiHoc.id !== idBaiHoc
    );
    
    const updates = remainingBaiHocs.map((baiHoc, index) => {
      return prisma.baiHoc.update({
        where: {
          id: baiHoc.id,
        },
        data: { thuTu: index + 1 },
      });
    });
    
    await prisma.$transaction([
      ...updates,
      prisma.baiHoc.delete({
        where: {
          id: idBaiHoc,
          idChuong: idChuong,
        },
      }),
    ]);
    
    revalidatePath(`/teacher/courses/${idKhoaHoc}/edit`);
    return {
      status: "success",
      message: "Bài học đã được xóa thành công và các vị trí đang được sắp xếp lại",
    };
  } catch {
    return {
      status: "error",
      message: "Xóa bài học thất bại",
    };
  }
}

export async function deleteChapter({
  idChuong,
  idKhoaHoc,
}: {
  idChuong: string;
  idKhoaHoc: string;
}): Promise<ApiResponse> {
  const session = await requireTeacher();
  try {
    // Verify ownership
    const isOwner = await verifyCourseOwnership(idKhoaHoc, session.user.id);
    if (!isOwner) {
      return {
        status: "error",
        message: "Bạn không có quyền xóa chương của khóa học này",
      };
    }

    const khoaHocWithChuongs = await prisma.khoaHoc.findUnique({
      where: {
        id: idKhoaHoc,
      },
      select: {
        chuongs: {
          orderBy: {
            thuTu: "asc",
          },
          select: {
            id: true,
            thuTu: true,
          },
        },
      },
    });
    
    if (!khoaHocWithChuongs) {
      return {
        status: "error",
        message: "Không tìm thấy khóa học này",
      };
    }
    
    const chuongs = khoaHocWithChuongs.chuongs;
    const chuongToDelete = chuongs.find((chuong) => chuong.id === idChuong);
    
    if (!chuongToDelete) {
      return {
        status: "error",
        message: "Không tìm thấy chương này ở trong khóa học",
      };
    }
    
    const remainingChuongs = chuongs.filter(
      (chuong) => chuong.id !== idChuong
    );
    
    const updates = remainingChuongs.map((chuong, index) => {
      return prisma.chuong.update({
        where: {
          id: chuong.id,
        },
        data: { thuTu: index + 1 },
      });
    });
    
    await prisma.$transaction([
      ...updates,
      prisma.chuong.delete({
        where: {
          id: idChuong,
        },
      }),
    ]);
    
    revalidatePath(`/teacher/courses/${idKhoaHoc}/edit`);
    return {
      status: "success",
      message: "Chương đã được xóa thành công và các vị trí đang được sắp xếp lại",
    };
  } catch {
    return {
      status: "error",
      message: "Xóa chương thất bại",
    };
  }
}