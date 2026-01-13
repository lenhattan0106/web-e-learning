
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getCourseStructureTool = tool({
  description: "Lấy cấu trúc chi tiết (chương và bài học) của một khóa học. SỬ DỤNG KHI user hỏi: 'khóa học X có gì', 'nội dung khóa học', 'chương trình học', 'bài học trong khóa'.",
  inputSchema: z.object({
    courseNameOrSlug: z.string().describe("Tên hoặc slug của khóa học"),
  }),
  execute: async ({ courseNameOrSlug }) => {
    try {
      // Try to find by slug first (exact match), then by name (contains)
      let course = await prisma.khoaHoc.findUnique({
          where: { duongDan: courseNameOrSlug },
          include: { 
              chuongs: { 
                  orderBy: { thuTu: 'asc' },
                  include: { 
                      baiHocs: { 
                          orderBy: { thuTu: 'asc' },
                          select: { tenBaiHoc: true, mienPhi: true } 
                        } 
                    } 
                } 
            }
      });

      if (!course) {
          // Fallback to search by name
           course = await prisma.khoaHoc.findFirst({
              where: { tenKhoaHoc: { contains: courseNameOrSlug, mode: 'insensitive' } },
              include: { 
                chuongs: { 
                    orderBy: { thuTu: 'asc' },
                    include: { 
                        baiHocs: { 
                            orderBy: { thuTu: 'asc' },
                            select: { tenBaiHoc: true, mienPhi: true } 
                          } 
                      } 
                  } 
              }
           }) as any;
      }

      if (!course) {
          return { found: false, message: "Course not found." };
      }

      return {
          found: true,
          courseName: course.tenKhoaHoc,
          description: course.moTaNgan,
          totalChapters: course.chuongs.length,
          structure: course.chuongs.map(c => ({
              chapter: c.tenChuong,
              lessons: c.baiHocs.map(b => b.tenBaiHoc)
          }))
      };

    } catch (error) {
      console.error("Get course structure error:", error);
      return { error: "Failed to get course structure." };
    }
  },
});
