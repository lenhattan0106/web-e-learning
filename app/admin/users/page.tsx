import { getUsers, type GetUsersParams } from "@/app/data/admin/get-users";
import { UsersClient } from "./_components/UsersClient";

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
  
  const data = await getUsers(queryParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quản lý người dùng</h1>
        <p className="text-muted-foreground">
          Quản lý tài khoản, vai trò và quyền Premium
        </p>
      </div>
      
      <UsersClient 
        users={data.users} 
        total={data.total}
        totalPages={data.totalPages}
        currentPage={data.page}
      />
    </div>
  );
}
