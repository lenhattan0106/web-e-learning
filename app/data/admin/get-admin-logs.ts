import "server-only";

import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";
import { Prisma } from "@/lib/generated/prisma";

export type AdminLogFilters = {
  loaiBaoCao?: "BINH_LUAN" | "KHOA_HOC";
  hanhDong?: "XOA_NOI_DUNG" | "CAM_USER" | "BO_QUA" | "CHAN_KHOA_HOC";
  adminId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
};

export type AdminLog = {
  id: string;
  loaiBaoCao: string;
  hanhDong: string;
  lyDoXuLy: string | null;
  thoiHanCam: number | null;
  ngayTao: Date;
  admin: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  baoCaoBinhLuan: {
    id: string;
    lyDo: string;
    nguoiDung: {
      id: string;
      name: string;
      image: string | null;
      role: string | null;
    };
    binhLuan: {
      noiDung: string;
      nguoiDung: {
        name: string;
      };
    } | null;
  } | null;
  baoCaoKhoaHoc: {
    id: string;
    lyDo: string;
    nguoiDung: {
      id: string;
      name: string;
      image: string | null;
      role: string | null; 
    };
    khoaHoc: {
      tenKhoaHoc: string;
      duongDan: string;
    };
  } | null;
};

export type AdminLogsResult = {
  logs: AdminLog[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export async function getAdminLogs(filters: AdminLogFilters = {}): Promise<AdminLogsResult> {
  await requireAdmin();

  const {
    loaiBaoCao,
    hanhDong,
    adminId,
    startDate,
    endDate,
    page = 1,
    pageSize = 20,
  } = filters;

  // Build where clause
const where: Prisma.NhatKyXuLyWhereInput = {};
  if (loaiBaoCao) {
    where.loaiBaoCao = loaiBaoCao;
  }

  if (hanhDong) {
    where.hanhDong = hanhDong;
  }

  if (adminId) {
    where.idAdmin = adminId;
  }

  if (startDate || endDate) {
    where.ngayTao = {};
    if (startDate) {
      where.ngayTao.gte = startDate;
    }
    if (endDate) {
      where.ngayTao.lte = endDate;
    }
  }

  // Get total count
  const totalCount = await prisma.nhatKyXuLy.count({ where });

  // Get paginated logs
  const logs = await prisma.nhatKyXuLy.findMany({
    where,
    include: {
      admin: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      baoCaoBinhLuan: {
        select: {
          id: true,
          lyDo: true,
          nguoiDung: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true, 
            },
          },
          binhLuan: {
            select: {
              noiDung: true,
              nguoiDung: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      baoCaoKhoaHoc: {
        select: {
          id: true,
          lyDo: true,
          nguoiDung: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true, 
            },
          },
          khoaHoc: {
            select: {
              tenKhoaHoc: true,
              duongDan: true,
            },
          },
        },
      },
    },
    orderBy: { ngayTao: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    logs: logs as unknown as AdminLog[],
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page,
  };
}

// Get list of admins for filter dropdown
export async function getAdminsList() {
  await requireAdmin();

  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: {
      id: true,
      name: true,
      image: true,
    },
    orderBy: { name: "asc" },
  });

  return admins;
}

// Get summary stats for logs
export async function getAdminLogsSummary() {
  await requireAdmin();

  const [totalLogs, todayLogs, actionCounts] = await Promise.all([
    // Total logs
    prisma.nhatKyXuLy.count(),
    
    // Today's logs
    prisma.nhatKyXuLy.count({
      where: {
        ngayTao: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    
    // Count by action type
    prisma.nhatKyXuLy.groupBy({
      by: ["hanhDong"],
      _count: true,
    }),
  ]);

  return {
    totalLogs,
    todayLogs,
    actionCounts: actionCounts.reduce((acc, item) => {
      acc[item.hanhDong] = item._count;
      return acc;
    }, {} as Record<string, number>),
  };
}
