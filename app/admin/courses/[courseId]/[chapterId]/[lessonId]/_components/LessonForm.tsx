"use client";

import { TeacherLessonType } from "@/app/data/admin/get-lesson";
import { Uploader } from "@/components/file-uploader/Uploader";
import { RichTextEditor } from "@/components/rich-text-editor/Editor";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { tryCatch } from "@/hooks/try-catch";
import { lessonSchema, LessonSchemaType } from "@/lib/zodSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { updateLesson } from "../actions";
import { toast } from "sonner";

interface iAppProps {
  data: TeacherLessonType;
  chapterId: string;
  courseId: string;
}

export function LessonForm({ chapterId, data, courseId }: iAppProps) {
  const [pending, startTransition] = useTransition();
  const form = useForm<LessonSchemaType>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      name: data.title,
      chapterId: chapterId,
      courseId: courseId,
      description: data.description ?? undefined,
      videoKey: data.videoKey ?? undefined,
      thumbnailKey: data.thumbnailKey ?? undefined,
    },
  });

  async function onSubmit(values: LessonSchemaType){
         startTransition(async () => {
           const { data: result, error } = await tryCatch(updateLesson(values,data.id));
           if (error) {
             toast.error("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại");
             return;
           }
           if (result.status === "success") {
             toast.success(result.message);
           } else if (result.status === "error") {
             toast.error(result.message);
           }
         });
  }
  return (
    <div>
      <Link
        className={buttonVariants({ variant: "outline", className: "mb-6" })}
        href={`/admin/courses/${courseId}/edit`}
      >
        <ArrowLeft className="size-4"></ArrowLeft>
        <span>Quay trở lại</span>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Cấu trúc bài học</CardTitle>
          <CardDescription>
            Hãy thêm video và nội dung chi tiết về bài học của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form} >
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Tên bài học</FormLabel>
                    <FormControl>
                      <Input placeholder="Tên bài học" {...field}></Input>
                    </FormControl>
                    <FormMessage></FormMessage>
                  </FormItem>
                )}
              ></FormField>
              <FormField
                control={form.control}
                name="description"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Mô tả bài học</FormLabel>
                    <FormControl>
                    <RichTextEditor field={field}></RichTextEditor>
                    </FormControl>
                    <FormMessage></FormMessage>
                  </FormItem>
                )}
              ></FormField>
                  <FormField
                control={form.control}
                name="thumbnailKey"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Ảnh bài học</FormLabel>
                    <FormControl>
                      <Uploader fileTypeAccepted="image" onChange={field.onChange} value={field.value}></Uploader>
                    </FormControl>
                    <FormMessage></FormMessage>
                  </FormItem>
                )}
              ></FormField>
                <FormField
                control={form.control}
                name="videoKey"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Tệp video</FormLabel>
                    <FormControl>
                      <Uploader fileTypeAccepted="video" onChange={field.onChange} value={field.value}></Uploader>
                    </FormControl>
                    <FormMessage></FormMessage>
                  </FormItem>
                )}
              ></FormField>
              <Button disabled={pending} type="submit">
                 {pending ?"Đang lưu...":"Lưu khóa học"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
