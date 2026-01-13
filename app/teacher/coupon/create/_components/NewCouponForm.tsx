"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, CalendarIcon, Loader2, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { couponFormSchema, CouponFormType } from "@/lib/zodSchemas";
import { CreateCoupon, CheckCouponCode, UpdateCoupon } from "../action"; 
import { tryCatch } from "@/hooks/try-catch"; 
import { useDebounce } from "@/hooks/use-debounce"; 

// Helper to format currency
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

interface NewCouponFormProps {
    initialData?: CouponFormType & { id?: string };
    couponId?: string;
}

export default function NewCouponForm({ initialData, couponId }: NewCouponFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!couponId;

  // State for courses
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  
  // State for coupon code check
  const [codeCheckStatus, setCodeCheckStatus] = useState<"idle" | "checking" | "exists" | "available">("idle");

  const form = useForm<CouponFormType>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      tieuDe: initialData?.tieuDe || "",
      moTa: initialData?.moTa || "", // Mô tả chiến dịch cho AI tìm kiếm
      maGiamGia: initialData?.maGiamGia || "",
      ngayBatDau: initialData?.ngayBatDau || null,
      ngayKetThuc: initialData?.ngayKetThuc || null,
      hoatDong: initialData?.hoatDong ?? true,
      giaTri: initialData?.giaTri || 0,
      loai: initialData?.loai || "PhanTram",
      idKhoaHoc: initialData?.idKhoaHoc || [], 
      soLuong: initialData?.soLuong || null,
    },
  });

  const loai = form.watch("loai");
  const maGiamGiaValue = form.watch("maGiamGia");
  const ngayBatDau = form.watch("ngayBatDau");
  const debouncedCode = useDebounce(maGiamGiaValue, 500);

  // Load courses
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoadingCourses(true);
        const res = await fetch("/api/teacher/course-titles");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && Array.isArray(data)) setCourses(data);
      } catch (err) {
        console.error("Failed to load courses", err);
      } finally {
        if (mounted) setLoadingCourses(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Check unique code
  useEffect(() => {
    if (!debouncedCode || debouncedCode.length < 3 || (isEdit && debouncedCode === initialData?.maGiamGia)) {
      setCodeCheckStatus("idle");
      return;
    }
    
    // Only check if it's potentially new
    const check = async () => {
        setCodeCheckStatus("checking");
        try {
             // Pass current ID to exclude from check if editing
             // However, our check action is simple. 
             // Ideally we should modify CheckCouponCode to accept an ID to exclude, 
             // but here we just rely on client-side exclusion if it matches initialData
             const res = await CheckCouponCode(debouncedCode);
             if (res.exists) {
                 setCodeCheckStatus("exists");
             } else {
                 setCodeCheckStatus("available");
                 form.clearErrors("maGiamGia");
             }
        } catch {
            setCodeCheckStatus("idle");
        }
    };
    check();
  }, [debouncedCode, form, isEdit, initialData]);

  const onSubmit = (values: CouponFormType) => {
    startTransition(async () => {
      let result;
      if (isEdit && couponId) {
         const { data, error } = await tryCatch(UpdateCoupon(couponId, values));
         if (error) { toast.error("Lỗi cập nhật"); return; }
         result = data;
      } else {
         const { data, error } = await tryCatch(CreateCoupon(values));
         if (error) { toast.error("Lỗi tạo mới"); return; }
         result = data;
      }

      if (result?.status === "success") {
        toast.success(result.message);
        if (!isEdit) form.reset();
        router.push("/teacher/coupon");
        router.refresh();
      } else {
        toast.error(result?.message || "Có lỗi xảy ra");
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Core Info */}
            <div className="lg:col-span-2 space-y-6">
                
                <Card>
                    <CardHeader>
                        <CardTitle>Thông tin cơ bản</CardTitle>
                        <CardDescription>Các thông tin chính hiển thị cho người dùng.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="tieuDe"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tiêu đề chương trình <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                <Input placeholder="VD: Khuyến mãi Tết 2024" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="maGiamGia"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mã giảm giá (Code) <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                <div className="relative">
                                    <Input 
                                        placeholder="VD: SALE50" 
                                        {...field} 
                                        className={cn(
                                            "uppercase",
                                            codeCheckStatus === "exists" && "border-red-500",
                                            codeCheckStatus === "available" && "border-green-500"
                                        )}
                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    />
                                    {codeCheckStatus === "checking" && (
                                        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                                    )}
                                </div>
                                </FormControl>
                                {codeCheckStatus === "exists" && <p className="text-xs text-red-500 mt-1">Mã này đã được sử dụng.</p>}
                                {codeCheckStatus === "available" && <p className="text-xs text-green-500 mt-1">Mã hợp lệ.</p>}
                                <FormMessage />
                            </FormItem>
                            )}
                        />

                        {/* Mô tả chiến dịch (AI Semantic Search) */}
                        <FormField
                            control={form.control}
                            name="moTa"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mô tả chiến dịch</FormLabel>
                                <FormControl>
                                <Textarea 
                                    placeholder="Ví dụ: Ưu đãi dành cho sinh viên, giảm 50% cho khóa học React..." 
                                    className="resize-none"
                                    rows={3}
                                    {...field} 
                                />
                                </FormControl>
                                <FormDescription>
                                    Giúp AI tư vấn mã giảm giá phù hợp cho người dùng.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Giá trị giảm giá</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="loai"
                                render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Loại giảm giá</FormLabel>
                                    <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex flex-col space-y-1"
                                    >
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="PhanTram" />
                                        </FormControl>
                                        <FormLabel className="font-normal cursor-pointer">
                                            Theo phần trăm (%)
                                        </FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="GiamTien" />
                                        </FormControl>
                                        <FormLabel className="font-normal cursor-pointer">
                                            Số tiền cố định (VNĐ)
                                        </FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="giaTri"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {loai === "PhanTram" ? "Phần trăm giảm" : "Số tiền giảm"}
                                    </FormLabel>
                                    <FormControl>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            min="0"
                                            {...field}
                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 text-sm font-medium">
                                                {loai === "PhanTram" ? "%" : "₫"}
                                            </span>
                                        </div>
                                    </div>
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                        {loai === "PhanTram" 
                                            ? "Nhập số từ 1-100." 
                                            : "Nhập số tiền > 0."}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Thời gian và Giới hạn</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <FormField
                            control={form.control}
                            name="ngayBatDau"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Ngày bắt đầu</FormLabel>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value ? (
                                        format(new Date(field.value), "P", { locale: vi })
                                        ) : (
                                        <span>Chọn ngày</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => field.onChange(date?.toISOString())}
                                    disabled={(date) =>
                                        date < new Date(new Date().setHours(0, 0, 0, 0))
                                    }
                                    initialFocus
                                    />
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="ngayKetThuc"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Ngày kết thúc</FormLabel>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value ? (
                                        format(new Date(field.value), "P", { locale: vi })
                                        ) : (
                                        <span>Chọn ngày</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => field.onChange(date?.toISOString())}
                                    disabled={(date) => {
                                        // Disable past days and days before start date
                                        const today = new Date(new Date().setHours(0, 0, 0, 0));
                                        const startDate = ngayBatDau ? new Date(ngayBatDau) : today;
                                        return date < today || date < startDate;
                                    }}
                                    initialFocus
                                    />
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                            )}
                        />

                         <FormField
                            control={form.control}
                            name="soLuong"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Giới hạn số lượng</FormLabel>
                                <FormControl>
                                <Input 
                                    type="number" 
                                    placeholder="Không giới hạn" 
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                />
                                </FormControl>
                                <FormDescription>
                                    Để trống nếu không muốn giới hạn
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Sidebar settings */}
            <div className="space-y-6">
                 {/* Status */}
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Trạng thái</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="hoatDong"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">Kích hoạt</FormLabel>
                                </div>
                                <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                    </CardContent>
                 </Card>

                 {/* Courses Application */}
                 <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="text-base">Áp dụng cho khóa học</CardTitle>
                        <CardDescription>
                            Chọn khóa học áp dụng mã này.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <FormField
                            control={form.control}
                            name="idKhoaHoc"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn(
                                        "w-full justify-between",
                                        !field.value?.length && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value?.length
                                        ? `${field.value.length} khóa học`
                                        : "Tất cả khóa học"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="end">
                                    <Command>
                                    <CommandInput placeholder="Tìm khóa học..." />
                                    <CommandList className="max-h-[300px] overflow-auto">
                                        <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                        <CommandGroup>
                                             {/* Select All Option */}
                                             <CommandItem
                                                onSelect={() => {
                                                    const current = field.value || [];
                                                    if (current.length === courses.length) {
                                                        field.onChange([]); // Deselect all
                                                    } else {
                                                        field.onChange(courses.map(c => c.id)); // Select all
                                                    }
                                                }}
                                                className="font-medium text-primary"
                                             >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        (field.value?.length === courses.length && courses.length > 0)
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                    )}
                                                />
                                                {field.value?.length === courses.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                                             </CommandItem>
                                             <CommandSeparator className="my-1"/>
                                            
                                            {loadingCourses && <div className="p-2 text-sm text-center text-muted-foreground">Đang tải...</div>}
                                            
                                            {courses.map((course) => (
                                            <CommandItem
                                                value={course.title}
                                                key={course.id}
                                                onSelect={() => {
                                                    const current = field.value || [];
                                                    const isSelected = current.includes(course.id);
                                                    if (isSelected) {
                                                        field.onChange(current.filter((id) => id !== course.id));
                                                    } else {
                                                        field.onChange([...current, course.id]);
                                                    }
                                                }}
                                            >
                                                <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    field.value?.includes(course.id)
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                                )}
                                                />
                                                <span className="truncate">{course.title}</span>
                                            </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                    </Command>
                                </PopoverContent>
                                </Popover>
                                <FormDescription>
                                {field.value?.length ? "Áp dụng cho các khóa đã chọn." : "Áp dụng cho TOÀN BỘ khóa học của bạn."}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </CardContent>
                 </Card>
            </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
             >
                Hủy bỏ
             </Button>
             <Button type="submit" disabled={isPending || codeCheckStatus === "checking" || codeCheckStatus === "exists"}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Lưu thay đổi" : "Tạo mã giảm giá"}
             </Button>
        </div>
      </form>
    </Form>
  );
}