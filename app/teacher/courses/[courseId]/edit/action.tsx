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
import { generateUniqueSlug, slugify } from "@/lib/slug-utils";
import { embedKhoaHoc, embedBaiHoc } from "@/lib/ai/auto-embed";
import {
  notifyEnrolledStudents,
  NOTIFICATION_TEMPLATES,
} from "@/app/services/notification-service";

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

    // Kiểm tra trùng tiêu đề với các khóa học khác của cùng giáo viên
    const existed = await prisma.khoaHoc.findFirst({
      where: {
        tenKhoaHoc: result.data.tenKhoaHoc,
        idNguoiDung: user.user.id, // Check only teacher's own courses
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

    // Get current course data to detect status change
    const currentCourse = await prisma.khoaHoc.findUnique({
      where: { id: idKhoaHoc },
      select: {
        tenKhoaHoc: true,
        duongDan: true,
        trangThai: true,
        nguoiDung: { select: { name: true } },
      },
    });

    let slugToUse = result.data.duongDan; // Default to form value
    
    // If title changed, regenerate unique slug
    if (currentCourse && currentCourse.tenKhoaHoc !== result.data.tenKhoaHoc) {
      const baseSlug = slugify(result.data.tenKhoaHoc);
      slugToUse = await generateUniqueSlug(baseSlug, idKhoaHoc);
    }

    // Prepare update data
    const updateData: any = {
      tenKhoaHoc: result.data.tenKhoaHoc,
      moTa: result.data.moTa,
      tepKH: result.data.tepKH,
      gia: result.data.gia,
      thoiLuong: result.data.thoiLuong,
      moTaNgan: result.data.moTaNgan,
      duongDan: slugToUse, // Use auto-generated slug if title changed
    };

    // Handle Relations if IDs are present
    if (result.data.danhMuc) {
      const category = await prisma.danhMuc.findUnique({ where: { id: result.data.danhMuc } });
      if (category) {
        updateData.idDanhMuc = category.id;
        updateData.danhMuc = category.tenDanhMuc; // Legacy
      }
    }

    if (result.data.capDo) {
      const level = await prisma.capDo.findUnique({ where: { id: result.data.capDo } });
      if (level) {
        updateData.idCapDo = level.id;
        const mapLevel: Record<string, string> = {
          "NGUOI_MOI": "NguoiMoi",
          "TRUNG_CAP": "TrungCap",
          "NANG_CAO": "NangCao"
        };
        if (level.maCapDo && mapLevel[level.maCapDo]) {
           updateData.capDo = mapLevel[level.maCapDo] as any;
        }
      }
    }

    if (result.data.trangThai) {
      updateData.trangThai = result.data.trangThai as any;
    }

    const oldStatus = currentCourse?.trangThai;
    const newStatus = result.data.trangThai;
    const statusChanged = newStatus && oldStatus !== newStatus;

    await prisma.khoaHoc.update({
      where: {
        id: idKhoaHoc,
        idNguoiDung: user.user.id,
      },
      data: updateData,
    });

    // Send notifications if status changed
    if (statusChanged && newStatus) {
      if (newStatus === "BanLuuTru") {
        const template = NOTIFICATION_TEMPLATES.COURSE_ARCHIVED(result.data.tenKhoaHoc);
        await notifyEnrolledStudents({
          courseId: idKhoaHoc,
          title: template.title,
          message: template.message,
          metadata: {
            url: `/courses/${slugToUse}`,
            courseId: idKhoaHoc,
          },
        });
      } else if (newStatus === "BanChinhThuc") {
        const template = NOTIFICATION_TEMPLATES.COURSE_UPDATED(result.data.tenKhoaHoc);
        await notifyEnrolledStudents({
          courseId: idKhoaHoc,
          title: template.title,
          message: template.message,
          metadata: {
            url: `/courses/${slugToUse}`,
            courseId: idKhoaHoc,
          },
        });
      }
    }

    // Auto-update embedding for AI search
    embedKhoaHoc(
      idKhoaHoc,
      result.data.tenKhoaHoc,
      result.data.moTaNgan,
      result.data.moTa
    );

    revalidatePath(`/teacher/courses/${idKhoaHoc}/edit`);
    revalidatePath("/teacher/courses");

    return {
      status: "success",
      message: "Khóa học đã được cập nhật thành công",
    };
  } catch (error) {
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

    try {
        const courseInfo = await prisma.khoaHoc.findUnique({
            where: { id: result.data.idKhoaHoc },
            select: { tenKhoaHoc: true, duongDan: true }
        });

        if (courseInfo) {
            await notifyEnrolledStudents({
                courseId: result.data.idKhoaHoc,
                title: `Chương mới: ${result.data.ten}`,
                message: `Khóa học "${courseInfo.tenKhoaHoc}" vừa có thêm chương mới. Vào học ngay nhé!`,
                metadata: {
                    url: `/dashboard/${courseInfo.duongDan}`,
                    type: "NEW_CHAPTER",
                    courseId: result.data.idKhoaHoc
                }
            });
        }
    } catch(e) { console.error("Notify error:", e); }

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

    const createdLesson = await prisma.$transaction(async (tx) => {
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

      // Auto-generate embedding for AI search (async, non-blocking)
      embedBaiHoc(
        newLesson.id,
        result.data.ten,
        result.data.moTa
      );

      return newLesson;
    });

    try {
        const courseForNotify = await prisma.khoaHoc.findUnique({
            where: { id: result.data.idKhoaHoc },
            select: { tenKhoaHoc: true, duongDan: true }
        });

        if (courseForNotify) {
            await notifyEnrolledStudents({
                courseId: result.data.idKhoaHoc,
                title: `Bài học mới: ${result.data.ten}`,
                message: `Khóa học "${courseForNotify.tenKhoaHoc}" vừa có thêm bài học mới. Vào học ngay nhé!`,
                metadata: {
                    url: `/dashboard/${courseForNotify.duongDan}/${createdLesson.id}`,
                    type: "NEW_LESSON",
                    courseId: result.data.idKhoaHoc,
                    lessonId: createdLesson.id
                }
            });
        }
    } catch(e) { console.error("Notify error:", e); }

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

    const enrollmentCount = await prisma.dangKyHoc.count({
      where: {
        idKhoaHoc: idKhoaHoc,
        trangThai: "DaThanhToan"
      }
    });

    if (enrollmentCount > 0) {
      return {
        status: "error",
        message: `Không thể xóa bài học này vì khóa học đã có ${enrollmentCount} học viên đăng ký. Bạn chỉ có thể chỉnh sửa nội dung.`,
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

    const enrollmentCount = await prisma.dangKyHoc.count({
      where: {
        idKhoaHoc: idKhoaHoc,
        trangThai: "DaThanhToan"
      }
    });

    if (enrollmentCount > 0) {
      return {
        status: "error",
        message: `Không thể xóa chương này vì khóa học đã có ${enrollmentCount} học viên đăng ký. Bạn chỉ có thể chỉnh sửa nội dung.`,
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


export async function updateChapter(
  values: ChuongSchemaType,
  idChuong: string
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
        message: "Bạn không có quyền chỉnh sửa chương này",
      };
    }

    await prisma.chuong.update({
      where: {
        id: idChuong,
        idKhoaHoc: result.data.idKhoaHoc,
      },
      data: {
        tenChuong: result.data.ten,
      },
    });

    try {
      const courseInfo = await prisma.khoaHoc.findUnique({
        where: { id: result.data.idKhoaHoc },
        select: { tenKhoaHoc: true, duongDan: true }
      });
      if (courseInfo) {
        await notifyEnrolledStudents({
          courseId: result.data.idKhoaHoc,
          title: `Chương được cập nhật: ${result.data.ten}`,
          message: `Khóa học "${courseInfo.tenKhoaHoc}" vừa cập nhật tên chương. Xem ngay!`,
          metadata: {
            url: `/dashboard/${courseInfo.duongDan}`,
            type: "CHAPTER_UPDATE",
            courseId: result.data.idKhoaHoc,
            chapterId: idChuong
          }
        });
      }
    } catch(e) { console.error("Notify error:", e); }

    revalidatePath(`/teacher/courses/${result.data.idKhoaHoc}/edit`);
    return {
      status: "success",
      message: "Cập nhật tên chương thành công",
    };
  } catch {
    return {
      status: "error",
      message: "Lỗi khi cập nhật chương",
    };
  }
}

export async function updateLessonTitle(
  values: BaiHocSchemaType,
  idBaiHoc: string
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
        message: "Bạn không có quyền chỉnh sửa bài học này",
      };
    }

    await prisma.baiHoc.update({
      where: {
        id: idBaiHoc,
        idChuong: result.data.idChuong,
      },
      data: {
        tenBaiHoc: result.data.ten,
      },
    });

    try {
      const courseInfo = await prisma.khoaHoc.findUnique({
        where: { id: result.data.idKhoaHoc },
        select: { tenKhoaHoc: true, duongDan: true }
      });
      if (courseInfo) {
        await notifyEnrolledStudents({
          courseId: result.data.idKhoaHoc,
          title: `Bài học được cập nhật: ${result.data.ten}`,
          message: `Khóa học "${courseInfo.tenKhoaHoc}" vừa cập nhật tên bài học. Xem ngay!`,
          metadata: {
            url: `/dashboard/${courseInfo.duongDan}/${idBaiHoc}`,
            type: "LESSON_UPDATE",
            courseId: result.data.idKhoaHoc,
            lessonId: idBaiHoc
          }
        });
      }
    } catch(e) { console.error("Notify error:", e); }

    revalidatePath(`/teacher/courses/${result.data.idKhoaHoc}/edit`);
    return {
      status: "success",
      message: "Cập nhật tên bài học thành công",
    };
  } catch {
    return {
      status: "error",
      message: "Lỗi khi cập nhật bài học",
    };
  }
}
