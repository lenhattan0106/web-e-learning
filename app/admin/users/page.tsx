import { getUsers, type GetUsersParams } from "@/app/data/admin/get-users";
import { prisma } from "@/lib/db";
import { UsersClient } from "./_components/UsersClient";
import { getUserGrowthStats, getUserDistribution } from "@/app/data/admin/get-user-growth-stats";

async function getUserStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const [totalUsers, totalTeachers, premiumActive, newUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "teacher" } }),
    prisma.user.count({ 
      where: { 
        isPremium: true, 
        premiumExpires: { gt: now } 
      } 
    }),
    prisma.user.count({ 
      where: { 
        createdAt: { gte: thirtyDaysAgo } 
      } 
    }),
  ]);
  
  return { totalUsers, totalTeachers, premiumActive, newUsers };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  
  const queryParams: GetUsersParams = {
    page: typeof params.page === "string" ? parseInt(params.page) : 1,
    search: typeof params.search === "string" ? params.search : "",
    role: (params.role as GetUsersParams["role"]) || "all",
    status: (params.status as GetUsersParams["status"]) || "all",
    premium: (params.premium as GetUsersParams["premium"]) || "all",
  };
  
  // Default date range: last 30 days
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 30);
  
  const [data, stats, growthData, distribution] = await Promise.all([
    getUsers(queryParams),
    getUserStats(),
    getUserGrowthStats(fromDate, toDate), // Default 30 days
    getUserDistribution(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý người dùng</h1>
        <p className="text-muted-foreground">
          Quản lý tài khoản, vai trò và quyền Premium
        </p>
      </div>
      
      <UsersClient 
        users={data.users} 
        total={data.total}
        totalPages={data.totalPages}
        currentPage={data.page}
        stats={stats}
        growthData={growthData}
        distribution={distribution}
      />
    </div>
  );
}


