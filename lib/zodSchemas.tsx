import {z} from "zod"

export const courseLevels = ['NguoiMoi','TrungCap','NangCao'] as const;

export const courseStatus = [
    "BanNhap", "BanChinhThuc","BanLuuTru"
] as const;

export const courseCategories = [
    "Lập Trình",
    "Kinh Doanh",
    "Tài Chính",
    "Công Nghệ Thông Tin",
    "Phát Triển Bản Thân",
    "Giáo Dục"
] as const;

export const courseSchema = z.object({
    title: z.string().min(3,{message:"Tiêu đề phải có ít nhất 3 ký tự"}).max(100,{message:"Tiêu đề không được vượt quá 100 ký tự"}),
    description: z.string().min(3, {message:"Mô tả phải có ít nhất 3 ký tự"}),
    fileKey: z.string().min(1, {message:"Tệp tin là bắt buộc"}),
    price: z.number().min(1, {message:"Giá phải là số dương"}),
    duration: z.number().min(1,{message:"Thời lượng phải ít nhất 1 giờ"}).max(500,{
        message:"Thời lượng không được vượt quá 500 giờ"
    }),
    level: z.enum(courseLevels, {
        message:"Cấp độ là bắt buộc"
    }),
    category: z.enum(courseCategories,{
        message:"Danh mục là bắt buộc"
    }),
    smallDescription: z.string().min(3, {message:"Mô tả ngắn phải có ít nhất 3 ký tự"}).max(200,{message:"Mô tả ngắn không được vượt quá 200 ký tự"}),
    slug: z.string().min(3, {message:"Đường dẫn phải có ít nhất 3 ký tự"}),
    status: z.enum(courseStatus,{
        message:"Trạng thái là bắt buộc"
    }),
})

export type CourseSchemaType =  z.infer<typeof courseSchema>