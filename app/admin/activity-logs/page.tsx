import { Suspense } from "react";
import { getAdminLogs, getAdminsList, getAdminLogsSummary } from "@/app/data/admin/get-admin-logs";
import { ActivityLogsClient } from "./_components/ActivityLogsClient";

export const metadata = {
  title: "Nhật ký xử lý | Admin",
  description: "Xem lịch sử các hành động xử lý của Admin",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    loaiBaoCao?: string;
    hanhDong?: string;
    adminId?: string;
  }>;
}

export default async function ActivityLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  const page = parseInt(params.page || "1");
  const loaiBaoCao = params.loaiBaoCao as "BINH_LUAN" | "KHOA_HOC" | undefined;
  const hanhDong = params.hanhDong as "XOA_NOI_DUNG" | "CAM_USER" | "BO_QUA" | "CHAN_KHOA_HOC" | undefined;
  const adminId = params.adminId;

  const [logsResult, admins, summary] = await Promise.all([
    getAdminLogs({
      page,
      loaiBaoCao,
      hanhDong,
      adminId,
      pageSize: 20,
    }),
    getAdminsList(),
    getAdminLogsSummary(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Nhật ký xử lý</h1>
        <p className="text-muted-foreground">
          Lịch sử các hành động kiểm duyệt của Admin
        </p>
      </div>

      <Suspense fallback={<div>Đang tải...</div>}>
        <ActivityLogsClient 
          logsResult={logsResult}
          admins={admins}
          summary={summary}
          currentFilters={{
            page,
            loaiBaoCao,
            hanhDong,
            adminId,
          }}
        />
      </Suspense>
    </div>
  );
}
