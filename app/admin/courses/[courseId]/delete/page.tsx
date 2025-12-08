"use client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { tryCatch } from "@/hooks/try-catch";
import Link from "next/link";
import { useTransition } from "react";
import { deleteCourse } from "./actions";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

export default function DeleteCourseRoute(){
    const [pending,startTransition] = useTransition();
    const router = useRouter();

    const {courseId} = useParams<{courseId:string}>()
      function onSubmit() {
        startTransition(async () => {
          const { data: result, error } = await tryCatch(deleteCourse(courseId));
          if (error) {
            toast.error("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại");
            return;
          }
          if (result.status === "success") {
            toast.success(result.message);
            router.push("/admin/courses");
          } else if (result.status === "error") {
            toast.error(result.message);
          }
        });
      }
      
    return(
        <div className="max-w-xl mx-auto w-full">
            <Card className="mt-32 border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-xl">
                        Xác nhận xóa khóa học
                    </CardTitle>
                    <CardDescription className="text-base space-y-2">
                        <p>Bạn có chắc chắn muốn <span className="font-semibold text-destructive">xóa vĩnh viễn</span> khóa học này?</p>
                        <p className="text-sm">
                             Hành động này sẽ xóa tất cả dữ liệu liên quan bao gồm:
                        </p>
                        <ul className="text-sm list-disc list-inside ml-2 space-y-1">
                            <li>Tất cả các chương học</li>
                            <li>Tất cả các bài học</li>
                            <li>Video và tài liệu nội dung đính kèm</li>
                            <li>Dữ liệu học viên đã đăng ký</li>
                        </ul>
                        <p className="font-semibold text-destructive">Hành động này không thể hoàn tác!</p>
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                    <Link className={buttonVariants({variant:"outline", className:"flex-1"})} href="/admin/courses">
                     Hủy bỏ
                    </Link>
                    <Button variant="destructive" onClick={onSubmit} disabled={pending} className="flex-1">
                        {pending ? (
                            <>
                            <Loader2 className="size-4 animate-spin"></Loader2>
                             Đang xóa...
                            </>
                        ):(
                            <>
                            <Trash2 className="size-4"></Trash2>
                            Xác nhận xóa
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}