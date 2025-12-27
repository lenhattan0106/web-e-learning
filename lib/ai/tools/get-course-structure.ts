
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getCourseStructureTool = tool({
  description: "Get the detailed structure (chapters and lessons) of a specific course. Use this when user asks 'what is in course X' or 'show me the curriculum of X'.",
  inputSchema: z.object({
    courseNameOrSlug: z.string().describe("The name or slug of the course to find."),
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
