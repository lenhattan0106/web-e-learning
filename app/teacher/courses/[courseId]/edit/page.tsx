import { TeacherEditCourse } from "@/app/data/teacher/edit-course";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditCourseForm } from "./_components/EditCourseForm";
import { CourseStructure } from "./_components/CourseStructure";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { trangThaiKhoaHoc } from "@/lib/zodSchemas";

export const dynamic = "force-dynamic";

type Params = Promise<{ courseId: string }>;
export default async function EditRoute({ params }: { params: Params }) {
  const { courseId } = await params;
  
  const [data, categories, levels] = await Promise.all([
    TeacherEditCourse(courseId),
    prisma.danhMuc.findMany({
      where: { idDanhMucCha: null },
      include: { danhMucCon: true },
      orderBy: { tenDanhMuc: "asc" },
    }),
    prisma.capDo.findMany({
      orderBy: { tenCapDo: "asc" },
    }),
  ]);
  
  // Use constant status values for teacher (excludes BiChan)
  const statuses = trangThaiKhoaHoc.map((code, idx) => ({
    id: code,
    maTrangThai: code,
    tenTrangThai: code === "BanNhap" ? "Bản nháp" : code === "BanChinhThuc" ? "Đã xuất bản" : "Lưu trữ"
  }));
  
  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/teacher/courses"
          className={buttonVariants({
            variant: "outline",
            size: "icon",
          })}
        >
          <ArrowLeft className="size-4" />
        </Link>
      </div>
      <Tabs defaultValue="basic-info" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="basic-info">Thông tin khóa học</TabsTrigger>
            <TabsTrigger value="course-structure">Cấu trúc khóa học</TabsTrigger>
          </TabsList>
        <TabsContent value="basic-info">
            <Card>
                <CardHeader>
                    <CardTitle>Thông tin khóa học</CardTitle>
                    <CardDescription>Cung cấp những thông tin cơ bản về khóa học</CardDescription>
                </CardHeader>
                <CardContent>
                    <EditCourseForm data={data} categories={categories} levels={levels} statuses={statuses}></EditCourseForm>
                </CardContent>
            </Card>
        </TabsContent>
            <TabsContent value="course-structure">
            <Card>
                <CardHeader>
                    <CardTitle>Cấu trúc khóa học</CardTitle>
                    <CardDescription>Bạn có thể chỉnh sửa cấu trúc khóa học của bạn ở đây</CardDescription>
                </CardHeader>
                <CardContent>
                    <CourseStructure data={data}></CourseStructure>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
