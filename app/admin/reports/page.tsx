import { getReportedComments } from "@/app/data/admin/get-reported-comments";
import { ReportsTable } from "./_components/ReportsTable";

export default async function AdminReportsPage() {
  const reports = await getReportedComments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Báo cáo bình luận</h1>
        <p className="text-muted-foreground">
          Quản lý các bình luận bị báo cáo vi phạm
        </p>
      </div>

      <ReportsTable reports={reports} />
    </div>
  );
}
