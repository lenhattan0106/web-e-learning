import { getIndivialCourse } from "@/app/data/course/get-course";
import { checkIfCourseBought } from "@/app/data/user/user-is-enrolled";
import { RenderDescription } from "@/components/rich-text-editor/RenderDescription";
import { Badge } from "@/components/ui/badge";
import {buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { env } from "@/lib/env";
import {
  BookOpen,
  FolderOpen,
  BarChart3,
  ChevronDown,
  Clock,
  Play,
  Check,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { EnrollmentButton } from "./_components/EnrollmentButton";

type Params = Promise<{ slug: string }>;

export default async function SlugPage({ params }: { params: Params }) {
  const { slug } = await params;
  const khoaHoc = await getIndivialCourse(slug);
  const isEnrolled = await checkIfCourseBought(khoaHoc.id);
  return (
    <div className="grid grid-cols-1  gap-8 lg:grid-cols-3 mt-5">
      <div className="order-1 lg:col-span-2">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl shadow-lg">
          <Image
            src={`https://${env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES}.t3.storage.dev/${khoaHoc.tepKH}`}
            alt={khoaHoc.tenKhoaHoc}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>
        <div className="mt-4 space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              {khoaHoc.tenKhoaHoc}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed line-clamp-2">
              {khoaHoc.moTaNgan}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge className="flex items-center gap-1 px-3 py-1 rounded">
              <BarChart3 className="size-6" />
              <span>{khoaHoc.capDo}</span>
            </Badge>
            <Badge className="flex items-center gap-1 px-3 py-1 rounded">
              <FolderOpen className="size-6" />
              <span>{khoaHoc.danhMuc}</span>
            </Badge>
            <Badge className="flex items-center gap-1 px-3 py-1 rounded">
              <Clock className="size-6" />
              <span>{khoaHoc.thoiLuong} giờ</span>
            </Badge>
          </div>
          <Separator className="my-8"></Separator>
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight">
              Mô tả khóa học
            </h2>
            <RenderDescription
              json={JSON.parse(khoaHoc.moTa)}
            ></RenderDescription>
          </div>
        </div>
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-semibold tracking-tight">
              Nội dung khóa học
            </h2>
            <div>
              {khoaHoc.chuongs.length} chương |{" "}
              {khoaHoc.chuongs.reduce(
                (total, chuong) => total + chuong.baiHocs.length,
                0
              )}{" "}
              bài học
            </div>
          </div>
          <div className="space-y-4">
            {khoaHoc.chuongs.map((chuong, index) => (
              <Collapsible key={chuong.id} defaultOpen={index === 0}>
                <Card className="p-0 overflow-hidden border-2 transition-all duration-200 hover:shadow-md gap-0">
                  <CollapsibleTrigger>
                    <div>
                      <CardContent className="p-6 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <p className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                              {index + 1}
                            </p>
                            <div>
                              <h3 className="text-xl font-semibold text-left">
                                {chuong.tenChuong}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1 text-left">
                                {chuong.baiHocs.length} bài học
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-sm">
                              {chuong.baiHocs.length} bài học
                            </Badge>
                            <ChevronDown className="size-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t bg-muted/20">
                      <div className="p-6 pt-4 space-y-3">
                        {chuong.baiHocs.map((baiHoc, lessonIndex) => (
                          <div
                            key={baiHoc.id}
                            className="flex items-center gap-4 rounded-lg p-3 hover:bg-accent transition-colors group"
                          >
                            <div className="flex size-8 items-center justify-center rounded-full bg-background border-2 border-primary/30">
                              <Play className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {baiHoc.tenBaiHoc}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Bài học {lessonIndex + 1}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </div>
      </div>
      {/* Design khu vực mua khóa học */}
      <div className="order-2 lg:col-span-1">
        <div className="sticky top-20">
          <Card className="py-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-medium">Giá:</span>
                <span className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(khoaHoc.gia)}
                </span>
              </div>
              <div className="mb-6 space-y-3 rounded-lg bg-muted p-4">
                <h4 className="font-medium">Thông tin khóa học</h4>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Clock className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Thời lượng</p>
                      <p className="text-sm text-muted-foreground">
                        {khoaHoc.thoiLuong} giờ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <BarChart3 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Cấp độ</p>
                      <p className="text-sm text-muted-foreground">
                        {khoaHoc.capDo}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <FolderOpen className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Danh mục</p>
                      <p className="text-sm text-muted-foreground">
                        {khoaHoc.danhMuc}
                      </p>
                    </div>
                  </div>
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <BookOpen className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Số lượng bài học</p>
                        <p className="text-sm text-muted-foreground">
                          {khoaHoc.chuongs.reduce(
                            (total, chuong) => total + chuong.baiHocs.length,
                            0
                          )}{" "}
                          bài học
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6 space-y-3">
                    <h2 className="font-semibold">Khóa học bao gồm:</h2>
                    <ul className="space-y-3">
                       <li className="flex items-center gap-2 text-sm">
                          <div className="rounded-full p-1 bg-green-500/10 text-green-500">
                             <Check className="size-3" />
                          </div>
                          <span>Quyền truy cập trọn đời</span>
                       </li>
                        <li className="flex items-center gap-2 text-sm">
                          <div className="rounded-full p-1 bg-green-500/10 text-green-500">
                             <Check className="size-3" />
                          </div>
                          <span>Cập nhật nội dung mới nhất</span>
                       </li>
                       <li className="flex items-center gap-2 text-sm">
                          <div className="rounded-full p-1 bg-green-500/10 text-green-500">
                             <Check className="size-3" />
                          </div>
                          <span>Cộng đồng học viên hỗ trợ lẫn nhau</span>
                       </li>
                    </ul>
                </div>
                {isEnrolled ? (
                  <Link href="/dashboard" className={buttonVariants({
                    className:"w-full"
                  })}>
                  Xem khóa học
                  </Link>
                ):(
                  <EnrollmentButton courseId={khoaHoc.id}></EnrollmentButton>
                )}
          
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
