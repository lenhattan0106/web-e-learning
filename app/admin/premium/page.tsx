import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/data/admin/require-admin";
import { getPremiumRevenueStats } from "@/app/data/admin/get-premium-revenue-stats";
import { PremiumClient } from "./_components/PremiumClient";

async function getPremiumStats() {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalPremiumUsers,
    activePremiumUsers,
    totalRevenue,
    recentPayments,
    expiringMembers,
    allActiveMembers,
  ] = await Promise.all([
    // Tổng số users đã từng mua Premium
    prisma.thanhToanPremium.groupBy({
      by: ["idNguoiDung"],
      where: { trangThai: "DaThanhToan" },
    }).then(r => r.length),
    
    // Users đang có Premium active
    prisma.user.count({
      where: {
        isPremium: true,
        premiumExpires: { gt: now },
      },
    }),
    
    // Tổng doanh thu Premium
    prisma.thanhToanPremium.aggregate({
      _sum: { soTien: true },
      where: { trangThai: "DaThanhToan" },
    }),
    
    // 30 thanh toán gần nhất (với VNPay refs)
    prisma.thanhToanPremium.findMany({
      take: 30,
      orderBy: { ngayTao: "desc" },
      where: {
        trangThai: { not: "DaHuy" } // Chỉ hiển thị giao dịch hợp lệ hoặc đang xử lý
      },
      include: {
        nguoiDung: {
          select: { id: true, name: true, email: true, image: true, premiumExpires: true }
        }
      }
    }),

    // Hội viên sắp hết hạn (trong 7 ngày tới)
    prisma.user.findMany({
      where: {
        isPremium: true,
        premiumExpires: {
          gt: now,
          lte: sevenDaysFromNow,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        premiumExpires: true,
      },
      orderBy: { premiumExpires: "asc" },
    }),

    // Tất cả hội viên đang active (để đếm số user PAYING)
    prisma.user.findMany({
      where: {
        isPremium: true,
        premiumExpires: { gt: now },
      },
      select: {
          id: true,
          _count: {
              select: {
                  thanhToanPremiums: {
                      where: { trangThai: "DaThanhToan" }
                  }
              }
          }
      }
    })
  ]);

  // Calculate Paying Users (at least 1 successful transaction)
  const activePayingUsersCount = allActiveMembers.filter(u => u._count.thanhToanPremiums > 0).length;

  return {
    totalPremiumUsers,
    activePremiumUsers,
    totalRevenue: totalRevenue._sum.soTien || 0,
    expiringCount: expiringMembers.length,
    recentPayments,
    expiringMembers: expiringMembers as any[],
    allActiveMembers: allActiveMembers as any[],
    activePayingUsersCount, // Returned for consistent calculation
  };
}

import { getPremiumPrice } from "@/app/admin/actions/system-settings";

// ... existing code ...

export default async function AdminPremiumPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  
  // Default date range: last 30 days
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 30);
  
  const [stats, revenueStats, currentPrice] = await Promise.all([
    getPremiumStats(),
    getPremiumRevenueStats(fromDate, toDate), // Default 30 days
    getPremiumPrice(),
  ]);
  
  return <PremiumClient stats={stats} revenueChartData={revenueStats} currentPrice={currentPrice} />;
}
