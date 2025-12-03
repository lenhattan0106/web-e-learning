import { TeacherEditCourse } from "@/app/data/admin/edit-course";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditCourseForm } from "./_components/EditCourseForm";
import { CourseStructure } from "./_components/CourseStructure";

type Params = Promise<{ courseId: string }>;
export default async function EditRoute({ params }: { params: Params }) {
  const { courseId } = await params;
  const data = await TeacherEditCourse(courseId);
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">
        Chỉnh sửa khóa học:{" "}
        <span className="text-primary underline">{data.title}</span>
      </h1>
      <Tabs defaultValue="" className="w-full">
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
                    <EditCourseForm data={data}></EditCourseForm>
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
