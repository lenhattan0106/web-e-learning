import { AdminCourseType } from "@/app/data/admin/get-courses";
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
  data: AdminCourseType;
}

export function TeacherCourseCard({ data }: iAppProps) {
  const thumbnailUrl = useConstructUrl(data.fileKey);
  return (
    <Card className="group relative py-0 gap-0">
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon">
              <MoreVertical className="size-4"></MoreVertical>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/admin/courses/${data.id}/edit`}>
                <Pencil className="size-4 mr-2"></Pencil>
                Chỉnh sửa
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/courses/${data.slug}`}>
                <Eye className="size-4 mr-2"></Eye>
                Xem khóa học
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator></DropdownMenuSeparator>
            <DropdownMenuItem asChild>
              <Link href={`/admin/courses/${data.id}/delete`}>
                <Trash className="size-4 mr-2 text-destructive"></Trash>
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
      ></Image>
      <CardContent className="p-4">
        <Link
          href={`/admin/courses/${data.id}`}
          className="font-medium text-lg line-clamp-2 hover:underline group-hover:text-primary transition-colors"
        >
          {data.title}
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground leading-tight mt-2">
          {data.smallDescription}
        </p>
        <div className="mt-4 flex items-center gap-x-5">
          <div className="flex items-center gap-2">
            <TimerIcon className="size-6 p-1 rounded-md text-primary bg-primary/10"></TimerIcon>
            <p className="text-md text-muted-foreground">{data.duration}h</p>
          </div>
          <div className="flex items-center gap-2">
            <School2 className="size-6 p-1 rounded-md text-primary bg-primary/10"></School2>
            <p className="text-md text-muted-foreground">{data.level}</p>
          </div>
        </div>
        <Link
          className={buttonVariants({
            className: "w-full mt-4",
          })}
          href={`/admin/courses/${data.id}/edit`}
        >
          Chỉnh sửa khóa học <ArrowRight className="size-4"></ArrowRight>
        </Link>
      </CardContent>
    </Card>
  );
}

export function TeacherCourseCardSkeleton() {
  return (
    <Card className="group relative py-0 gap-0">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <Skeleton className="h-6 w-16 rounded-full"></Skeleton>
        <Skeleton className="size-8 rounded-md"></Skeleton>
      </div>
      <div className="w-full relative h-fit">
        <Skeleton className="w-full rounded-t-lg aspect-video h-[250px] object-cover"></Skeleton>
      </div>
      <CardContent className="p-4">
        <Skeleton className="h-6 w-3/4 mb-2 rounded"></Skeleton>
        <Skeleton className=" h-4 w-full mb-4 rounded"></Skeleton>
        <div className="mt-4 flex items-center gap-x-5">
          <div className="flex items-center gap-x-2">
            <Skeleton className="size-6 rounded-md"></Skeleton>
            <Skeleton className="h-4 w-10 rounded-md"></Skeleton>
          </div>
           <div className="flex items-center gap-x-2">
            <Skeleton className="size-6 rounded-md"></Skeleton>
            <Skeleton className="h-4 w-10 rounded-md"></Skeleton>
          </div>
        </div>
        <Skeleton className="mt-4 h-10 w-full rounded"></Skeleton>
      </CardContent>
    </Card>
  );
}
