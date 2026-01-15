"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Send, Info, Users, BookOpen, GraduationCap } from "lucide-react";
import { useState } from "react";

interface ImpactData {
  courses: number;
  students: number;
  teachers?: number;
}

interface ImpactWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "CATEGORY" | "LEVEL";
  name: string;
  action: "EDIT" | "DELETE";
  impact: ImpactData;
  onSubmitReport: (data: { newName?: string; reason: string }) => Promise<void>;
}

export function ImpactWarningDialog({
  open,
  onOpenChange,
  type,
  name,
  action,
  impact,
  onSubmitReport,
}: ImpactWarningDialogProps) {
  const [newName, setNewName] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    if (action === "EDIT" && !newName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmitReport({
        newName: action === "EDIT" ? newName : undefined,
        reason: reason.trim(),
      });
      
      setNewName("");
      setReason("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeLabel = type === "CATEGORY" ? "danh mục" : "cấp độ";
  const actionLabel = action === "EDIT" ? "chỉnh sửa" : "xóa";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">Cần phê duyệt từ Admin</DialogTitle>
              <DialogDescription className="mt-1">
                {typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} đang được sử dụng
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Impact Stats */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <h4 className="font-semibold text-sm">
                {typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}:{" "}
                <span className="text-foreground">&quot;{name}&quot;</span>
              </h4>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center rounded-md border bg-background p-3">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1.5" />
                <span className="text-2xl font-bold">{impact.courses}</span>
                <span className="text-xs text-muted-foreground">Khóa học</span>
              </div>
              
              <div className="flex flex-col items-center rounded-md border bg-background p-3">
                <GraduationCap className="h-5 w-5 text-green-600 dark:text-green-400 mb-1.5" />
                <span className="text-2xl font-bold">{impact.students}</span>
                <span className="text-xs text-muted-foreground">Học viên</span>
              </div>
              
              {impact.teachers && impact.teachers > 1 && (
                <div className="flex flex-col items-center rounded-md border bg-background p-3">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-1.5" />
                  <span className="text-2xl font-bold">{impact.teachers}</span>
                  <span className="text-xs text-muted-foreground">Giáo viên</span>
                </div>
              )}
            </div>
            
            <Alert className="mt-3 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <AlertDescription className="text-sm text-amber-900 dark:text-amber-200">
                Để bảo vệ quyền lợi học viên, thay đổi cần được admin phê duyệt
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* Request Form */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Send className="h-4 w-4" />
                Gửi yêu cầu đến Admin
              </h4>
              <p className="text-sm text-muted-foreground">
                Nếu cần {actionLabel} do lỗi nghiêm trọng, vui lòng điền thông tin bên dưới
              </p>
            </div>

            <div className="space-y-3">
              {action === "EDIT" && (
                <div className="space-y-1.5">
                  <Label htmlFor="newName" className="text-sm font-medium">
                    Tên mới <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="newName"
                    placeholder={`Nhập tên ${typeLabel} mới...`}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-10"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="reason" className="text-sm font-medium">
                  Lý do yêu cầu <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder={`VD: Tên hiện tại "${name}" sai chính tả nghiêm trọng...`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Admin sẽ xem xét trong vòng 24 giờ
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="sm:mr-2"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !reason.trim() ||
              (action === "EDIT" && !newName.trim())
            }
          >
            {isSubmitting ? (
              <>Đang gửi...</>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Gửi yêu cầu
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
