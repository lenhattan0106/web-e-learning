"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconExternalLink, IconHistory, IconTrash, IconBan, IconMessageReport, IconBook, IconRefresh, IconEye, IconUserX, IconChevronLeft, IconChevronRight, IconTrashX } from "@tabler/icons-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import type { AdminLogsResult } from "@/app/data/admin/get-admin-logs";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteActivityLog } from "../actions";

type SnapshotMeta = {
  reportReason?: string;
  courseName?: string;
  courseSlug?: string;
  courseId?: string;
  content?: string;
  authorName?: string;
  reporter?: {
    id?: string;
    name: string;
    image: string | null;
    role?: string | null;
  };
};

type ParsedSystemReason = {
  __reportType?: string;
  objectType?: string;
  type?: string;
  currentName?: string;
  newName?: string;
  reason?: string;
};

interface ActivityLogsClientProps {
  logsResult: AdminLogsResult;
  admins: { id: string; name: string; image: string | null }[];
  summary: {
    totalLogs: number;
    todayLogs: number;
    actionCounts: Record<string, number>;
  };
  currentFilters: {
    page: number;
    loaiBaoCao?: string;
    hanhDong?: string;
    adminId?: string;
  };
}

const ACTION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  XOA_NOI_DUNG: { label: "Xóa nội dung", color: "bg-orange-100 text-orange-800", icon: <IconTrash className="h-3 w-3" /> },
  CAM_USER: { label: "Cấm người dùng", color: "bg-red-100 text-red-800", icon: <IconUserX className="h-3 w-3" /> },
  BO_QUA: { label: "Bỏ qua", color: "bg-gray-100 text-gray-800", icon: <IconEye className="h-3 w-3" /> },
  CHAN_KHOA_HOC: { label: "Chặn khóa học", color: "bg-purple-100 text-purple-800", icon: <IconBan className="h-3 w-3" /> },
};

export function ActivityLogsClient({
  logsResult,
  admins,
  summary,
  currentFilters,
}: ActivityLogsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isPending, startTransition] = useTransition();
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`/admin/activity-logs?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/admin/activity-logs?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/admin/activity-logs");
  };

  const handleDeleteClick = (logId: string) => {
    setDeleteLogId(logId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteLogId) return;
    
    startTransition(async () => {
      try {
        await deleteActivityLog(deleteLogId);
        setShowDeleteDialog(false);
        setDeleteLogId(null);
        router.refresh();
      } catch (error) {
        console.error("Failed to delete log:", error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tổng xử lý</p>
              <div className="text-2xl font-bold text-blue-700">{summary.totalLogs}</div>
            </div>
            <IconHistory className="h-8 w-8 text-blue-200" />
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hôm nay</p>
              <div className="text-2xl font-bold text-green-700">{summary.todayLogs}</div>
            </div>
             <IconHistory className="h-8 w-8 text-green-200" />
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Xóa nội dung</p>
              <div className="text-2xl font-bold text-orange-700">{summary.actionCounts["XOA_NOI_DUNG"] || 0}</div>
            </div>
            <IconTrash className="h-8 w-8 text-orange-200" />
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cấm người dùng</p>
              <div className="text-2xl font-bold text-red-700">{summary.actionCounts["CAM_USER"] || 0}</div>
            </div>
            <IconUserX className="h-8 w-8 text-red-200" />
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:w-auto">
             <div className="min-w-37.5">
              <Select
                value={currentFilters.loaiBaoCao || "all"}
                onValueChange={(value) => updateFilter("loaiBaoCao", value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Loại báo cáo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="BINH_LUAN">Bình luận</SelectItem>
                  <SelectItem value="KHOA_HOC">Khóa học</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-37.5">
              <Select
                value={currentFilters.hanhDong || "all"}
                onValueChange={(value) => updateFilter("hanhDong", value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Hành động" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả hành động</SelectItem>
                  <SelectItem value="XOA_NOI_DUNG">Xóa nội dung</SelectItem>
                  <SelectItem value="CAM_USER">Cấm người dùng</SelectItem>
                  <SelectItem value="BO_QUA">Bỏ qua / Duyệt</SelectItem>
                  <SelectItem value="CHAN_KHOA_HOC">Chặn khóa học</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-37.5">
              <Select
                value={currentFilters.adminId || "all"}
                onValueChange={(value) => updateFilter("adminId", value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Admin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả Admin</SelectItem>
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
        </div>
        
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground h-9">
          <IconRefresh className="h-4 w-4 mr-2" />
          Xóa bộ lọc
        </Button>
      </div>

      {/* Logs Table */}
      <Card className="shadow-sm border-0 ring-1 ring-slate-200">
        <CardContent className="p-0">
          <TooltipProvider delayDuration={0}>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-40">Thời gian</TableHead>
                  <TableHead className="w-60">Đối tượng xử lý</TableHead>
                  <TableHead className="w-35">Hành động</TableHead>
                  <TableHead className="w-45">Ghi chú xử lý</TableHead>
                  <TableHead className="w-70">Lý do báo cáo</TableHead>
                  <TableHead className="w-45">Người yêu cầu</TableHead>
                  <TableHead className="w-20">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsResult.logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <IconHistory className="h-10 w-10 text-slate-200" />
                        <p>Chưa có nhật ký hoạt động nào</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {logsResult.logs.map((log) => {
                      // Prepare Data
                      let contentInfo = null;
                      let originalReason = "";
                      let originalReasonFull = "";
                      let reporter: { name: string; image: string | null; role?: string | null } | null = null;
                      let isSystemRequest = false;
                      let parsedReason: ParsedSystemReason | null = null;
                      let actionVerb = "Xử lý";
                      let objectNoun = "Khóa học";

                      if (log.loaiBaoCao === "KHOA_HOC") {
                        // Try to parse snapshot from lyDoXuLy (for deleted reports)
                        let snapshot: SnapshotMeta | null = null;
                        let adminNoteDisplay = log.lyDoXuLy || "";
                        
                        if (log.lyDoXuLy && log.lyDoXuLy.trim().startsWith("{")) {
                          try {
                            const parsed = JSON.parse(log.lyDoXuLy);
                            if (parsed.meta) {
                              snapshot = parsed.meta;
                              adminNoteDisplay = parsed.note || "";
                            }
                          } catch {}
                        }

                        if (log.baoCaoKhoaHoc) {
                          const courseName = log.baoCaoKhoaHoc.khoaHoc.tenKhoaHoc;
                          const courseSlug = log.baoCaoKhoaHoc.khoaHoc.duongDan;
                          originalReason = log.baoCaoKhoaHoc.lyDo;
                          reporter = {
                            name: log.baoCaoKhoaHoc.nguoiDung.name,
                            image: log.baoCaoKhoaHoc.nguoiDung.image,
                            role: log.baoCaoKhoaHoc.nguoiDung.role,
                          };
                          originalReasonFull = originalReason;

                          if (originalReason.trim().startsWith("{")) {
                            try {
                              parsedReason = JSON.parse(originalReason);
                              isSystemRequest = parsedReason?.__reportType === "SYSTEM_REQUEST" 
                                || parsedReason?.objectType === "CATEGORY" 
                                || parsedReason?.objectType === "LEVEL";
                            } catch {}
                          }

                          contentInfo = (
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 line-clamp-1" title={courseName}>
                                {courseName}
                              </span>
                              <a 
                                href={`/courses/${courseSlug}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                Xem khóa học <IconExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          );
                        } else if (snapshot) {
                          const courseName = snapshot.courseName || "Không xác định";
                          const courseSlug = snapshot.courseSlug;
                          originalReason = snapshot.reportReason || "";
                          originalReasonFull = originalReason;
                          reporter = snapshot.reporter || null;

                          if (originalReason.trim().startsWith("{")) {
                            try {
                              parsedReason = JSON.parse(originalReason);
                              isSystemRequest = parsedReason?.__reportType === "SYSTEM_REQUEST" 
                                || parsedReason?.objectType === "CATEGORY" 
                                || parsedReason?.objectType === "LEVEL";
                                
                              if (isSystemRequest && parsedReason) {
                                actionVerb = parsedReason.type?.includes("EDIT") ? "Sửa" : parsedReason.type?.includes("DELETE") ? "Xóa" : "Xử lý";
                                objectNoun = parsedReason.objectType === "CATEGORY" ? "Danh mục" 
                                           : parsedReason.objectType === "LEVEL" ? "Cấp độ" 
                                           : parsedReason.objectType || "Khóa học";
                                
                                if (parsedReason.type?.includes("DELETE")) {
                                  originalReasonFull = `${actionVerb} ${objectNoun.toLowerCase()} "${parsedReason.currentName}"\nLý do: ${parsedReason.reason}`;
                                  originalReason = originalReasonFull;
                                } else if (parsedReason.type?.includes("EDIT")) {
                                  originalReasonFull = `${actionVerb} ${objectNoun.toLowerCase()} "${parsedReason.currentName}" → "${parsedReason.newName}"\nLý do: ${parsedReason.reason}`;
                                  originalReason = originalReasonFull;
                                } else {
                                  originalReasonFull = parsedReason.reason || originalReason;
                                  originalReason = parsedReason.reason || originalReason;
                                }
                              } else {
                                originalReasonFull = originalReason;
                              }
                            } catch {
                              originalReasonFull = originalReason;
                            }
                          }

                          contentInfo = courseSlug ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 line-clamp-1" title={courseName}>
                                {courseName}
                              </span>
                              <a 
                                href={`/courses/${courseSlug}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                Xem khóa học <IconExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <IconBook className="h-4 w-4 text-amber-500" />
                              <span className="font-medium text-slate-700">{courseName}</span>
                            </div>
                          );
                          
                          log.lyDoXuLy = adminNoteDisplay;
                        } else {
                          contentInfo = (
                            <div className="flex items-center gap-2 text-muted-foreground italic text-sm">
                              <IconBook className="h-4 w-4" />
                              <span>Khóa học đã bị xóa</span>
                            </div>
                          );
                          originalReason = "Nội dung không còn tồn tại";
                        }

                      } else if (log.loaiBaoCao === "BINH_LUAN") {
                        let snapshot: SnapshotMeta | null = null;
                        let adminNoteDisplay = log.lyDoXuLy || "";
                        
                        if (log.lyDoXuLy && log.lyDoXuLy.trim().startsWith("{")) {
                           try {
                             const parsed = JSON.parse(log.lyDoXuLy);
                             if (parsed.meta) {
                               snapshot = parsed.meta;
                               adminNoteDisplay = parsed.note || "";
                               log.lyDoXuLy = adminNoteDisplay; 
                             }
                           } catch {}
                        }

                        let commentContent = "Nội dung không còn tồn tại";
                        let authorName = "Tác giả";

                        if (log.baoCaoBinhLuan) {
                          originalReason = log.baoCaoBinhLuan.lyDo;
                          originalReasonFull = originalReason;
                          reporter = {
                            name: log.baoCaoBinhLuan.nguoiDung.name,
                            image: log.baoCaoBinhLuan.nguoiDung.image,
                            role: log.baoCaoBinhLuan.nguoiDung.role,
                          };
                          commentContent = log.baoCaoBinhLuan.binhLuan?.noiDung || "Nội dung không còn tồn tại";
                          authorName = log.baoCaoBinhLuan.binhLuan?.nguoiDung.name || "Tác giả";
                        } else if (snapshot) {
                           originalReason = snapshot.reportReason || "";
                           originalReasonFull = originalReason;
                           reporter = snapshot.reporter || null;
                           commentContent = snapshot.content || "Nội dung đã bị xóa";
                           authorName = snapshot.authorName || "Tác giả";
                        } else {
                           commentContent = "Bình luận đã bị xóa";
                           authorName = "Không xác định";
                           originalReason = "Nội dung không còn tồn tại";
                        }

                        if (authorName !== "Không xác định" || commentContent !== "Bình luận đã bị xóa") {
                          contentInfo = (
                            <div className="space-y-1.5">
                              <div className="flex items-start gap-2">
                                <IconMessageReport className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-slate-700">Comment của {authorName}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-2 italic bg-slate-50 p-1 rounded mt-0.5 border border-slate-100">
                                    &quot;{commentContent}&quot;
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          contentInfo = (
                            <div className="flex items-center gap-2 text-muted-foreground italic text-sm">
                              <IconMessageReport className="h-4 w-4" />
                              <span>Bình luận đã bị xóa</span>
                            </div>
                          );
                        }
                      }

                      let displayedAction = log.hanhDong;
                      let displayedAdminNote = log.lyDoXuLy;

                      if (isSystemRequest && log.hanhDong === "BO_QUA") {
                         displayedAction = "DUYET_YEU_CAU";
                         if (!displayedAdminNote || displayedAdminNote === "Không vi phạm") {
                           displayedAdminNote = "Đã thực hiện thay đổi";
                         }
                      }

                      const getActionBadge = (actionCode: string) => {
                         if (actionCode === "DUYET_YEU_CAU") {
                           return <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-200 border-teal-200 gap-1"><span className="text-xs">✔</span> Đã duyệt và xử lý</Badge>;
                         }
                         const conf = ACTION_LABELS[actionCode];
                         if (conf) {
                           return <Badge className={`${conf.color} border-0 gap-1`}>{conf.icon} {conf.label}</Badge>;
                         }
                         return <Badge variant="outline">{actionCode}</Badge>;
                      };
                      
                      return (
                        <TableRow key={log.id} className="group hover:bg-slate-50/50 transition-colors">
                          {/* Thời gian & Admin */}
                          <TableCell className="align-top py-4">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-sm font-medium text-slate-900">
                                {formatDistanceToNow(new Date(log.ngayTao), {
                                  addSuffix: true,
                                  locale: vi,
                                })}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Avatar className="h-5 w-5 border border-slate-200">
                                  <AvatarImage src={log.admin?.image || ""} />
                                  <AvatarFallback className="text-[9px] bg-slate-100">
                                    {log.admin?.name?.[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-25" title={log.admin?.name}>{log.admin?.name}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Đối tượng xử lý */}
                          <TableCell className="align-top py-4">
                            {contentInfo}
                          </TableCell>

                          {/* Hành động */}
                          <TableCell className="align-top py-4">
                            <div className="flex flex-col gap-1 items-start">
                               {getActionBadge(displayedAction)}
                              {log.thoiHanCam && (
                                  <Badge variant="destructive" className="text-[10px] h-5 px-1.5 mt-1">
                                    Cấm {log.thoiHanCam} ngày
                                  </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Lý do xử lý */}
                          <TableCell className="align-top py-4">
                            <p className="text-sm text-slate-700 leading-snug line-clamp-2">
                              {displayedAdminNote || <span className="text-muted-foreground/50 italic text-xs">Không có ghi chú</span>}
                            </p>
                          </TableCell>

                          {/* Nội dung gốc - SEPARATE COLUMN */}
                          <TableCell className="align-top py-4">
                           <div className="flex flex-col gap-1">
                              {isSystemRequest && parsedReason ? (
                                // Structured display for System Requests
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-slate-800">
                                    {actionVerb} {objectNoun.toLowerCase()} &quot;{parsedReason.currentName}&quot;
                                    {parsedReason.newName && <> → &quot;{parsedReason.newName}&quot;</>}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">Lý do:</span> {parsedReason.reason}
                                  </p>
                                </div>
                              ) : (
                                // Regular display for normal reports
                                <Tooltip>
                                  <TooltipTrigger>
                                    <p className="text-sm text-slate-600 line-clamp-3 leading-snug wrap-break-word text-left">
                                      {originalReason}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-100 p-3 text-sm">
                                    {originalReasonFull}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                           </div>
                          </TableCell>

                          {/* Người yêu cầu - NEW SEPARATE COLUMN */}
                          <TableCell className="align-top py-4">
                            {reporter ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8 border border-slate-200">
                                  <AvatarImage src={reporter.image || ""} />
                                  <AvatarFallback className="text-xs bg-slate-100">{reporter.name?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-slate-900 truncate max-w-32.5" title={reporter.name}>
                                  {reporter.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Không xác định</span>
                            )}
                          </TableCell>

                          {/* Thao tác - NEW COLUMN FOR ACTIONS */}
                          <TableCell className="align-top py-4">
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteClick(log.id)} 
                                className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <IconTrashX className="h-5 w-5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Pagination */}
      {logsResult.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
           <p className="text-sm text-muted-foreground md:block hidden">
            Trang {logsResult.currentPage} / {logsResult.totalPages} ({logsResult.totalCount} kết quả)
          </p>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(logsResult.currentPage - 1)}
              disabled={logsResult.currentPage === 1}
              className="h-8 shadow-sm"
            >
              <IconChevronLeft className="h-4 w-4 mr-1" /> Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(logsResult.currentPage + 1)}
              disabled={logsResult.currentPage === logsResult.totalPages}
              className="h-8 shadow-sm"
            >
              Sau <IconChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa nhật ký hoạt động</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa nhật ký hoạt động này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
