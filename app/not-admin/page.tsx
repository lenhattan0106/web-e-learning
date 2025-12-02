import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShieldX } from "lucide-react";
import Link from "next/link";

export default function NotAdminRoute(){
    return(
        <div className="min-h-screen flex items-center justify-center">
            <Card className="max-w-md w-full">
               <CardHeader className="text-center">
                  <div className="bg-destructive/10 rounded-full p-4 w-fit mx-auto">
                    <ShieldX className="size-16 text-destructive"></ShieldX>
                  </div>
               <CardTitle className="text-2xl">Truy Cập Bị Hạn Chế</CardTitle>
               <CardDescription className="max-w-sm">
                  Xin chào! Bạn không có quyền truy cập tính năng này. 
                  Chỉ giáo viên mới có thể tạo và quản lý khóa học. 
                  Nếu bạn là giáo viên, vui lòng liên hệ quản trị viên để được cấp quyền.
               </CardDescription>
               </CardHeader>
               <CardContent>
                  <Link href="/" className={buttonVariants({
                    className:"w-full"
                  })}>
                  <ArrowLeft className="mr-1 size-4"></ArrowLeft>
                  Quay về trang chủ
                  </Link>
               </CardContent>
            </Card>
        </div>
    )
}