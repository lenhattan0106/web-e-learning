"use client";

import { Button } from "@/components/ui/button";
import {
  khoaHocSchema,
  KhoaHocSchemaType,
} from "@/lib/zodSchemas";
import { Loader, SparkleIcon } from "lucide-react";
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
import { RichTextEditor } from "@/components/rich-text-editor/Editor";
import { Uploader } from "@/components/file-uploader/Uploader";
import { useTransition, useMemo } from "react";
import { tryCatch } from "@/hooks/try-catch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { editCourse } from "../action";
import { TeacherEditCourseType } from "@/app/data/teacher/edit-course";
import { CourseTitleInput } from "@/components/teacher/CourseTitleInput";
import { CascadingCategorySelect, Category } from "@/components/teacher/CascadingCategorySelect";
import { LevelSelect } from "@/components/teacher/LevelSelect";
import { StatusSelect } from "@/components/teacher/StatusSelect";
import { formatDuration } from "@/lib/format";
import { calculateCourseDuration } from "@/lib/video-utils";

interface iAppProps {
  data: TeacherEditCourseType;
  categories: Category[];
  levels: any[];
  statuses: any[];
}

export function EditCourseForm({ data, categories, levels, statuses }: iAppProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  // Calculate duration from lessons
  const calculatedDuration = useMemo(() => {
    return calculateCourseDuration(data.chuongs || []);
  }, [data.chuongs]);
  
  const form = useForm<KhoaHocSchemaType>({
    resolver: zodResolver(khoaHocSchema),
    defaultValues: {
      tenKhoaHoc: data.tenKhoaHoc,
      moTa: data.moTa,
      tepKH: data.tepKH,
      gia: data.gia,
      thoiLuong: calculatedDuration,
      capDo: data.idCapDo || "",
      danhMuc: data.idDanhMuc || "",
      trangThai: data.trangThai || "BanNhap",
      duongDan: data.duongDan,
      moTaNgan: data.moTaNgan,
    },
  });

  function onSubmit(values: KhoaHocSchemaType) {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(editCourse(values, data.id));
      if (error) {
        toast.error("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại");
        return;
      }
      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit, (errors) => {
        console.error("Form validation errors:", errors);
        toast.error("Vui lòng kiểm tra lại thông tin nhập");
      })}>
        <FormField
          control={form.control}
          name="tenKhoaHoc"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tiêu Đề</FormLabel>
              <FormControl>
                <CourseTitleInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Tiêu đề khóa học"
                  excludeTitle={data.tenKhoaHoc} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        ></FormField>

        <div className="flex gap-4 items-end">
          <FormField
            control={form.control}
            name="duongDan"
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
              const titleValue = form.getValues("tenKhoaHoc");
              const slug = slugify(titleValue, { lower: true, strict: true });
              form.setValue("duongDan", slug, { shouldValidate: true });
            }}
          >
            Tạo Đường Dẫn{" "}
            <SparkleIcon className="ml-1" size={16}></SparkleIcon>
          </Button>
        </div>

        <FormField
          control={form.control}
          name="moTaNgan"
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
          name="moTa"
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
          name="tepKH"
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
            name="danhMuc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Danh Mục</FormLabel>
                <FormControl>
                  <CascadingCategorySelect
                    categories={categories}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage></FormMessage>
              </FormItem>
            )}
          ></FormField>

          <FormField
            control={form.control}
            name="capDo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cấp Độ</FormLabel>
                <FormControl>
                  <LevelSelect
                    levels={levels}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage></FormMessage>
              </FormItem>
            )}
          ></FormField>

          <FormItem>
            <FormLabel>Thời Lượng</FormLabel>
            <FormControl>
               <Input 
                 value={formatDuration(calculatedDuration)} 
                 readOnly 
                 disabled
                 className="bg-muted/50 text-foreground cursor-not-allowed" 
               />
            </FormControl>
          </FormItem>

          <FormField
            control={form.control}
            name="gia"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <FormField
            control={form.control}
            name="trangThai"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trạng Thái</FormLabel>
                <FormControl>
                  <StatusSelect
                    statuses={statuses}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage></FormMessage>
              </FormItem>
            )}
          ></FormField>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader className="size-4 mr-2 animate-spin" />
                Đang cập nhật...
              </>
            ) : (
              "Cập nhật khóa học"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
