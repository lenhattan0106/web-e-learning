"use client";

import { Button} from "@/components/ui/button";
import {
  courseCategories,
  courseLevels,
  courseSchema,
  CourseSchemaType,
  courseStatus,
} from "@/lib/zodSchemas";
import { Loader, PlusIcon, SparkleIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import slugify from "slugify";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SelectValue } from "@radix-ui/react-select";
import { RichTextEditor } from "@/components/rich-text-editor/Editor";
import { Uploader } from "@/components/file-uploader/Uploader";
import { useTransition } from "react";
import { tryCatch } from "@/hooks/try-catch";
// import { CreateCourse } from "./action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { editCourse } from "../action";
import { AdminCourseSingularType } from "@/app/data/admin/edit-course";


interface iAppProps {
    data: AdminCourseSingularType
}
export function EditCourseForm({data}:iAppProps){
      const [isPending, startTransition] = useTransition();
      const router = useRouter();
      const form = useForm<CourseSchemaType>({
        resolver: zodResolver(courseSchema),
        defaultValues: {
          title: data.title,
          description: data.description,
          fileKey: data.fileKey,
          price: data.price,
          duration: data.duration,
          level: data.level,
          category: data.category as CourseSchemaType["category"],
          status: data.status,
          slug: data.slug,
          smallDescription: data.smallDescription,
        },
      });
       function onSubmit(values: CourseSchemaType) {
          startTransition(async () => {
            const { data: result, error } = await tryCatch(editCourse(values,data.id));
            if (error) {
              toast.error("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại");
              return;
            }
            if (result.status === "success") {
              toast.success(result.message);
              form.reset();
              router.push("/admin/courses");
            } else if (result.status === "error") {
              toast.error(result.message);
            }
          });
        }
        
    return(
          <Form {...form}>
                    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tiêu Đề</FormLabel>
                            <FormControl>
                              <Input placeholder="Tiêu đề khóa học" {...field}></Input>
                            </FormControl>
                            <FormMessage></FormMessage>
                          </FormItem>
                        )}
                      ></FormField>
                      
                      <div className="flex gap-4 items-end">
                        <FormField
                          control={form.control}
                          name="slug"
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormLabel>Đường Dẫn</FormLabel>
                              <FormControl>
                                <Input placeholder="duong-dan-khoa-hoc" {...field}></Input>
                              </FormControl>
                              <FormMessage></FormMessage>
                            </FormItem>
                          )}
                        ></FormField>
                        <Button
                          type="button"
                          className="w-fit"
                          onClick={() => {
                            const titleValue = form.getValues("title");
                            const slug = slugify(titleValue, { lower: true, strict: true });
                            form.setValue("slug", slug, { shouldValidate: true });
                          }}
                        >
                          Tạo Đường Dẫn{" "}
                          <SparkleIcon className="ml-1" size={16}></SparkleIcon>
                        </Button>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="smallDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mô Tả Ngắn</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Mô tả ngắn gọn về khóa học"
                                className="min-h-[120px]"
                                {...field}
                              ></Textarea>
                            </FormControl>
                            <FormMessage></FormMessage>
                          </FormItem>
                        )}
                      ></FormField>
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mô Tả Chi Tiết</FormLabel>
                            <FormControl>
                              <RichTextEditor field={field}></RichTextEditor>
                            </FormControl>
                            <FormMessage></FormMessage>
                          </FormItem>
                        )}
                      ></FormField>
        
                      <FormField
                        control={form.control}
                        name="fileKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ảnh thumbnail</FormLabel>
                            <FormControl>
                              <Uploader
                               fileTypeAccepted="image"
                                onChange={field.onChange}
                                value={field.value}
                              ></Uploader>
                            </FormControl>
                            <FormMessage></FormMessage>
                          </FormItem>
                        )}
                      ></FormField>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Danh Mục</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Chọn danh mục"></SelectValue>
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {courseCategories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage></FormMessage>
                            </FormItem>
                          )}
                        ></FormField>
                        
                        <FormField
                          control={form.control}
                          name="level"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cấp Độ</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Chọn cấp độ"></SelectValue>
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {courseLevels.map((course) => (
                                    <SelectItem key={course} value={course}>
                                      {course}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage></FormMessage>
                            </FormItem>
                          )}
                        ></FormField>
                        
                        <FormField
                          control={form.control}
                          name="duration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Thời Lượng (giờ)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Thời lượng"
                                  type="number"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(value === "" ? 0 : Number(value));
                                  }}
                                ></Input>
                              </FormControl>
                              <FormMessage></FormMessage>
                            </FormItem>
                          )}
                        ></FormField>
                        
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Giá (VNĐ)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Giá"
                                  type="number"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(value === "" ? 0 : Number(value));
                                  }}
                                ></Input>
                              </FormControl>
                              <FormMessage></FormMessage>
                            </FormItem>
                          )}
                        ></FormField>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trạng Thái</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Chọn trạng thái"></SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {courseStatus.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage></FormMessage>
                          </FormItem>
                        )}
                      ></FormField>
                      
                      <Button type="submit" disabled={isPending}>
                        {isPending ? (
                          <>
                            Đang cập nhật...
                            <Loader className="animate-spin ml-1"></Loader>
                          </>
                        ) : (
                          <>
                            Cập nhật khóa học{" "}
                            <PlusIcon className="ml-1" size={16}></PlusIcon>
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
    )
}