import { TeacherCourseType } from "@/app/data/teacher/get-courses";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useConstructUrl } from "@/hooks/use-contruct-url";
import {
  ArrowRight,
  Eye,
  MoreVertical,
  Pencil,
  School2,
  TimerIcon,
  Trash,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface iAppProps {
  data: TeacherCourseType;
}

export function TeacherCourseCard({ data }: iAppProps) {
  const thumbnailUrl = useConstructUrl(data.tepKH);
  return (
    <Card className="group relative py-0 gap-0">
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/teacher/courses/${data.id}/edit`}>
                <Pencil className="size-4 mr-2" />
                Chỉnh sửa
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/courses/${data.duongDan}`}>
                <Eye className="size-4 mr-2" />
                Xem khóa học
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/teacher/courses/${data.id}/delete`}>
                <Trash className="size-4 mr-2 text-destructive" />
                Xóa khóa học
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Image
        src={thumbnailUrl}
        alt="Hình ảnh khóa học"
        width={600}
        height={400}
        className="w-full rounded-t-lg aspect-video h-full object-cover"
      />
      <CardContent className="p-4">
        <Link
          href={`/teacher/courses/${data.id}/edit`}
          className="font-medium text-lg line-clamp-2 hover:underline group-hover:text-primary transition-colors"
        >
          {data.tenKhoaHoc}
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground leading-tight mt-2">
          {data.moTaNgan}
        </p>
        <div className="mt-4 flex items-center gap-x-5">
          <div className="flex items-center gap-x-1.5">
            <School2 className="size-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{data.capDo}</p>
          </div>
          <div className="flex items-center gap-x-1.5">
            <TimerIcon className="size-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{data.thoiLuong}h</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-lg font-semibold">
            {new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(data.gia)}
          </p>
          <Link
            href={`/teacher/courses/${data.id}/edit`}
            className={buttonVariants({ size: "sm" })}
          >
            Chỉnh sửa
            <ArrowRight className="size-4 ml-1" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function TeacherCourseCardSkeleton() {
  return (
    <Card className="py-0 gap-0">
      <Skeleton className="w-full aspect-video rounded-t-lg" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-x-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
