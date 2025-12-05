"use server";

import { requireAdmin } from "@/app/data/admin/required-admin";
import aj, { detectBot, fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import {
  chapterSchema,
  ChapterSchemaType,
  courseSchema,
  CourseSchemaType,
  lessonSchema,
  LessonSchemaType,
} from "@/lib/zodSchemas";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";
import { title } from "process";

const arcjet = aj
  .withRule(
    detectBot({
      mode: "LIVE",
      allow: [],
    })
  )
  .withRule(
    fixedWindow({
      mode: "LIVE",
      window: "1m",
      max: 5,
    })
  );
export async function editCourse(
  data: CourseSchemaType,
  courseId: string
): Promise<ApiResponse> {
  const user = await requireAdmin();
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
    const result = courseSchema.safeParse(data);
    if (!result.success) {
      return {
        status: "error",
        message: "Dữ liệu không hợp lệ",
      };
    }
    await prisma.course.update({
      where: {
        id: courseId,
        userId: user.user.id,
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
  chapterId: string,
  lesson: { id: string; position: number }[],
  courseId: string
): Promise<ApiResponse> {
  await requireAdmin();
  try {
    if (!lesson || lesson.length === 0) {
      return {
        status: "error",
        message: "Không có bài học nào để sắp xếp lại.",
      };
    }
    const updates = lesson.map((lesson) =>
      prisma.lesson.update({
        where: {
          id: lesson.id,
          chapterId: chapterId,
        },
        data: {
          position: lesson.position,
        },
      })
    );
    await prisma.$transaction(updates);
    revalidatePath(`/admin/courses/${courseId}/edit`);
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
  courseId: string,
  chapters: { id: string; position: number }[]
): Promise<ApiResponse> {
  await requireAdmin();
  try {
    if (!chapters || chapters.length === 0) {
      return {
        status: "error",
        message: "Không có chương nào để mình sắp xếp lại",
      };
    }
    const updates = chapters.map((chapter) =>
      prisma.chapter.update({
        where: {
          id: chapter.id,
          courseId: courseId,
        },
        data: {
          position: chapter.position,
        },
      })
    );
    await prisma.$transaction(updates);
    revalidatePath(`/admin/courses/${courseId}/edit`);
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
  values: ChapterSchemaType
): Promise<ApiResponse> {
  await requireAdmin();
  try {
    const result = chapterSchema.safeParse(values);
    if (!result.success) {
      return {
        status: "error",
        message: "Dữ liệu không hợp lệ",
      };
    }
    await prisma.$transaction(async (tx) => {
      const maxPos = await tx.chapter.findFirst({
        where: {
          courseId: result.data.courseId,
        },
        select: {
          position: true,
        },
        orderBy: {
          position: "desc",
        },
      });
      await tx.chapter.create({
        data: {
          title: result.data.name,
          courseId: result.data.courseId,
          position: (maxPos?.position ?? 0) + 1,
        },
      });
    });
    revalidatePath(`/admin/courses/${result.data.courseId}/edit`);
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
  values: LessonSchemaType
): Promise<ApiResponse> {
  await requireAdmin();
  try {
    const result = lessonSchema.safeParse(values);
    if (!result.success) {
      return {
        status: "error",
        message: "Dữ liệu không hợp lệ",
      };
    }
    await prisma.$transaction(async (tx) => {
      const maxPos = await tx.lesson.findFirst({
        where: {
          chapterId: result.data.chapterId,
        },
        select: {
          position: true,
        },
        orderBy: {
          position: "desc",
        },
      });
      await tx.lesson.create({
        data: {
          title: result.data.name,
          description: result.data.description,
          videoKey: result.data.videoKey,
          thumbnailKey: result.data.thumbnailKey,
          chapterId: result.data.chapterId,
          position: (maxPos?.position ?? 0) + 1,
        },
      });
    });
    revalidatePath(`/admin/courses/${result.data.courseId}/edit`);
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
  chapterId,
  courseId,
  lessonId,
}: {
  chapterId: string;
  courseId: string;
  lessonId: string;
}): Promise<ApiResponse> {
  await requireAdmin();
  try {
    const chapterWithLessons = await prisma.chapter.findUnique({
      where: {
        id: chapterId,
      },
      select: {
        lessons: {
          orderBy: {
            position: "asc",
          },
          select: {
            id: true,
            position: true,
          },
        },
      },
    });
    if (!chapterWithLessons) {
      return {
        status: "error",
        message: "Không tìm thấy chương này",
      };
    }
    const lessons = chapterWithLessons.lessons;
    const lessonToDelete = lessons.find((lesson) => lesson.id === lessonId);
    if (!lessonToDelete) {
      return {
        status: "error",
        message: "Không tìm thấy bài học ở chương này",
      };
    }
    const remainingLesssons = lessons.filter(
      (lesson) => lesson.id !== lessonId
    );
    const updates = remainingLesssons.map((lesson, index) => {
      return prisma.lesson.update({
        where: {
          id: lesson.id,
        },
        data: { position: index + 1 },
      });
    });
    await prisma.$transaction([
      ...updates,
      prisma.lesson.delete({
        where: {
          id: lessonId,
          chapterId: chapterId,
        },
      }),
    ]);
    revalidatePath(`/admin/courses/${courseId}/edit`);
    return {
      status:"success",
      message:"Bài học đã được xóa thành công và các vị trí đang được sắp xếp lại"
    }
  } catch {
    return {
      status: "error",
      message: "Xóa bài học thất bại",
    };
  }
}

export async function deleteChapter({
  chapterId,
  courseId,
}: {
  chapterId: string;
  courseId: string;
}): Promise<ApiResponse> {
  await requireAdmin();
  try {
    const courseWithChapter = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
       chapter: {
        orderBy:{
          position:"asc",
        },
        select:{
          id:true,
          position:true,
        }
       }
      },
    });
    if (!courseWithChapter) {
      return {
        status: "error",
        message: "Không tìm thấy khóa học này",
      };
    }
    const chapters = courseWithChapter.chapter;
    const chapterToDelete = chapters.find((chapter) => chapter.id === chapterId);
    if (!chapterToDelete) {
      return {
        status: "error",
        message: "Không tìm thấy chương này ở trong khóa học",
      };
    }
    const remainingChapters = chapters.filter(
      (chapter) => chapter.id !== chapterId
    );
    const updates = remainingChapters.map((chapter, index) => {
      return prisma.chapter.update({
        where: {
          id: chapter.id,
        },
        data: { position: index + 1 },
      });
    });
    await prisma.$transaction([
      ...updates,
      prisma.chapter.delete({
        where: {
          id: chapterId,
        },
      }),
    ]);
    revalidatePath(`/admin/courses/${courseId}/edit`);
    return {
      status:"success",
      message:"Chương đã được xóa thành công và các vị trí đang được sắp xếp lại"
    }
  } catch {
    return {
      status: "error",
      message: "Xóa chương thất bại",
    };
  }
}