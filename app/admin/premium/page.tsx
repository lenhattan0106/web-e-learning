import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/data/admin/require-admin";
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

    // Tất cả hội viên đang active
    prisma.user.findMany({
      where: {
        isPremium: true,
        premiumExpires: { gt: now },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        premiumExpires: true,
        createdAt: true,
        _count: {
          select: { 
            thanhToanPremiums: { 
              where: { trangThai: "DaThanhToan" } 
            } 
          }
        }
      },
      orderBy: { premiumExpires: "desc" },
      take: 50,
    }),
  ]);

  return {
    totalPremiumUsers,
    activePremiumUsers,
    totalRevenue: totalRevenue._sum.soTien || 0,
    expiringCount: expiringMembers.length,
    recentPayments,
    expiringMembers: expiringMembers as any[],
    allActiveMembers: allActiveMembers as any[],
  };
}

export default async function AdminPremiumPage() {
  await requireAdmin();
  
  const stats = await getPremiumStats();
  
  return <PremiumClient stats={stats} />;
}
