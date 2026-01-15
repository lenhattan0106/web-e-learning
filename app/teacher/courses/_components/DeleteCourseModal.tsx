"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { tryCatch } from "@/hooks/try-catch";
import { Archive, Loader2, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { DeleteCourse, ArchiveCourse } from "../[courseId]/delete/actions";

interface DeleteCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  hasStudents: boolean;
  studentCount: number;
}

export function DeleteCourseModal({
  isOpen,
  onClose,
  courseId,
  courseName,
  hasStudents,
  studentCount,
}: DeleteCourseModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function handleDelete() {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(DeleteCourse(courseId));
      if (error) {
        toast.error("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại");
        return;
      }
      if (result.status === "success") {
        toast.success(result.message);
        onClose();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  async function handleArchive() {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(ArchiveCourse(courseId));
      
      if (error) {
        toast.error("Không thể lưu trữ khóa học. Vui lòng thử lại");
        return;
      }

      if (result.status === "success") {
        toast.success(result.message);
        onClose();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-4">
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${hasStudents ? 'bg-amber-100' : 'bg-red-100'}`}>
              {hasStudents ? (
                <Users className="size-6 text-amber-600" />
              ) : (
                <Trash2 className="size-6 text-red-600" />
              )}
            </div>
            <div>
              <AlertDialogTitle className="text-lg">
                {hasStudents ? "Khóa học đang có học viên!" : "Xác nhận xóa khóa học?"}
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2" asChild>
            <div>
              {hasStudents ? (
                <>
                  <p>
                    Khóa học{" "}
                    <span className="font-semibold text-foreground">"{courseName}"</span>{" "}
                    hiện có{" "}
                    <span className="font-semibold text-primary">{studentCount} học viên</span>{" "}
                    đã đăng ký. Để đảm bảo quyền lợi của họ, bạn không thể xóa hoàn toàn.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-3 border">
                    <p className="text-sm font-medium mb-1">💡 Gợi ý: Chuyển sang Lưu trữ</p>
                    <p className="text-sm text-muted-foreground">
                      Học viên cũ vẫn có thể truy cập nội dung, nhưng khóa học sẽ không hiển thị
                      trên cửa hàng cho người mới nữa.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Bạn có chắc chắn muốn xóa khóa học{" "}
                    <span className="font-semibold text-foreground">"{courseName}"</span>?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Hành động này sẽ xóa tất cả dữ liệu bao gồm: chương học, bài học, video và tài liệu đính kèm.
                  </p>
                  <p className="text-sm font-semibold text-destructive">
                    ⚠️ Hành động này không thể hoàn tác!
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          {hasStudents ? (
            <Button
              onClick={handleArchive}
              disabled={pending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Archive className="size-4 mr-2" />
                  Chuyển sang Lưu trữ
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleDelete}
              disabled={pending}
              variant="destructive"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                <>
                  <Trash2 className="size-4 mr-2" />
                  Xác nhận xóa
                </>
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
