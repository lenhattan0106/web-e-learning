import "server-only";

import { prisma } from "@/lib/db";
// import { TrangThaiBaoCao } from "@/lib/generated/prisma"; // unused

// Tab 1: Xếp hạng khóa học
export async function getLowRatedCourses() {
  // Lấy tất cả khóa học có đánh giá
  const courses = await prisma.khoaHoc.findMany({
    where: {
      trangThai: "BanChinhThuc", // Chỉ xét khóa đang public
      danhGias: {
        some: {}, // Có ít nhất 1 đánh giá
      },
    },
    select: {
      id: true,
      tenKhoaHoc: true,
      duongDan: true,
      tepKH: true,
      trangThai: true,
      nguoiDung: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      danhGias: {
        where: { trangThai: "HIEN" },
        select: {
          diemDanhGia: true,
        },
      },
    },
  });

  // Tính toán rating trung bình và lọc
  const processedCourses = courses.map((course) => {
    const totalRating = course.danhGias.reduce((sum, dg) => sum + dg.diemDanhGia, 0);
    const reviewCount = course.danhGias.length;
    const avgRating = reviewCount > 0 ? totalRating / reviewCount : 0;

    return {
      ...course,
      reviewCount,
      avgRating,
    };
  });

  // Lọc bảng xếp hạng rating
  return processedCourses
    .filter((c) => c.reviewCount > 0)
    .sort((a, b) => a.avgRating - b.avgRating);
}

// Tab 2: Khóa học bị báo cáo
export async function getReportedCourses() {
  return await prisma.baoCaoKhoaHoc.findMany({
    where: {
      trangThai: "ChoXuLy",
    },
    include: {
      nguoiDung: { // Người báo cáo
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      khoaHoc: { // Khóa học bị báo cáo
        select: {
          id: true,
          tenKhoaHoc: true,
          duongDan: true,
          nguoiDung: { // Giáo viên
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      ngayTao: "desc",
    },
  });
}

// Tab 3: Bình luận vi phạm
export async function getReportedComments() {
  return await prisma.baoCaoBinhLuan.findMany({
    where: {
      trangThai: "ChoXuLy",
    },
    include: {
      nguoiDung: { // Người báo cáo
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      binhLuan: { // Bình luận bị report
        select: {
          id: true,
          noiDung: true,
          ngayTao: true,
          nguoiDung: { // Tác giả bình luận
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          baiHoc: { // Bài học chứa bình luận
            select: {
              id: true,
              tenBaiHoc: true,
              chuong: {
                select: {
                  khoaHoc: {
                    select: {
                      duongDan: true,
                      tenKhoaHoc: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      ngayTao: "desc",
    },
  });
}
