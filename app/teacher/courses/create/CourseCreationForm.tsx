"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  khoaHocSchema,
  KhoaHocSchemaType,
} from "@/lib/zodSchemas";
import { ArrowLeft, Loader, PlusIcon, SparkleIcon } from "lucide-react";
import Link from "next/link";
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
import { useTransition } from "react";
import { tryCatch } from "@/hooks/try-catch";
import { CreateCourse } from "./action";
import{ toast } from "sonner";
import { useRouter } from "next/navigation";
import { useConfetti } from "@/hooks/use-confetti";
import { CourseTitleInput } from "@/components/teacher/CourseTitleInput";
import { CascadingCategorySelect } from "@/components/teacher/CascadingCategorySelect";
import { LevelSelect } from "@/components/teacher/LevelSelect";
import { StatusSelect } from "@/components/teacher/StatusSelect";
import { formatDuration } from "@/lib/formatDuration";

interface Props {
  categories: any[];
  levels: any[];
  statuses: any[];
}

export function CourseCreationForm({ categories, levels, statuses }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { triggerConfetti } = useConfetti();
  
  // Find default IDs
  const defaultLevelId = levels.find(l => l.tenCapDo === "Người mới" || l.tenCapDo === "Người Mới")?.id || "";
  const defaultStatusId = statuses.find(s => s.tenTrangThai === "Đã xuất bản" || s.tenTrangThai === "Đã Xuất Bản")?.id || "";

  const form = useForm<KhoaHocSchemaType>({
    resolver: zodResolver(khoaHocSchema),
    mode: "onSubmit", // Validate only on submit
    reValidateMode: "onSubmit", // Re-validate only on submit next time
    defaultValues: {
      tenKhoaHoc: "",
      moTa: "",
      tepKH: "",
      gia: 0,
      thoiLuong: 0,
      capDo: defaultLevelId, 
      danhMuc: "", 
      trangThai: defaultStatusId, 
      duongDan: "",
      moTaNgan: "",
    },
  });

  function onSubmit(values: KhoaHocSchemaType) {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(CreateCourse(values));
      if (error) {
        toast.error("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại");
        return;
      }
      if (result.status === "success") {
        toast.success(result.message);
        triggerConfetti();
        form.reset();
        router.push("/teacher/courses");
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <Link
          href="/teacher/courses"
          className={buttonVariants({
            variant: "outline",
            size: "icon",
          })}
        >
          <ArrowLeft className="size-4"></ArrowLeft>
        </Link>
        <h1 className="text-2xl font-bold">Tạo Khóa Học</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Thông Tin Cơ Bản</CardTitle>
          <CardDescription>
            Cung cấp thông tin cơ bản về khóa học
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                      />
                    </FormControl>
                    <FormMessage></FormMessage>
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
                    const slug = slugify(titleValue || "", { lower: true, strict: true });
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
                
                 <FormItem>
                    <FormLabel>Thời Lượng</FormLabel>
                    <FormControl>
                       <Input 
                         value={formatDuration(form.watch("thoiLuong") || 0)} 
                         readOnly 
                         disabled
                         className="bg-muted/50 text-foreground cursor-not-allowed" 
                       />
                    </FormControl>
                 </FormItem>
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
                      Đang tạo...
                      <Loader className="animate-spin ml-1"></Loader>
                    </>
                  ) : (
                    <>
                      Tạo Khóa Học{" "}
                      <PlusIcon className="ml-1" size={16}></PlusIcon>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
