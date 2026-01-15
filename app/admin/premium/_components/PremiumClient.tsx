"use client";

import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { format, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  IconSparkles, 
  IconUsers, 
  IconCash, 
  IconClock,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatsCard } from "../../_components/StatsCard";
import { grantPremiumByEmail, grantPremium, revokePremium } from "@/app/admin/actions/user-management";
import { toast } from "sonner";
import { MoreHorizontal, ShieldOff, Clock, Gift, Copy, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { PremiumRevenueChart } from "../../_components/charts/PremiumRevenueChart";
import { DateFilter } from "../../_components/DateFilter";
import { fetchPremiumRevenueData } from "@/app/admin/actions/premium-revenue";

// Types
interface PremiumPayment {
  id: string;
  soTien: number;
  soNgay: number;
  trangThai: string;
  vnpTxnRef: string | null;
  vnpTransactionNo: string | null;
  vnpBankCode: string | null;
  ngayTao: Date;
  nguoiDung: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    premiumExpires: Date | null;
  };
}

interface PremiumMember {
  id: string;
  name: string;
  email: string;
  image: string | null;
  premiumExpires: Date;
  createdAt?: Date;
  _count: {
    thanhToanPremiums: number;
  }
}

interface PremiumRevenueData {
  label: string;
  value: number;
  prevValue?: number;
  fullDate?: string;
  prevDateLabel?: string;
}

interface PremiumRevenueStats {
  data: PremiumRevenueData[];
  avgValue: number;
  total: number;
  granularity: "day" | "week" | "month";
}

import { updateSystemSetting } from "@/app/admin/actions/system-settings";
import { SYSTEM_SETTINGS } from "@/app/data/admin/system-settings-constants";
import { Edit, Save } from "lucide-react";


interface PremiumClientProps {
  stats: {
    totalPremiumUsers: number;
    activePremiumUsers: number;
    totalRevenue: number;
    expiringCount: number;
    recentPayments: PremiumPayment[];
    expiringMembers: PremiumMember[];
    allActiveMembers: PremiumMember[];
    activePayingUsersCount: number;
  };
  revenueChartData: PremiumRevenueStats;
  currentPrice: number;
}

type TabType = "transactions" | "expiring" | "active";

export function PremiumClient({ stats, revenueChartData, currentPrice }: PremiumClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("transactions");
  
  // Grant Premium State
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantDays, setGrantDays] = useState(30);

  // Edit Price State
  const [isEditPriceOpen, setIsEditPriceOpen] = useState(false);
  const [newPrice, setNewPrice] = useState(currentPrice.toString());

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Date filter state for chart
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    return { from, to };
  });
  const [currentDuration, setCurrentDuration] = useState(30);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [chartData, setChartData] = useState<PremiumRevenueStats>(revenueChartData);
  const [chartLoading, setChartLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount);
  };
  
  const handleUpdatePrice = async () => {
      const price = parseInt(newPrice.replace(/\D/g, ""));
      if (!price || price < 0) return toast.error("Giá không hợp lệ");
      
      setIsLoading(true);
      try {
          const res = await updateSystemSetting(SYSTEM_SETTINGS.PREMIUM_MONTHLY_PRICE, price.toString());
          if (res.success) {
              toast.success("Cập nhật giá thành công");
              setIsEditPriceOpen(false);
              router.refresh();
          } else {
              toast.error(res.message);
          }
      } catch (error) {
          toast.error("Có lỗi xảy ra");
      } finally {
          setIsLoading(false);
      }
  }


  const handleGrantPremium = async () => {
    if (!grantEmail || grantDays <= 0) {
      toast.error("Vui lòng nhập email và số ngày hợp lệ");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await grantPremiumByEmail(grantEmail, grantDays);
      if (result.success) {
        toast.success(result.message);
        setIsGrantOpen(false);
        setGrantEmail("");
        setGrantDays(30);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
       toast.error("Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  // Date filter handlers
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

  // Fetch chart data when date range changes
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    const fetchData = async () => {
      setChartLoading(true);
      try {
        const result = await fetchPremiumRevenueData(
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

  const handleRevoke = async (userId: string) => {
     if(!confirm("Bạn có chắc chắn muốn thu hồi quyền Premium của người dùng này?")) return;
     
     const res = await revokePremium(userId);
     if(res.success) {
        toast.success(res.message);
        router.refresh();
     }
     else toast.error(res.message);
  };

  const handleExtend = async (userId: string, days: number = 30) => {
     const res = await grantPremium(userId, days);
     if(res.success) {
        toast.success(res.message);
        router.refresh();
     }
     else toast.error(res.message);
  };

  // Filter data based on search
  const filteredTransactions = stats.recentPayments.filter(p => 
    p.nguoiDung.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nguoiDung.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.vnpTxnRef?.includes(searchTerm)
  );

  const filteredExpiring = stats.expiringMembers.filter(m =>
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActive = stats.allActiveMembers.filter(m =>
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActiveData = () => {
    switch(activeTab) {
      case "transactions": return filteredTransactions;
      case "expiring": return filteredExpiring;
      case "active": return filteredActive;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Quản lý AI Premium</h1>
          <p className="text-muted-foreground">
            Theo dõi doanh thu, quản lý hội viên và cấp phát quyền Premium
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateFilter
            dateRange={dateRange}
            onDateRangeChange={handleCustomRangeChange}
            quickDurations={[7, 30, 90]}
            currentDuration={currentDuration}
            onQuickDurationChange={handleDurationChange}
            isCustomRange={isCustomRange}
          />
          <Dialog open={isGrantOpen} onOpenChange={setIsGrantOpen}>
             <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                   <IconPlus className="mr-2 h-4 w-4" /> Cấp thủ công
                </Button>
             </DialogTrigger>
           <DialogContent>
              <DialogHeader>
                 <DialogTitle>Cấp quyền AI Premium</DialogTitle>
                 <DialogDescription>
                    Cấp quyền thành viên Premium cho người dùng. Số ngày sẽ được cộng dồn nếu còn hạn.
                 </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="grid gap-2">
                    <Label>Email người dùng</Label>
                    <Input 
                       placeholder="user@example.com" 
                       value={grantEmail}
                       onChange={(e) => setGrantEmail(e.target.value)}
                    />
                 </div>
                 <div className="grid gap-2">
                    <Label>Số ngày cấp</Label>
                    <Input 
                       type="number"
                       value={grantDays}
                       onChange={(e) => setGrantDays(parseInt(e.target.value) || 0)}
                    />
                 </div>
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => setIsGrantOpen(false)}>Hủy</Button>
                 <Button onClick={handleGrantPremium} disabled={isLoading}>
                    {isLoading ? "Đang xử lý..." : "Xác nhận cấp"}
                 </Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>
       </div>
      </div>

      {/* Clickable Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
        <div onClick={() => setActiveTab("transactions")} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatsCard
             title="Tổng doanh thu"
             value={stats.totalRevenue}
             icon={<IconCash className="h-6 w-6 text-emerald-500" />}
             suffix="đ"
             footer={<span className="text-xs text-muted-foreground">Từ các giao dịch VNPay thành công</span>}
             className={activeTab === "transactions" ? "ring-2 ring-emerald-500 bg-emerald-50/50" : ""}
          />
        </div>
        <div onClick={() => setActiveTab("active")} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatsCard
             title="Hội viên Active"
             value={stats.activePremiumUsers}
             icon={<IconSparkles className="h-6 w-6 text-amber-500" />}
             suffix="Người dùng"
             footer={<span className="text-xs text-muted-foreground">Đang sử dụng AI Premium</span>}
             className={activeTab === "active" ? "ring-2 ring-amber-500 bg-amber-50/50" : ""}
          />
        </div>
        <div onClick={() => setActiveTab("expiring")} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatsCard
             title="Sắp hết hạn"
             value={stats.expiringCount}
             icon={<IconClock className="h-6 w-6 text-rose-500" />}
             suffix="Người dùng"
             footer={<span className="text-xs text-muted-foreground">Trong 7 ngày tới</span>}
             className={activeTab === "expiring" ? "ring-2 ring-rose-500 bg-rose-50/50" : ""}
          />
        </div>
        <Dialog open={isEditPriceOpen} onOpenChange={setIsEditPriceOpen}>
          <DialogTrigger asChild>
            <div className="cursor-pointer transition-transform hover:scale-[1.02] group relative">
               <StatsCard
                  title="Giá gói Premium hiện tại"
                  value={currentPrice}
                  icon={<IconCash className="h-6 w-6 text-purple-500" />}
                  suffix="đ"
                  footer={
                    <div className="flex justify-between w-full text-xs items-center">
                       <span className="text-muted-foreground">Áp dụng cho chu kỳ 30 ngày</span>
                       <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 group-hover:bg-purple-200 transition-colors">
                          <Edit className="w-3 h-3 mr-1" /> Chỉnh sửa
                       </Badge>
                    </div>
                  }
                  className="ring-2 ring-purple-500 bg-purple-50/50"
               />
            </div>
          </DialogTrigger>
          <DialogContent>
             <DialogHeader>
                <DialogTitle>Cập nhật giá Premium</DialogTitle>
                <DialogDescription>
                   Thay đổi giá gói Premium cho chu kỳ 30 ngày. Giá mới sẽ áp dụng cho các giao dịch trong tương lai.
                </DialogDescription>
             </DialogHeader>
             <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                   <Label>Giá mới (VND)</Label>
                   <Input 
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="99000"
                   />
                   <p className="text-xs text-muted-foreground">
                      Giá hiện tại: <b>{formatCurrency(currentPrice)} đ</b>
                   </p>
                </div>
             </div>
             <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditPriceOpen(false)}>Hủy</Button>
                <Button onClick={handleUpdatePrice} disabled={isLoading}>
                   {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
             </DialogFooter>
           </DialogContent>
        </Dialog>
      </div>

      {/* Premium Revenue Chart */}
      {chartLoading ? (
        <div className="h-[450px] flex items-center justify-center border rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Đang tải biểu đồ...</span>
          </div>
        </div>
      ) : (
        <PremiumRevenueChart 
          data={chartData.data} 
          avgValue={chartData.avgValue}
          granularity={chartData.granularity}
        />
      )}

      {/* Detail Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Chi tiết: 
                <Badge variant="outline" className="text-base font-normal capitalize">
                   {activeTab === "transactions" ? "Lịch sử giao dịch" : 
                    activeTab === "expiring" ? "Sắp hết hạn (7 ngày)" : "Tất cả hội viên Active"}
                </Badge>
              </h3>
              <span className="text-sm text-muted-foreground">({getActiveData().length} kết quả)</span>
           </div>
           <div className="relative w-full md:w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Tìm theo tên, email, mã GD..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "transactions" && <TransactionsTable data={filteredTransactions} onRevoke={handleRevoke} />}
                {activeTab === "expiring" && <ExpiringTable data={filteredExpiring} onExtend={handleExtend} onRevoke={handleRevoke} />}
                {activeTab === "active" && <ActiveMembersTable data={filteredActive} onExtend={handleExtend} onRevoke={handleRevoke} />}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


function EmptyResult({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <div className="rounded-full bg-muted p-4 mb-4">
        <IconSearch className="h-6 w-6 opacity-50" />
      </div>
      <p>{message}</p>
    </div>
  );
}




function ExpiringTable({ data, onExtend, onRevoke }: { data: any[], onExtend: (userId: string, days: number) => void, onRevoke: (userId: string) => void }) {
  if (!data.length) return <EmptyResult message="Không có hội viên nào sắp hết hạn trong 7 ngày tới" />;

  return (
    <Table>
      <TableHeader>
        <TableRow className="select-none">
          <TableHead>Hội viên</TableHead>
          <TableHead>Ngày hết hạn</TableHead>
          <TableHead>Còn lại</TableHead>
          <TableHead className="text-right">Hành động</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((member) => {
          const daysLeft = differenceInDays(new Date(member.premiumExpires), new Date());
          return (
            <TableRow key={member.id} className="select-none cursor-default">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback>{member.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col select-text cursor-text">
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(member.premiumExpires), "dd/MM/yyyy", { locale: vi })}
              </TableCell>
              <TableCell>
                <Badge className={`${daysLeft <= 3 ? "bg-rose-100 text-rose-700" : "bg-orange-100 text-orange-700"} border-0 cursor-default select-none`}>
                  {daysLeft} ngày
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => onExtend(member.id, 30)}>
                    <Gift className="mr-1 h-3 w-3" /> +30 ngày
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onExtend(member.id, 7)}>
                        <Clock className="mr-2 h-4 w-4" /> Gia hạn +7 ngày
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExtend(member.id, 90)}>
                        <Clock className="mr-2 h-4 w-4" /> Gia hạn +90 ngày
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onRevoke(member.id)}>
                        <ShieldOff className="mr-2 h-4 w-4" /> Thu hồi Premium
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ActiveMembersTable({ data, onExtend, onRevoke }: { data: any[], onExtend: (userId: string, days: number) => void, onRevoke: (userId: string) => void }) {
  if (!data.length) return <EmptyResult message="Chưa có hội viên AI Premium nào" />;

  const getSourceBadge = (member: PremiumMember) => {
    if (member._count.thanhToanPremiums > 0) {
      return <Badge className="bg-blue-100 text-blue-700 border-0 cursor-default select-none">VNPay</Badge>;
    }
    return <Badge variant="outline" className="text-slate-500 cursor-default select-none">Hệ thống</Badge>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="select-none">
          <TableHead>Hội viên</TableHead>
          <TableHead>Nguồn</TableHead>
          <TableHead>Ngày hết hạn</TableHead>
          <TableHead>Còn lại</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((member) => {
          const daysLeft = differenceInDays(new Date(member.premiumExpires), new Date());
          return (
            <TableRow key={member.id} className="select-none cursor-default">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback>{member.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col select-text cursor-text">
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{getSourceBadge(member)}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(member.premiumExpires), "dd/MM/yyyy", { locale: vi })}
              </TableCell>
              <TableCell>
                <span className={`font-bold ${daysLeft <= 7 ? "text-rose-600" : "text-emerald-600"}`}>
                  {daysLeft} ngày
                </span>
              </TableCell>
              <TableCell>
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 shadow-none hover:bg-amber-200 cursor-default select-none">
                  Active
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onExtend(member.id, 30)}>
                      <Gift className="mr-2 h-4 w-4" /> Gia hạn +30 ngày
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onRevoke(member.id)}>
                      <ShieldOff className="mr-2 h-4 w-4" /> Thu hồi Premium
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function TransactionsTable({ data, onRevoke }: { data: any[], onRevoke: (userId: string) => void }) {
  if (!data.length) return <EmptyResult message="Chưa có giao dịch hợp lệ" />;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DaThanhToan":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 cursor-default select-none">Thành công</Badge>;
      case "DangXuLy":
        return <Badge variant="secondary" className="cursor-default select-none">Đang xử lý</Badge>;
      default:
        return null; // Don't show failed/cancelled in this view as per request
    }
  };

  const getMethodBadge = (payment: any) => {
    if (payment.vnpTxnRef) {
      return <Badge className="bg-blue-100 text-blue-700 border-0 cursor-default select-none">VNPay</Badge>;
    }
    return <Badge variant="outline" className="text-slate-500 cursor-default select-none">Thủ công</Badge>;
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("vi-VN").format(amount);

  return (
    <Table>
      <TableHeader>
        <TableRow className="select-none">
          <TableHead>Người dùng</TableHead>
          <TableHead>Phương thức</TableHead>
          <TableHead>Mã giao dịch</TableHead>
          <TableHead>Số tiền</TableHead>
          <TableHead>Ngày hết hạn</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((payment) => (
          <TableRow key={payment.id} className="select-none cursor-default">
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={payment.nguoiDung.image || undefined} />
                  <AvatarFallback>{payment.nguoiDung.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col select-text cursor-text">
                  <p className="font-medium text-sm">{payment.nguoiDung.name}</p>
                  <p className="text-xs text-muted-foreground">{payment.nguoiDung.email}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>{getMethodBadge(payment)}</TableCell>
            <TableCell>
              {payment.vnpTxnRef ? (
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded select-text cursor-text">{payment.vnpTxnRef}</code>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="font-semibold text-emerald-600">
               {payment.vnpTxnRef ? `+${formatCurrency(payment.soTien)} đ` : <span className="text-muted-foreground font-normal">—</span>}
            </TableCell>
            <TableCell>
               {payment.nguoiDung.premiumExpires ? (
                  <span className="text-sm text-muted-foreground">
                     {format(new Date(payment.nguoiDung.premiumExpires), "dd/MM/yyyy", { locale: vi })}
                  </span>
               ) : <span className="text-xs text-muted-foreground">—</span>}
            </TableCell>
            <TableCell>{getStatusBadge(payment.trangThai)}</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onRevoke(payment.nguoiDung.id)}>
                    <ShieldOff className="mr-2 h-4 w-4" /> Thu hồi Premium
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}


