import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/data/admin/require-admin";
import { PremiumClient } from "./_components/PremiumClient";

async function getPremiumStats() {
  const now = new Date();

  const [
    totalPremiumUsers,
    activePremiumUsers,
    totalRevenue,
    recentPayments,
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
    
    // 20 thanh toán gần nhất
    prisma.thanhToanPremium.findMany({
      take: 20,
      orderBy: { ngayTao: "desc" },
      include: {
        nguoiDung: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    }),
  ]);

  return {
    totalPremiumUsers,
    activePremiumUsers,
    totalRevenue: totalRevenue._sum.soTien || 0,
    recentPayments,
  };
}

export default async function AdminPremiumPage() {
  await requireAdmin();
  
  const stats = await getPremiumStats();
  
  return <PremiumClient stats={stats} />;
}
