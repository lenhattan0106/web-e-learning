/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Sparkles, 
  Wallet,
  Clock,
  Search,
  AlertTriangle,
  Star,
  MoreHorizontal,
  FileText
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


import { fetchRevenueDetails, fetchPremiumDetails, fetchReportsDetails } from "@/app/admin/actions/admin-dashboard";
import { ReportsTable } from "@/app/admin/reports/_components/ReportsTable";
import { SystemRevenueChart } from "./charts/SystemRevenueChart";
import type { SystemRevenueStats } from "@/app/data/admin/get-system-revenue-stats";
interface AdminDashboardStats {
  totalUsers: number;
  totalTeachers: number;
  totalCourses: number;
  premiumActiveCount: number;
  premiumExpiringCount: number;
  totalRevenue: number;
  conversionRate: string;
  revenueGrowth: number;
  pendingReports: number;
  avgRating: string;
  monthlyUserGrowth: Array<{
    month: string;
    label: string;
    total: number;
    premium: number;
  }>;
}

interface AdminDashboardClientProps {
  stats: AdminDashboardStats;
  systemRevenue: SystemRevenueStats;
}



type TabType = "users" | "revenue" | "premium" | "reports";
const ITEMS_PER_PAGE = 10;

export function AdminDashboardClient({ stats, systemRevenue }: AdminDashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // URL State
  const activeTab = (searchParams.get("view") as TabType) || "revenue"; // Default to revenue view
  const currentPageInfo = Number(searchParams.get("page")) || 1;
  const currentDuration = searchParams.get("days") || "30";

  // Local Data State
  const [data, setData] = useState<any[]>([]);
  const [dataCache, setDataCache] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(currentPageInfo);

  // Initial Data Fetch & Tab Change
  useEffect(() => {
    const loadData = async () => {
      // Return details from cache immediately if available
      if (dataCache[activeTab]) {
         setData(dataCache[activeTab]);
         setCurrentPage(1);
         setSearchTerm("");
         return; 
      }

      setLoading(true);
      try {
        let result: any[] = [];
        if (activeTab === "revenue") result = await fetchRevenueDetails();
        else if (activeTab === "premium") result = await fetchPremiumDetails();
        else if (activeTab === "reports") result = await fetchReportsDetails();
        
        setData(result);
        setDataCache(prev => ({ ...prev, [activeTab]: result }));
      } catch (error) {
        console.error("Failed to fetch dashboard details", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    if (!dataCache[activeTab]) {
       setCurrentPage(1);
       setSearchTerm("");
    }
  }, [activeTab]);

  // URL Updates Helper
  const updateUrl = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    
    if(key === "view") params.delete("page");
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (tab: TabType) => {
    // Redirect Users card to dedicated user management page
    if (tab === "users") {
      router.push("/admin/users");
      return;
    }
    startTransition(() => updateUrl("view", tab));
  };

  const handleDurationChange = (days: string) => {
    startTransition(() => {
      updateUrl("days", days);
      router.refresh(); 
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    startTransition(() => updateUrl("page", page.toString()));
    document.getElementById("details-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Filter Logic
  const filteredData = React.useMemo(() => {
      let result = data;

      // Text Search
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          result = result.filter(item => {
              if (activeTab === "revenue") return item.user?.name?.toLowerCase().includes(lower) || item.itemName?.toLowerCase().includes(lower);
              if (activeTab === "premium") return item.name?.toLowerCase().includes(lower) || item.email?.toLowerCase().includes(lower);
              if (activeTab === "reports") return item.nguoiDung?.name?.toLowerCase().includes(lower) || item.noiDung?.toLowerCase().includes(lower);
              return true;
          });
      }

      return result;
  }, [data, searchTerm, activeTab]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = React.useMemo(() => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);


  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Tổng quan</h2>
          <Select value={currentDuration} onValueChange={handleDurationChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Chọn thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày qua</SelectItem>
              <SelectItem value="30">30 ngày qua</SelectItem>
              <SelectItem value="90">90 ngày qua</SelectItem>
              <SelectItem value="365">1 năm qua</SelectItem>
            </SelectContent>
          </Select>
      </div>

      {/* 4 Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
        {/* Card 1: Users - Links to /admin/users */}
        <Link href="/admin/users" className="cursor-pointer transition-transform hover:scale-[1.02] h-full">
           <StatsCard
             title="Tổng người dùng"
             value={stats.totalUsers}
             icon={<Users className="h-6 w-6 text-blue-500" />}
             footer={
               <div className="text-xs flex justify-between w-full">
                 <span className="text-muted-foreground">Tỷ lệ mua hàng:</span>
                 <span className="font-semibold text-blue-600">{stats.conversionRate}%</span>
               </div>
             }
           />
        </Link>

        {/* Card 2: Revenue */}
        <div onClick={() => handleTabChange("revenue")} className="cursor-pointer transition-transform hover:scale-[1.02] h-full">
           <StatsCard
             title="Dòng tiền hệ thống"
             value={stats.totalRevenue}
             icon={<Wallet className="h-6 w-6 text-emerald-500" />}
             growth={stats.revenueGrowth}
             suffix="đ"
             className={activeTab === "revenue" ? "ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20" : ""}
             footer={
                <div className="text-xs flex justify-between w-full">
                  <span className="text-muted-foreground">Doanh thu Admin (100% + 5%):</span>
                  <span className="font-semibold text-emerald-600">100%</span>
                </div>
             }
           />
        </div>

        {/* Card 3: Premium */}
        <div onClick={() => handleTabChange("premium")} className="cursor-pointer transition-transform hover:scale-[1.02] h-full">
           <StatsCard
             title="Hội viên AI Active"
             value={stats.premiumActiveCount}
             icon={<Sparkles className="h-6 w-6 text-amber-500" />}
             className={activeTab === "premium" ? "ring-2 ring-amber-500 bg-amber-50/50 dark:bg-amber-900/20" : ""}
             footer={
               <div className="text-xs flex justify-between w-full">
                 <span className="text-muted-foreground">Sắp hết hạn (7 ngày):</span>
                 <span className="font-semibold text-orange-600">{stats.premiumExpiringCount}</span>
               </div>
             }
           />
        </div>

         {/* Card 4: Quality */}
         <div onClick={() => handleTabChange("reports")} className="cursor-pointer transition-transform hover:scale-[1.02] h-full">
           <StatsCard
             title="Cần xử lý"
             value={stats.pendingReports}
             icon={<AlertTriangle className="h-6 w-6 text-rose-500" />}
             className={activeTab === "reports" ? "ring-2 ring-rose-500 bg-rose-50/50 dark:bg-rose-900/20" : ""}
             footer={
               <div className="text-xs flex justify-between w-full">
                 <span className="text-muted-foreground">Rating trung bình:</span>
                 <div className="flex items-center gap-1 font-semibold text-yellow-600">
                    {stats.avgRating} <Star className="h-3 w-3 fill-yellow-600" />
                 </div>
               </div>
             }
           />
        </div>
      </div>



      {/* Details Section */}
      <div id="details-section" className="space-y-4 pt-4">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
               <h3 className="text-lg font-semibold flex items-center gap-2">
                 Chi tiết: 
                 <Badge variant="outline" className="text-base font-normal capitalize">
                    {activeTab === "users" ? "Danh sách người dùng" : 
                     activeTab === "revenue" ? "Lịch sử dòng tiền" : 
                     activeTab === "premium" ? "Quản lý Hội viên AI" : "Báo cáo nội dung"}
                 </Badge>
               </h3>
               <span className="text-sm text-muted-foreground">({filteredData.length} kết quả)</span>
            </div>

            <div className="relative w-full md:w-[300px]">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <Input 
                 placeholder="Tìm kiếm..." 
                 className="pl-9"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>


         
         {/* Detail Tables */}
         <Card id="details-table">
            <CardContent className="p-0">
               {loading ? (
                 <div className="p-8 space-y-4">
                     <Skeleton className="h-12 w-full" />
                     <Skeleton className="h-12 w-full" />
                     <Skeleton className="h-12 w-full" />
                 </div>
               ) : (
                 <AnimatePresence mode="wait">
                    <motion.div
                       key={activeTab}
                       initial={{ opacity: 0, y: 5 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -5 }}
                       transition={{ duration: 0.2 }}
                    >
                       {activeTab === "revenue" && <RevenueTable data={paginatedData} />}
                       {activeTab === "premium" && <PremiumTable data={paginatedData} />}
                       {activeTab === "reports" && <ReportsTable reports={paginatedData} />}
                    </motion.div>
                 </AnimatePresence>
               )}
            </CardContent>
            
            {/* Pagination */}
            {!loading && totalPages > 1 && (
               <CardFooter className="py-4 border-t">
                  <Pagination>
                     <PaginationContent>
                        <PaginationItem>
                           <PaginationPrevious 
                              href="#" 
                              onClick={(e) => { e.preventDefault(); if(currentPage > 1) handlePageChange(currentPage - 1) }}
                              className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                           />
                        </PaginationItem>
                        <div className="text-sm font-medium mx-4">
                           Trang {currentPage} / {totalPages}
                        </div>
                        <PaginationItem>
                           <PaginationNext 
                              href="#" 
                              onClick={(e) => { e.preventDefault(); if(currentPage < totalPages) handlePageChange(currentPage + 1) }}
                              className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                           />
                        </PaginationItem>
                     </PaginationContent>
                  </Pagination>
               </CardFooter>
            )}
         </Card>
      </div>

      {/* System Revenue Chart */}
      <SystemRevenueChart 
  data={systemRevenue.data} 
        growth={systemRevenue.growth} 
      />
    </div>
  );
}

function FilterBadge({ label, active, onClick, color = "slate" }: { label: string, active: boolean, onClick: () => void, color?: string }) {
   if (active) {
      return <Badge className="cursor-pointer hover:opacity-90 px-3 py-1 select-none" onClick={onClick}>{label}</Badge>
   }
   return <Badge variant="outline" className="cursor-pointer hover:bg-muted px-3 py-1 select-none" onClick={onClick}>{label}</Badge>
}


// Table: Revenue
function RevenueTable({ data }: { data: any[] }) {
   if (!data.length) return <EmptyResult />;
   return (
      <Table>
         <TableHeader>
            <TableRow className="select-none">
               <TableHead>Nguồn tiền</TableHead>
               <TableHead>Người thanh toán</TableHead>
               <TableHead>Nội dung</TableHead>
               <TableHead className="text-right">Số tiền (Admin nhận)</TableHead>
               <TableHead className="text-right">Thời gian</TableHead>
            </TableRow>
         </TableHeader>
         <TableBody>
            {data.map((item, idx) => (
               <TableRow key={item.id || idx} className="select-none cursor-default">
                  <TableCell>
                     {item.type === "PREMIUM" ? (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 shadow-none cursor-default select-none">Gói Premium</Badge>
                     ) : (
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 cursor-default select-none">Phí sàn (5%)</Badge>
                     )}
                  </TableCell>
                  <TableCell>
                     <div className="flex items-center gap-2 select-text cursor-text">
                        <Avatar className="h-6 w-6">
                           <AvatarImage src={item.user?.image} />
                           <AvatarFallback>{item.user?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{item.user?.name}</span>
                     </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                     {item.itemName}
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">
                     +{item.amount.toLocaleString("vi-VN")} đ
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                     {new Date(item.date).toLocaleDateString("vi-VN")}
                  </TableCell>
               </TableRow>
            ))}
         </TableBody>
      </Table>
   )
}

// Table: Premium
function PremiumTable({ data }: { data: any[] }) {
   if (!data.length) return <EmptyResult />;
   return (
      <Table>
         <TableHeader>
            <TableRow className="select-none">
               <TableHead>Hội viên</TableHead>
               <TableHead>Ngày hết hạn</TableHead>
               <TableHead>Còn lại</TableHead>
               <TableHead className="text-right">Trạng thái</TableHead>
            </TableRow>
         </TableHeader>
         <TableBody>
            {data.map((user) => (
               <TableRow key={user.id} className="select-none cursor-default">
                  <TableCell>
                     <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                           <AvatarImage src={user.image} />
                           <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col select-text cursor-text">
                           <span className="font-medium text-sm">{user.name}</span>
                           <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                     </div>
                  </TableCell>
                  <TableCell>
                     {new Date(user.premiumExpires).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell>
                     <span className={`font-bold ${user.daysLeft <= 7 ? "text-rose-600" : "text-emerald-600"}`}>
                        {user.daysLeft} ngày
                     </span>
                  </TableCell>
                  <TableCell className="text-right">
                     <Badge className="bg-amber-100 text-amber-700 border-amber-200 shadow-none hover:bg-amber-200 cursor-default select-none">
                        Active
                     </Badge>
                  </TableCell>
               </TableRow>
            ))}
         </TableBody>
      </Table>
   )
}

// Table: Reports
// Replaced by shared component from @/app/admin/reports/_components/ReportsTable
// Function definition removed.

function EmptyResult() {
   return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
         <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="h-6 w-6 opacity-50" />
         </div>
         <p>Không tìm thấy dữ liệu phù hợp</p>
      </div>
   )
}
