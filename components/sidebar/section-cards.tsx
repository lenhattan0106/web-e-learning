import { IconBook,  IconMoneybagPlus, IconPlaylistX,IconUser } from "@tabler/icons-react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { teacherGetDashBoardStatus } from "@/app/data/admin/get-dashboard-stats";

export  async function SectionCards() {
  const {totalCourses,totalLessons,totalRevenue,totalUsers} = await teacherGetDashBoardStatus()
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4  *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
          <CardDescription>Tổng doanh thu</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
             {totalRevenue}
          </CardTitle>
          </div>
           <IconMoneybagPlus className="size-6"></IconMoneybagPlus>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <p className="text-muted-foreground">
            Số tiền mà bạn đã bán khóa học
          </p>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
          <CardDescription>Số lượng học sinh mua khóa học</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
             {totalUsers}
          </CardTitle>
          </div>
          <IconUser className="size-6 text-muted-foreground"></IconUser>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <p className="text-muted-foreground">
            Số lượng học sinh đã tham gia và mua khóa học
          </p>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
          <CardDescription>Số lượng khóa học hiện tại</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalCourses}
          </CardTitle>
          </div>
          <IconBook className="size-6 text-muted-foreground"></IconBook>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <p className="text-muted-foreground">
            Những khóa học đã được hiển thị trên nền tảng
          </p>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
          <CardDescription>Số lượng bài học của bạn</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalLessons}
          </CardTitle>
          </div>
          <IconPlaylistX className="size-6 text-muted-foreground"></IconPlaylistX>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <p className="text-muted-foreground">
            Những bài học đã được hiển thị trên nền tảng
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
