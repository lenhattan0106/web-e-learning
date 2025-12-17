import "server-only";
import { prisma } from "@/lib/db";
import { requireTeacher } from "./require-teacher";

export async function teacherGetDashBoardStatus() {
  const session = await requireTeacher();

  // Thống kê chỉ cho courses của teacher này
  const [totalRevenue, totalUsers, totalCourses, totalLessons] = await Promise.all([
    // Tổng doanh thu từ courses của teacher
    prisma.dangKyHoc.aggregate({
      where: {
        khoaHoc: {
          idNguoiDung: session.user.id,
        },
        trangThai: "DaThanhToan",
      },
      _sum: {
        soTien: true,
      },
    }),

    // Số lượng users đã mua courses của teacher
    prisma.user.count({
      where: {
        dangKyHocs: {
          some: {
            khoaHoc: {
              idNguoiDung: session.user.id,
            },
            trangThai: "DaThanhToan",
          },
        },
      },
    }),

    // Tổng số courses của teacher
    prisma.khoaHoc.count({
      where: {
        idNguoiDung: session.user.id,
      },
    }),

    // Tổng số lessons trong tất cả courses của teacher
    prisma.baiHoc.count({
      where: {
        chuong: {
          khoaHoc: {
            idNguoiDung: session.user.id,
          },
        },
      },
    }),
  ]);

  return {
    totalRevenue: totalRevenue._sum.soTien || 0,
    totalUsers,
    totalCourses,
    totalLessons,
  };
}
