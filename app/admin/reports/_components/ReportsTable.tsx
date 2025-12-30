"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
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
} from "lucide-react";
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
          result = await tryCatch(
            deleteAndBanUser(
              selectedComment.id,
              selectedComment.idNguoiDung,
              "Vi phạm quy định bình luận"
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
                    {report.nguoiDung.image ? (
                      <Image
                        src={report.nguoiDung.image}
                        alt={report.nguoiDung.name}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                    )}
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
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết bình luận</DialogTitle>
          </DialogHeader>
          {selectedComment && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nội dung</p>
                <p className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedComment.noiDung}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Lý do báo cáo ({selectedComment.baoCaos.length})
                </p>
                <div className="space-y-2">
                  {selectedComment.baoCaos.map((bc) => (
                    <div key={bc.id} className="p-2 bg-muted/50 rounded text-sm">
                      <p className="font-medium">{bc.nguoiDung.name}</p>
                      <p className="text-muted-foreground">{bc.lyDo}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(bc.ngayTao), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionType(null)}>
              Đóng
            </Button>
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
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận cấm người dùng</DialogTitle>
            <DialogDescription>
              Bình luận sẽ bị xóa và người dùng <strong>{selectedComment?.nguoiDung.name}</strong> sẽ bị cấm vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionType(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction("ban")}
              disabled={pending}
            >
              {pending ? "Đang xử lý..." : "Xóa và cấm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
