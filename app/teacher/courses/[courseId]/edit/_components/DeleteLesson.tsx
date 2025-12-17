import {
  AlertDialogTrigger,
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { tryCatch } from "@/hooks/try-catch";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteLesson } from "../action";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DeleteLesson({
  idChuong,
  idKhoaHoc,
  idBaiHoc,
}: {
  idChuong: string;
  idKhoaHoc: string;
  idBaiHoc: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter()
  
  const [pending, startTransiton] = useTransition();

  async function onSubmit() {
    startTransiton(async () => {
      const { data: result, error } = await tryCatch(
        deleteLesson({
          idChuong,
          idKhoaHoc,
          idBaiHoc,
        })
      );
      if (error) {
        toast.error("Có lỗi xảy ra. Vui lòng hãy thử lại");
        return;
      }
      if (result.status === "success") {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });
  }
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="size-4"></Trash2>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Bạn có chắc chắn với quyết định này không?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này sẽ xóa <span className="font-medium text-primary">bài học</span> của bạn khỏi hệ thống. Bạn có muốn thực hiện điều này không
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ?"Đang xóa...":"Xóa"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
