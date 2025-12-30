import { getAdminDashboardStats } from "@/app/data/admin/get-admin-dashboard-stats";
import { AdminDashboardClient } from "./_components/AdminDashboardClient";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { days } = await searchParams;
  const duration = typeof days === "string" ? parseInt(days) : 30;
  
  const stats = await getAdminDashboardStats(duration);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Tổng quan hệ thống và doanh thu AI
        </p>
      </div>
      
      <AdminDashboardClient stats={stats} />
    </div>
  );
}
