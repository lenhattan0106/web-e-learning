import "server-only";
import { prisma } from "@/lib/db";

export async function getReportedComments() {
  // Get comments that are hidden (AN) or have pending reports
  const reportedComments = await prisma.binhLuan.findMany({
    where: {
      OR: [
        { trangThai: "AN" }, // Already hidden
        {
          baoCaos: {
            some: {
              trangThai: "ChoXuLy", // Has pending reports
            },
          },
        },
      ],
    },
    orderBy: { ngayCapNhat: "desc" },
    include: {
      nguoiDung: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
          banned: true,
        },
      },
      baiHoc: {
        select: {
          id: true,
          tenBaiHoc: true,
          chuong: {
            select: {
              khoaHoc: {
                select: {
                  tenKhoaHoc: true,
                  duongDan: true,
                },
              },
            },
          },
        },
      },
      baoCaos: {
        where: { trangThai: "ChoXuLy" },
        orderBy: { ngayTao: "desc" },
        include: {
          nguoiDung: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: { baoCaos: true },
      },
    },
  });

  return reportedComments;
}

export type ReportedComment = Awaited<ReturnType<typeof getReportedComments>>[number];
