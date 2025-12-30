"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  IconSparkles, 
  IconUsers, 
  IconCash, 
  IconActivity 
} from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PremiumPayment {
  id: string;
  soTien: number;
  soNgay: number;
  trangThai: string;
  ngayTao: Date;
  nguoiDung: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface PremiumClientProps {
  stats: {
    totalPremiumUsers: number;
    activePremiumUsers: number;
    totalRevenue: number;
    recentPayments: PremiumPayment[];
  };
}

export function PremiumClient({ stats }: PremiumClientProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DaThanhToan":
        return <Badge variant="default" className="bg-green-500">Thành công</Badge>;
      case "DangXuLy":
        return <Badge variant="secondary">Đang xử lý</Badge>;
      case "DaHuy":
        return <Badge variant="destructive">Đã hủy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Quản lý AI Premium</h1>
        <p className="text-muted-foreground">
          Theo dõi doanh thu và người dùng Premium
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <IconCash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Từ AI Premium</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium đang hoạt động</CardTitle>
            <IconSparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePremiumUsers}</div>
            <p className="text-xs text-muted-foreground">Người dùng</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng đã mua</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPremiumUsers}</div>
            <p className="text-xs text-muted-foreground">Người dùng</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR ước tính</CardTitle>
            <IconActivity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.activePremiumUsers * 99000)}</div>
            <p className="text-xs text-muted-foreground">Monthly Recurring Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Giao dịch gần đây</CardTitle>
          <CardDescription>20 giao dịch Premium mới nhất</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Số ngày</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Chưa có giao dịch Premium nào
                  </TableCell>
                </TableRow>
              ) : (
                stats.recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={payment.nguoiDung.image || undefined} />
                          <AvatarFallback>
                            {payment.nguoiDung.name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{payment.nguoiDung.name}</p>
                          <p className="text-xs text-muted-foreground">{payment.nguoiDung.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.soTien)}
                    </TableCell>
                    <TableCell>{payment.soNgay} ngày</TableCell>
                    <TableCell>{getStatusBadge(payment.trangThai)}</TableCell>
                    <TableCell>
                      {format(new Date(payment.ngayTao), "dd/MM/yyyy HH:mm", { locale: vi })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
