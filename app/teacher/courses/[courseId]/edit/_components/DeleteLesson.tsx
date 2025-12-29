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
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 text-neutral-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[95vw] max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-4">
             <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="size-5 text-red-600" />
             </div>
             <div>
                <AlertDialogTitle>Xóa bài học này?</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                   Bạn đang xóa một bài học. Hành động này <span className="font-bold text-red-600">không thể hoàn tác</span>. Bạn có chắc chắn muốn tiếp tục không?
                </AlertDialogDescription>
             </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Hủy bỏ</AlertDialogCancel>
          <Button 
            onClick={onSubmit} 
            disabled={pending} 
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {pending ? "Đang xóa..." : "Xóa ngay"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
