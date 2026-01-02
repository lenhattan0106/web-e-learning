"use client";

import { TeacherLessonType } from "@/app/data/teacher/get-lesson";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { tryCatch } from "@/hooks/try-catch";
import { baiHocSchema, BaiHocSchemaType } from "@/lib/zodSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { EditLessonAction } from "../actions";
import { toast } from "sonner";

interface iAppProps {
  data: TeacherLessonType;
  idBaiHoc: string;
  idChuong: string;
  idKhoaHoc: string;
}

export function LessonForm({ data, idBaiHoc, idChuong, idKhoaHoc }: iAppProps) {
  const [pending, startTransition] = useTransition();
  const form = useForm<BaiHocSchemaType>({
    resolver: zodResolver(baiHocSchema),
    defaultValues: {
      ten: data.tenBaiHoc,
      idChuong: idChuong,
      idKhoaHoc: idKhoaHoc,
      moTa: data.moTa ?? undefined,
      maVideo: data.maVideo ?? undefined,
      anhBaiHoc: data.anhBaiHoc ?? undefined,
      thoiLuong: data.thoiLuong ?? 0,
    },
  });

  async function onSubmit(values: BaiHocSchemaType) {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(
        EditLessonAction(values, idBaiHoc)
      );
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
        href={`/teacher/courses/${idKhoaHoc}/edit`}
      >
        <ArrowLeft className="size-4 mr-2" />
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="ten"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên bài học</FormLabel>
                    <FormControl>
                      <Input placeholder="Tên bài học" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="moTa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả bài học</FormLabel>
                    <FormControl>
                      <RichTextEditor field={field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="anhBaiHoc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ảnh bài học</FormLabel>
                    <FormControl>
                      <Uploader
                        fileTypeAccepted="image"
                        onChange={field.onChange}
                        value={field.value}
                        folder="thumbnails"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="maVideo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tệp video</FormLabel>
                    <FormControl>
                      <Uploader
                        fileTypeAccepted="video"
                        onChange={field.onChange}
                        onDurationChange={(duration) => {
                          form.setValue("thoiLuong", duration);
                        }}
                        value={field.value}
                        folder="videos"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {form.watch("maVideo") && form.watch("thoiLuong") === 0 && (
                <FormField
                  control={form.control}
                  name="thoiLuong"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-amber-600 font-medium">
                         Nhập thời lượng video (giây)
                      </FormLabel>
                      <FormDescription className="text-sm">
                        Hệ thống không thể tự động đọc thời lượng video. Vui lòng nhập số giây của video.
                        <br />
                        <span className="text-muted-foreground">Ví dụ: 2 phút = 120 giây, 5 phút 30 giây = 330 giây</span>
                      </FormDescription>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Nhập số giây (ví dụ: 120)"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          className="border-amber-300 focus:border-amber-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <Button disabled={pending} type="submit">
                {pending ? (
                  <>
                    <Loader className="size-4 mr-2 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu bài học"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
