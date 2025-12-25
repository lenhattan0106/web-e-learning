import { PublicCourseType } from "@/app/data/course/get-all-courses";
import { checkIfCourseBought } from "@/app/data/user/user-is-enrolled";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { School2, TimerIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { env } from "@/lib/env";

interface iAppProps {
  data: PublicCourseType;
}

export async function PublicCourseCard({ data }: iAppProps) {
  const isEnrolled = await checkIfCourseBought(data.id);

  return (
    <Card className="group relative py-0 gap-0">
      <Badge className="absolute top-2 right-2 z-10 rounded">
        {data.capDo}
      </Badge>
      <Image
        width={600}
        height={400}
        className="w-full rounded-t-xl aspect-video h-full object-cover"
        src={`https://${env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES}.t3.storage.dev/${data.tepKH}`}
        alt="Ảnh khóa học"
      />
      <CardContent className="p-4">
        <Link
          className="font-medium text-lg line-clamp-2 hover:underline group-hover:text-primary transition-colors"
          href={`/courses/${data.duongDan}`}
        >
          {data.tenKhoaHoc}
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground leading-tight mt-2">
          {data.moTaNgan}
        </p>
        <div className="mt-4 flex items-center gap-x-5">
          <div className="flex items-center gap-x-2">
            <TimerIcon className="size-6 p-1 rounded-md text-primary bg-primary/10" />
            <p className="text-sm text-muted-foreground">{data.thoiLuong}h</p>
          </div>
          <div className="flex items-center gap-x-2">
            <School2 className="size-6 p-1 rounded-md text-primary bg-primary/10" />
            <p className="text-sm text-muted-foreground">{data.danhMuc}</p>
          </div>
        </div>
        <div className="flex items-center mt-8 gap-2">
          {isEnrolled ? (
            <>
              <span className="text-lg font-medium">Giá:</span>
              <span className="text-xl font-bold text-primary">
                Đã mua
              </span>
            </>
          ) : (
            <>
              <span className="text-lg font-medium">Giá:</span>
              <span className="text-2xl font-bold text-primary">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(data.gia)}
              </span>
            </>
          )}
        </div>
        <Link
          href={`/courses/${data.duongDan}`}
          className={buttonVariants({
            className: "w-full mt-4",
          })}
        >
          {isEnrolled ? "Xem khóa học của bạn":"Xem chi tiết"}
        </Link>
      </CardContent>
    </Card>
  );
}

export function PublicCourseCardSkeleton() {
  return (
    <Card className="group relative py-0 gap-0">
      <div className="absolute top-2 right-2 z-10 flex items-center">
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="w-full relative h-fit">
        <Skeleton className="w-full rounded-t-xl aspect-video" />
      </div>
      <CardContent className="p-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="mt-4 flex items-center gap-x-5">
          <div className="flex items-center gap-x-2">
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex items-center gap-x-2">
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
        <Skeleton className="mt-4 w-full h-10 rounded-md" />
      </CardContent>
    </Card>
  );
}
