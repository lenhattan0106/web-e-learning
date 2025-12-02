"use client";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookOpen, Gamepad, TrendingUp, User } from "lucide-react";
import Link from "next/link";

interface featureProps {
  title: string;
  description: string;
  icon: typeof BookOpen;
}

const features: featureProps[] = [
  {
    title: "Khóa Học Toàn Diện",
    description:
      "Truy cập vào nhiều khóa học được tuyển chọn cẩn thận bởi các chuyên gia trong ngành.",
    icon: BookOpen,
  },
  {
    title: "Học Tập Tương Tác",
    description:
      "Tham gia với nội dung tương tác, bài kiểm tra và bài tập để nâng cao trải nghiệm học tập của bạn.",
    icon: Gamepad,
  },
  {
    title: "Theo Dõi Tiến Độ",
    description:
      "Theo dõi tiến độ và thành tích của bạn với phân tích chi tiết và bảng điều khiển cá nhân hóa.",
    icon: TrendingUp,
  },
  {
    title: "Hỗ Trợ Cộng Đồng",
    description:
      "Tham gia cộng đồng học viên và giảng viên sôi động để cộng tác và chia sẻ kiến thức.",
    icon: User,
  },
];

export default function Home() {
  return (
    <>
      <section className="relative py-20">
        <div className="flex flex-col items-center text-center space-y-8">
          <Badge variant={"outline"}>Tương Lai Của Giáo Dục Trực Tuyến</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Nâng Tầm Trải Nghiệm Học Tập Của Bạn
          </h1>
          <p className="max-w-[700px] text-muted-foreground md:text-xl">
            Khám phá cách học mới với hệ thống quản lý học tập hiện đại, tương tác.
            Truy cập các khóa học chất lượng cao mọi lúc, mọi nơi.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link
              className={buttonVariants({
                size: "lg",
              })}
              href="/courses"
            >
              Khám Phá Khóa Học
            </Link>
            <Link
              className={buttonVariants({
                size: "lg",
                variant: "outline",
              })}
              href="/login"
            >
              Đăng Nhập
            </Link>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20 px-4 max-w-7xl mx-auto mb-32">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card
              key={index}
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader className="flex flex-col items-center text-center space-y-4 pb-4">
                <div className="p-4 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-10 h-10 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  {feature.title}
                </h3>
              </CardHeader>
              <CardContent className="text-center px-6 pb-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </>
  );
}
