"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DateRange } from "react-day-picker";
import { 
  Search, 
  UserX, 
  UserCheck, 
  Shield, 
  Sparkles, 
  MoreHorizontal,
  Ban,
  Star,
  GraduationCap,
  User,
  Users,
  UserPlus
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { BanUserModal } from "./BanUserModal";
import { GrantPremiumDialog } from "./GrantPremiumDialog";
import { ChangeRoleDialog } from "./ChangeRoleDialog";
import { 
  banUser, 
  unbanUser, 
  changeUserRole, 
  grantPremium,
  revokePremium 
} from "@/app/admin/actions/user-management";
import { fetchUserGrowthData } from "@/app/admin/actions/user-growth";
import type { UserWithStats } from "@/app/data/admin/get-users";
import { StatsCard } from "../../_components/StatsCard";
import { UserGrowthChart } from "../../_components/charts/UserGrowthChart";
import { UserDistributionChart } from "../../_components/charts/UserDistributionChart";
import { DateFilter } from "../../_components/DateFilter";
import { UserDetailSheet } from "../../_components/UserDetailSheet";
import { getUserDetailsByDateRange } from "@/app/admin/actions/user-details";

interface UserStats {
  totalUsers: number;
  totalTeachers: number;
  premiumActive: number;
  newUsers: number;
}

interface UserGrowthChartData {
  label: string;
  month: string;
  newUsers: number;
  newPremium: number;
  details?: {
    userId: string;
    name: string;
    email: string;
    image?: string | null;
    createdAt: string;
    isPremium: boolean;
  }[];
}

interface UserDistribution {
  freeUsers: number;
  premiumUsers: number;
  total: number;
}

interface UsersClientProps {
  users: UserWithStats[];
  total: number;
  totalPages: number;
  currentPage: number;
  stats: UserStats;
  growthData: UserGrowthChartData[];
  distribution: UserDistribution;
}

type FilterType = "all" | "teacher" | "premium" | "new";

export function UsersClient({ users, total, totalPages, currentPage, stats, growthData, distribution }: UsersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const activeFilter = useMemo(() => {
    const role = searchParams.get("role");
    const premium = searchParams.get("premium");
    const status = searchParams.get("status");

    if (role === "teacher") return "teacher";
    if (premium === "premium") return "premium";
    if (status === "active") return "new";
    return "all";
  }, [searchParams]);

  // Date filter state for charts
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    return { from, to };
  });
  const [currentDuration, setCurrentDuration] = useState(30);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [chartData, setChartData] = useState<UserGrowthChartData[]>(growthData);
  const [chartLoading, setChartLoading] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetUsers, setSheetUsers] = useState<any[]>([]);
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetDescription, setSheetDescription] = useState("");
  const [sheetLoading, setSheetLoading] = useState(false);

  const updateUrl = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); 
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl("search", searchValue || null);
  };

  const handleDurationChange = (days: number) => {
    setIsCustomRange(false);
    setCurrentDuration(days);
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);
    setDateRange({ from, to });
  };
  
  const handleCustomRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setIsCustomRange(true);
      setDateRange(range);
    }
  };

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    const fetchData = async () => {
      setChartLoading(true);
      try {
        const result = await fetchUserGrowthData(
          dateRange.from!.toISOString(),
          dateRange.to!.toISOString()
        );
        setChartData(result);
      } catch (error) {
        console.error("Failed to fetch chart data", error);
      } finally {
        setChartLoading(false);
      }
    };
    
    fetchData();
  }, [dateRange]);

  const handleStatsCardClick = async (type: "all" | "teacher" | "premium" | "new") => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    setSheetLoading(true);
    setSheetOpen(true);
    
    try {
      let users;
      let title = "";
      let description = "";
      
      if (type === "all") {
        users = await getUserDetailsByDateRange(
          dateRange.from.toISOString(),
          dateRange.to.toISOString(),
          "all"
        );
        title = "Tổng người dùng mới";
        description = `Từ ${format(dateRange.from, "dd/MM/yyyy")} đến ${format(dateRange.to, "dd/MM/yyyy")}`;
      } else if (type === "premium") {
        users = await getUserDetailsByDateRange(
          dateRange.from.toISOString(),
          dateRange.to.toISOString(),
          "premium"
        );
        title = "Hội viên AI Premium mới";
        description = `Từ ${format(dateRange.from, "dd/MM/yyyy")} đến ${format(dateRange.to, "dd/MM/yyyy")}`;
      }
      
      setSheetUsers(users || []);
      setSheetTitle(title);
      setSheetDescription(description);
    } catch (error) {
      console.error("Failed to fetch user details", error);
      toast.error("Không thể tải danh sách người dùng");
    } finally {
      setSheetLoading(false);
    }
  };
  


  const handleFilterChange = (filter: FilterType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("role");
    params.delete("premium");
    params.delete("status");
    params.delete("page");
    
    if (filter === "teacher") {
      params.set("role", "teacher");
    } else if (filter === "premium") {
      params.set("premium", "premium");
    } else if (filter === "new") {
      params.set("status", "active");
    }
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleBan = async (reason: string, expiresAt?: Date) => {
    if (!selectedUser) return;
    const result = await banUser(selectedUser.id, reason, expiresAt);
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setBanModalOpen(false);
    setSelectedUser(null);
  };

  const handleUnban = async (user: UserWithStats) => {
    const result = await unbanUser(user.id);
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const handleRoleChange = async (newRole: "user" | "teacher") => {
    if (!selectedUser) return;
    const result = await changeUserRole(selectedUser.id, newRole);
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setRoleDialogOpen(false);
    setSelectedUser(null);
  };

  const handleGrantPremium = async (days: number) => {
    if (!selectedUser) return;
    const result = await grantPremium(selectedUser.id, days);
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setPremiumDialogOpen(false);
    setSelectedUser(null);
  };

  const handleRevokePremium = async (user: UserWithStats) => {
    const result = await revokePremium(user.id);
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case "teacher":
        return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-200 border-0"><GraduationCap className="w-3 h-3 mr-1" />Giáo viên</Badge>;
      default:
        return <Badge variant="outline"><User className="w-3 h-3 mr-1" />Học viên</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Thống kê người dùng</h2>
          <p className="text-sm text-muted-foreground">Tăng trưởng và phân phối người dùng</p>
        </div>
        <DateFilter
          dateRange={dateRange}
          onDateRangeChange={handleCustomRangeChange}
          quickDurations={[7, 30, 90]}
          currentDuration={currentDuration}
          onQuickDurationChange={handleDurationChange}
          isCustomRange={isCustomRange}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div 
          onClick={() => handleFilterChange("all")} 
          onDoubleClick={() => handleStatsCardClick("all")}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          title="Click đúp để xem chi tiết"
        >
          <StatsCard
            title="Tổng người dùng"
            value={stats.totalUsers}
            icon={<Users className="h-5 w-5 text-blue-500" />}
            className={activeFilter === "all" ? "ring-2 ring-blue-500 bg-blue-50/50" : ""}
          />
        </div>
        <div 
          onClick={() => handleFilterChange("teacher")} 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatsCard
            title="Giáo viên"
            value={stats.totalTeachers}
            icon={<GraduationCap className="h-5 w-5 text-sky-500" />}
            className={activeFilter === "teacher" ? "ring-2 ring-sky-500 bg-sky-50/50" : ""}
          />
        </div>
        <div 
          onClick={() => handleFilterChange("premium")} 
          onDoubleClick={() => handleStatsCardClick("premium")}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          title="Click đúp để xem chi tiết"
        >
          <StatsCard
            title="Hội viên AI"
            value={stats.premiumActive}
            icon={<Sparkles className="h-5 w-5 text-amber-500" />}
            className={activeFilter === "premium" ? "ring-2 ring-amber-500 bg-amber-50/50" : ""}
          />
        </div>
        <div 
          onClick={() => handleFilterChange("new")} 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <StatsCard
            title="Người dùng mới"
            value={stats.newUsers}
            icon={<UserPlus className="h-5 w-5 text-emerald-500" />}
            className={activeFilter === "new" ? "ring-2 ring-emerald-500 bg-emerald-50/50" : ""}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {chartLoading ? (
          <div className="h-[450px] flex items-center justify-center border rounded-lg lg:col-span-5">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Đang tải biểu đồ...</span>
            </div>
          </div>
        ) : (
          <UserGrowthChart data={chartData} className="lg:col-span-5" />
        )}
        <UserDistributionChart data={distribution} className="lg:col-span-2" />
      </div>

      {/* Search & Filter Badges */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc email..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Tìm</Button>
        </form>
        
        {/* Quick Filter Badges */}
        <div className="flex flex-wrap gap-2">
          <FilterBadge 
            label="Tất cả" 
            active={activeFilter === "all"} 
            onClick={() => handleFilterChange("all")} 
          />
          <FilterBadge 
            label="Giáo viên" 
            active={activeFilter === "teacher"} 
            onClick={() => handleFilterChange("teacher")} 
          />
          <FilterBadge 
            label="Hội viên AI" 
            active={activeFilter === "premium"} 
            onClick={() => handleFilterChange("premium")} 
          />
          <FilterBadge 
            label="Mới đăng ký" 
            active={activeFilter === "new"} 
            onClick={() => handleFilterChange("new")} 
          />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Hiển thị {users.length} / {total} người dùng
      </div>

      {/* Table */}
      <Card className={isPending ? "opacity-60 pointer-events-none transition-opacity duration-300" : "transition-opacity duration-300"}>
        <CardContent className="p-0 min-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="select-none">
                <TableHead>Người dùng</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tham gia</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Search className="h-8 w-8 opacity-50" />
                      <p>Không tìm thấy người dùng nào</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow 
                    key={user.id} 
                    className={`select-none cursor-default transition-colors ${user.banned ? "bg-red-50/50 dark:bg-red-950/20" : "hover:bg-muted/50"}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="select-text cursor-text">
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.isPremiumActive ? (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {user.premiumExpires && format(new Date(user.premiumExpires), "dd/MM/yy", { locale: vi })}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.banned ? (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="w-3 h-3" />Bị cấm
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-600 gap-1">
                          <UserCheck className="w-3 h-3" />Hoạt động
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: vi })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {/* Role change */}
                          {user.role !== "admin" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setRoleDialogOpen(true);
                              }}
                            >
                              <GraduationCap className="mr-2 h-4 w-4" />
                              Đổi vai trò
                            </DropdownMenuItem>
                          )}
                          
                          {/* Premium actions */}
                          {user.isPremiumActive ? (
                            <DropdownMenuItem
                              onClick={() => handleRevokePremium(user)}
                              className="text-orange-600"
                            >
                              <Star className="mr-2 h-4 w-4" />
                              Thu hồi Premium
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setPremiumDialogOpen(true);
                              }}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              Cấp Premium
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          
                          {/* Ban/Unban */}
                          {user.role !== "admin" && (
                            user.banned ? (
                              <DropdownMenuItem
                                onClick={() => handleUnban(user)}
                                className="text-green-600"
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Bỏ cấm
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setBanModalOpen(true);
                                }}
                                className="text-red-600"
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Cấm tài khoản
                              </DropdownMenuItem>
                            )
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <CardFooter className="py-4 border-t">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href={`${pathname}?${new URLSearchParams({ 
                      ...Object.fromEntries(searchParams.entries()), 
                      page: String(Math.max(1, currentPage - 1)) 
                    }).toString()}`}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <div className="text-sm font-medium mx-4">
                  Trang {currentPage} / {totalPages}
                </div>
                <PaginationItem>
                  <PaginationNext 
                    href={`${pathname}?${new URLSearchParams({ 
                      ...Object.fromEntries(searchParams.entries()), 
                      page: String(Math.min(totalPages, currentPage + 1)) 
                    }).toString()}`}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardFooter>
        )}
      </Card>
       <UserDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        users={sheetUsers}
        title={sheetTitle}
        description={sheetDescription}
        type="all"
      />
      {/* Modals */}
      <BanUserModal
        open={banModalOpen}
        onOpenChange={setBanModalOpen}
        user={selectedUser}
        onConfirm={handleBan}
      />
      
      <GrantPremiumDialog
        open={premiumDialogOpen}
        onOpenChange={setPremiumDialogOpen}
        user={selectedUser}
        onConfirm={handleGrantPremium}
      />
      
      <ChangeRoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        user={selectedUser}
        onConfirm={handleRoleChange}
      />
    </div>
  );
}

function FilterBadge({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  if (active) {
    return (
      <Badge 
        className="cursor-pointer hover:opacity-90 px-3 py-1.5 select-none transition-all" 
        onClick={onClick}
      >
        {label}
      </Badge>
    );
  }
  return (
    <Badge 
      variant="outline" 
      className="cursor-pointer hover:bg-muted px-3 py-1.5 select-none transition-all" 
      onClick={onClick}
    >
      {label}
    </Badge>
  );
}
