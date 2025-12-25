import { Button, buttonVariants } from "@/components/ui/button";
import { useTransition } from "react";
import { enrollInCourseAction } from "../action";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import Link from "next/link";

interface EnrollmentButtonProps {
  courseId: string;
  couponCode?: string;
  isEnrolled?: boolean;
}

export function EnrollmentButton({ courseId, couponCode, isEnrolled }: EnrollmentButtonProps) {
  const [pending, startTransition] = useTransition();

  if (isEnrolled) {
     return (
        <Link href="/dashboard" className={buttonVariants({ className:"w-full" })}>
            Khu vực học tập
        </Link>
     )
  }

  function onSubmit() {
    startTransition(async () => {
      try {
        const result = await enrollInCourseAction(courseId, couponCode);

        // Nếu có message (lỗi hoặc đã mua rồi)
        if (result) {
          if (result.status === "success") {
            toast.success(result.message);
          } else if (result.status === "error") {
            toast.error(result.message);
          }
        }
        // Nếu không có return (redirect thành công), không làm gì
      } catch (error) {
        // Kiểm tra xem có phải NEXT_REDIRECT error không
        if (error && typeof error === "object" && "digest" in error) {
          // Đây là redirect error, bỏ qua (Next.js tự xử lý)
          return;
        }
        // Lỗi thật sự
        console.error("Enrollment error:", error);
        toast.error("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại");
      }
    });
  }

  return (
    <Button onClick={onSubmit} disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader className="size-4 animate-spin" />
          Đang chuyển hướng...
        </>
      ) : (
        "Mua Khóa Học Ngay"
      )}
    </Button>
  );
}