
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getTeacherDashboardTool = tool({
  description: "Get a complete dashboard overview for a teacher in ONE Data Call. Returns statistics, revenue, recent enrollments, and course list. Use this for ANY general query like 'dashboard', 'my stats', 'overview', or 'how am I doing'.",
  inputSchema: z.object({
    instructorId: z.string().describe("The ID of the instructor."),
  }),
  execute: async ({ instructorId }) => {
    if (!instructorId || instructorId === 'guest') {
         return { error: "Auth required." };
    }

    try {
        // Fetch everything in parallel or smart query
        const courses = await prisma.khoaHoc.findMany({
            where: { idNguoiDung: instructorId },
            include: {
                dangKyHocs: {
                    include: { nguoiDung: { select: { name: true, email: true } } }
                }
            }
        });

        const totalCourses = courses.length;
        let totalStudents = 0;
        let totalRevenue = 0;
        const recentEnrollments: any[] = [];
        const courseSummary: any[] = [];

        for (const c of courses) {
            const paidEnrollments = c.dangKyHocs.filter(d => d.trangThai === 'DaThanhToan');
            const revenue = paidEnrollments.reduce((sum, d) => sum + d.soTien, 0);
            
            totalStudents += c.dangKyHocs.length; // Count all attempts or just paid? Let's count all for "students" but revenue for strictly paid.
            totalRevenue += revenue;

            courseSummary.push({
                title: c.tenKhoaHoc,
                students: c.dangKyHocs.length,
                revenue: revenue
            });

            // Collect recent paid students
            paidEnrollments.forEach(d => {
                recentEnrollments.push({
                    student: d.nguoiDung.name,
                    course: c.tenKhoaHoc,
                    date: d.ngayTao.toISOString().split('T')[0]
                });
            });
        }

        // Sort recent enrollments
        recentEnrollments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            overview: {
                totalCourses,
                totalStudents,
                totalRevenue
            },
            courses: courseSummary,
            recentActivity: recentEnrollments.slice(0, 5) // Top 5 recent
        };

    } catch (error) {
      console.error("Dashboard tool error:", error);
      return { error: "Failed to fetch dashboard." };
    }
  },
});
