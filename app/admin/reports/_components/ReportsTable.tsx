"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Check,
  Trash2,
  Ban,
  MoreHorizontal,
  User,
  AlertTriangle,
  MessageSquare,
  Eye,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { tryCatch } from "@/hooks/try-catch";
import { ReportedComment } from "@/app/data/admin/get-reported-comments";
import {
  approveComment,
  deleteReportedComment,
  deleteAndBanUser,
} from "../actions";

interface ReportsTableProps {
  reports: ReportedComment[];
}

export function ReportsTable({ reports }: ReportsTableProps) {
  const [selectedComment, setSelectedComment] = useState<ReportedComment | null>(null);
  const [actionType, setActionType] = useState<"view" | "delete" | "ban" | null>(null);
  const [pending, startTransition] = useTransition();
  const [isContentRevealed, setIsContentRevealed] = useState(false);
  
  // Ban form state
  const [banDuration, setBanDuration] = useState<string>("permanent");
  const [banReason, setBanReason] = useState("Vi phạm quy định bình luận");

  const handleAction = (action: "approve" | "delete" | "ban") => {
    if (!selectedComment) return;

    startTransition(async () => {
      let result;

      switch (action) {
        case "approve":
          result = await tryCatch(approveComment(selectedComment.id));
          break;
        case "delete":
          result = await tryCatch(deleteReportedComment(selectedComment.id));
          break;
        case "ban":
          // Calculate ban expiration based on duration
          let banExpires: Date | null = null;
          if (banDuration !== "permanent") {
            const days = parseInt(banDuration);
            banExpires = new Date();
            banExpires.setDate(banExpires.getDate() + days);
          }
          
          result = await tryCatch(
            deleteAndBanUser(
              selectedComment.id,
              selectedComment.idNguoiDung,
              banReason,
              banExpires
            )
          );
          break;
      }

      if (result?.error) {
        toast.error("Không thể thực hiện hành động");
        return;
      }

      if (result?.data.status === "success") {
        toast.success(result.data.message);
        setSelectedComment(null);
        setActionType(null);
      } else {
        toast.error(result?.data.message || "Có lỗi xảy ra");
      }
    });
  };

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/50">
        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Không có báo cáo nào</h3>
        <p className="text-muted-foreground">
          Hiện tại không có bình luận nào bị báo cáo
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người bình luận</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead>Bài học</TableHead>
              <TableHead className="text-center">Số báo cáo</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                {/* User */}
                <TableCell>
                    <div className="flex items-center gap-2">
                       <Avatar className="h-8 w-8">
                        <AvatarImage src={report.nguoiDung.image || ""} alt={report.nguoiDung.name || "User"} />
                        <AvatarFallback>{report.nguoiDung.name?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    <div>
                      <p className="font-medium text-sm">{report.nguoiDung.name}</p>
                      {report.nguoiDung.banned && (
                        <Badge variant="destructive" className="text-xs">
                          Đã bị cấm
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Content */}
                <TableCell className="max-w-[200px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="truncate text-sm">{report.noiDung}</p>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px]">
                      <p className="whitespace-pre-wrap">{report.noiDung}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>

                {/* Lesson */}
                <TableCell>
                  <p className="text-sm text-muted-foreground">
                    {report.baiHoc.tenBaiHoc}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {report.baiHoc.chuong.khoaHoc.tenKhoaHoc}
                  </p>
                </TableCell>

                {/* Report Count */}
                <TableCell className="text-center">
                  <Badge variant={report._count.baoCaos >= 3 ? "destructive" : "secondary"}>
                    {report._count.baoCaos}
                  </Badge>
                </TableCell>

                {/* Status */}
                <TableCell>
                  {report.trangThai === "AN" ? (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Đã ẩn
                    </Badge>
                  ) : (
                    <Badge variant="outline">Đang hiển thị</Badge>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedComment(report);
                          setActionType("view");
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Xem chi tiết
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedComment(report);
                          handleAction("approve");
                        }}
                        disabled={pending}
                      >
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        Phê duyệt (bỏ qua báo cáo)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedComment(report);
                          setActionType("delete");
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xóa bình luận
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedComment(report);
                          setActionType("ban");
                        }}
                        className="text-destructive"
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Xóa và cấm người dùng
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View Detail Modal */}
      <Dialog
        open={actionType === "view" && !!selectedComment}
        onOpenChange={() => {
          setActionType(null);
          setSelectedComment(null);
          setIsContentRevealed(false);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết bình luận</DialogTitle>
          </DialogHeader>
          {selectedComment && (
            <div className="space-y-6">
              {/* Content Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Nội dung bị báo cáo</p>
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/dashboard/${selectedComment.baiHoc.chuong.khoaHoc.duongDan}/${selectedComment.baiHoc.id}`}
                      target="_blank"
                      className="text-xs flex items-center text-blue-600 hover:underline"
                    >
                      Xem ngữ cảnh <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                    <Badge variant={selectedComment._count.baoCaos >= 3 ? "destructive" : "secondary"}>
                      {selectedComment._count.baoCaos} báo cáo
                    </Badge>
                  </div>
                </div>
                
                {selectedComment._count.baoCaos > 3 && !isContentRevealed ? (
                  <div className="bg-destructive/5 border-2 border-dashed border-destructive/20 p-8 rounded-xl text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="p-3 bg-white rounded-full shadow-sm">
                        <AlertTriangle className="w-8 h-8 text-destructive" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-destructive text-lg">
                        Nội dung nhạy cảm
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                        Hệ thống đã tự động ẩn nội dung này vì có số lượng báo cáo vượt ngưỡng an toàn.
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => setIsContentRevealed(true)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Xem nội dung gốc
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                    <blockquote className="pl-4 py-2 text-lg italic text-foreground/90 bg-muted/30 rounded-r-lg">
                      "{selectedComment.noiDung}"
                    </blockquote>
                  </div>
                )}
              </div>

              {/* Reporters Section */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Danh sách báo cáo ({selectedComment.baoCaos.length})
                </p>
                <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {selectedComment.baoCaos.map((bc) => (
                    <div key={bc.id} className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg border border-transparent hover:border-border transition-colors">
                      <Avatar className="h-8 w-8 shrink-0 border">
                        <AvatarImage src={bc.nguoiDung.image || ""} alt={bc.nguoiDung.name || "User"} />
                        <AvatarFallback>{bc.nguoiDung.name?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{bc.nguoiDung.name}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-background px-1.5 py-0.5 rounded border">
                            {formatDistanceToNow(new Date(bc.ngayTao), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{bc.lyDo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between items-center sm:items-center mt-6 pt-6 border-t">
            <Button variant="ghost" onClick={() => setActionType(null)} className="w-full sm:w-auto">
              Đóng
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => handleAction("approve")}
                disabled={pending}
                className="w-full sm:w-auto text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
              >
                <Check className="w-4 h-4 mr-2" />
                Khôi phục hiển thị
              </Button>
              <Button
                variant="outline"
                onClick={() => setActionType("delete")}
                disabled={pending}
                className="w-full sm:w-auto text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa
              </Button>
              <Button
                variant="destructive"
                onClick={() => setActionType("ban")}
                disabled={pending}
                className="w-full sm:w-auto shadow-sm hover:shadow transition-all"
              >
                <Ban className="w-4 h-4 mr-2" />
                Xóa & Cấm
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={actionType === "delete" && !!selectedComment}
        onOpenChange={() => {
          setActionType(null);
          setSelectedComment(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa bình luận</DialogTitle>
            <DialogDescription>
              Bình luận này sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionType(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction("delete")}
              disabled={pending}
            >
              {pending ? "Đang xóa..." : "Xóa bình luận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Confirmation Modal */}
      <Dialog
        open={actionType === "ban" && !!selectedComment}
        onOpenChange={() => {
          setActionType(null);
          setSelectedComment(null);
          setBanDuration("permanent");
          setBanReason("Vi phạm quy định bình luận");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cấm người dùng</DialogTitle>
            <DialogDescription>
              Bình luận sẽ bị xóa và người dùng <strong>{selectedComment?.nguoiDung.name}</strong> sẽ bị cấm.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Ban Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Thời hạn cấm</label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 ngày</SelectItem>
                  <SelectItem value="30">30 ngày</SelectItem>
                  <SelectItem value="90">90 ngày</SelectItem>
                  <SelectItem value="permanent">Vĩnh viễn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Ban Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do cấm</label>
              <Textarea 
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Nhập lý do cấm..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setActionType(null);
              setBanDuration("permanent");
              setBanReason("Vi phạm quy định bình luận");
            }}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction("ban")}
              disabled={pending || !banReason.trim()}
            >
              {pending ? "Đang xử lý..." : "Xác nhận cấm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
