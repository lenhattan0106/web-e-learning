
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getMyCoursesTool = tool({
  description: "List courses created by the current instructor. Use this when a teacher asks 'list my courses' or 'what am I teaching'.",
  inputSchema: z.object({
    instructorId: z.string().describe("The ID of the instructor."),
  }),
  execute: async ({ instructorId }) => {
    try {
      const courses = await prisma.khoaHoc.findMany({
        where: { idNguoiDung: instructorId },
        select: { tenKhoaHoc: true, trangThai: true, gia: true, _count: { select: { dangKyHocs: true } } }
      });

      return courses.map(c => ({
          title: c.tenKhoaHoc,
          status: c.trangThai,
          price: c.gia,
          students: c._count.dangKyHocs
      }));
    } catch (error) {
      console.error("Get my courses error:", error);
      return { error: "Failed to list courses." };
    }
  },
});
