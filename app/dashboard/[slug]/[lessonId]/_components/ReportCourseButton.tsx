"use client";

import { useState, useTransition } from "react";
import { Flag, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { tryCatch } from "@/hooks/try-catch";
import { reportCourse } from "../_actions/report-course-actions";

// Lý do báo cáo từ LESSON PAGE (có lessonId) - Tập trung vào lỗi kỹ thuật
const LESSON_REPORT_REASONS = [
  "Video không hiển thị hoặc lỗi âm thanh",
  "Lỗi kỹ thuật/Không thể xem bài học",
  "Bài tập/Quiz bị lỗi",
  "Phụ đề sai hoặc thiếu",
  "Khác",
] as const;

// Lý do báo cáo từ DASHBOARD (không có lessonId) - Vấn đề tổng thể
const GENERAL_REPORT_REASONS = [
  "Nội dung không đúng với mô tả",
  "Kiến thức sai lệch hoặc lỗi thời", 
  "Khóa học có dấu hiệu lừa đảo",
  "Vi phạm chính sách nội dung",
  "Không thể truy cập khóa học",
  "Khác",
] as const;

interface ReportCourseButtonProps {
  courseId: string;
  courseName: string;
  lessonId?: string; // Auto-attached lesson context
  hasReported?: boolean; // Pre-check if user already reported
}

export function ReportCourseButton({
  courseId,
  courseName,
  lessonId,
  hasReported = false,
}: ReportCourseButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();
  const [alreadyReported, setAlreadyReported] = useState(hasReported);

  const handleSubmit = () => {
    if (!selectedReason) {
      toast.error("Vui lòng chọn lý do báo cáo");
      return;
    }

    startTransition(async () => {
      const { data, error } = await tryCatch(
        reportCourse({
          courseId,
          reason: selectedReason,
          details: details.trim() || undefined,
          lessonId,
        })
      );

      if (error) {
        toast.error("Không thể gửi báo cáo. Vui lòng thử lại.");
        return;
      }

      if (data.status === "success") {
        toast.success(data.message);
        setSelectedReason("");
        setDetails("");
        setOpen(false);
        setAlreadyReported(true);
      } else {
        toast.error(data.message);
        // Mark as already reported if that was the error
        if (data.message.includes("đã báo cáo")) {
          setAlreadyReported(true);
        }
      }
    });
  };

  // Already reported state
  if (alreadyReported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="text-muted-foreground gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Đã báo cáo</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Bạn đã báo cáo khóa học này. Vui lòng chờ Admin xử lý.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive gap-2"
              >
                <Flag className="h-4 w-4" />
                <span className="hidden sm:inline">Báo cáo</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Báo cáo khóa học vi phạm hoặc lỗi kỹ thuật</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Báo cáo khóa học
          </DialogTitle>
          <DialogDescription>
            Báo cáo về &quot;{courseName}&quot;
            {lessonId && (
              <span className="text-xs block mt-1 text-muted-foreground">
                📍 Ngữ cảnh: đang học bài giảng
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reason Selection - khác nhau dựa vào context */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Lý do báo cáo</p>
            {(lessonId ? LESSON_REPORT_REASONS : GENERAL_REPORT_REASONS).map((reason) => (
              <button
                key={reason}
                className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors ${
                  selectedReason === reason
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                }`}
                onClick={() => setSelectedReason(reason)}
                disabled={pending}
              >
                {reason}
              </button>
            ))}
          </div>

          {/* Details Textarea (Optional) */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Chi tiết <span className="text-muted-foreground">(tùy chọn)</span>
            </p>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Mô tả thêm về vấn đề bạn gặp phải..."
              className="min-h-[80px] resize-none"
              disabled={pending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={pending || !selectedReason}
          >
            {pending ? "Đang gửi..." : "Gửi báo cáo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
