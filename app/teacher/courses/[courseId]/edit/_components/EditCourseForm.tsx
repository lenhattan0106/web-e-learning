"use client";

import { Button } from "@/components/ui/button";
import {
  danhMucKhoaHoc,
  capDoKhoaHoc,
  khoaHocSchema,
  KhoaHocSchemaType,
  trangThaiKhoaHoc,
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { editCourse } from "../action";
import { TeacherEditCourseType } from "@/app/data/teacher/edit-course";
import { CourseTitleInput } from "@/components/teacher/CourseTitleInput";

interface iAppProps {
  data: TeacherEditCourseType;
}

export function EditCourseForm({ data }: iAppProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const form = useForm<KhoaHocSchemaType>({
    resolver: zodResolver(khoaHocSchema),
    defaultValues: {
      tenKhoaHoc: data.tenKhoaHoc,
      moTa: data.moTa,
      tepKH: data.tepKH,
      gia: data.gia,
      thoiLuong: data.thoiLuong,
      capDo: data.capDo,
      danhMuc: data.danhMuc as KhoaHocSchemaType["danhMuc"],
      trangThai: data.trangThai,
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
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
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
                    {danhMucKhoaHoc.map((category) => (
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
            name="capDo"
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
                    {capDoKhoaHoc.map((capDo) => (
                      <SelectItem key={capDo} value={capDo}>
                        {capDo}
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
            name="thoiLuong"
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

        <FormField
          control={form.control}
          name="trangThai"
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
                  {trangThaiKhoaHoc.map((trangThai) => (
                    <SelectItem key={trangThai} value={trangThai}>
                      {trangThai}
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
              <Loader className="size-4 mr-2 animate-spin" />
              Đang cập nhật...
            </>
          ) : (
            "Cập nhật khóa học"
          )}
        </Button>
      </form>
    </Form>
  );
}