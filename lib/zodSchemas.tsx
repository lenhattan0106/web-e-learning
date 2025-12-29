import { z } from "zod";

export const capDoKhoaHoc = ["NguoiMoi", "TrungCap", "NangCao"] as const;

export const trangThaiKhoaHoc = ["BanNhap", "BanChinhThuc", "BanLuuTru"] as const;

export const danhMucKhoaHoc = [
  "Lập Trình",
  "Kinh Doanh",
  "Tài Chính",
  "Công Nghệ Thông Tin",
  "Phát Triển Bản Thân",
  "Giáo Dục",
] as const;

export const khoaHocSchema = z.object({
  tenKhoaHoc: z
    .string()
    .min(3, { message: "Tiêu đề phải có ít nhất 3 ký tự" })
    .max(100, { message: "Tiêu đề không được vượt quá 100 ký tự" }),
  moTa: z.string().min(3, { message: "Mô tả phải có ít nhất 3 ký tự" }),
  tepKH: z.string().min(1, { message: "Tệp tin là bắt buộc" }),
  gia: z.number().min(0, { message: "Giá phải là số không âm" }),
  thoiLuong: z
    .number()
    .min(0, { message: "Thời lượng phải là số không âm" })
    .max(5000, {
      message: "Thời lượng không được vượt quá 5000",
    }),
  capDo: z.string().min(1, {
    message: "Cấp độ là bắt buộc",
  }),
  danhMuc: z.string().min(1, {
    message: "Danh mục là bắt buộc",
  }),
  moTaNgan: z
    .string()
    .min(3, { message: "Mô tả ngắn phải có ít nhất 3 ký tự" })
    .max(200, { message: "Mô tả ngắn không được vượt quá 200 ký tự" }),
  duongDan: z.string().min(3, { message: "Đường dẫn phải có ít nhất 3 ký tự" }),
  trangThai: z.string().min(1, {
    message: "Trạng thái là bắt buộc",
  }),
});

export const chuongSchema = z.object({
  ten: z
    .string()
    .min(3, { message: "Tiêu đề của chương phải ít nhất 3 ký tự" }),
  idKhoaHoc: z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
      message: "Id khóa học phải là UUID hợp lệ",
    }),
});

export const baiHocSchema = z.object({
  ten: z
    .string()
    .min(3, { message: "Tiêu đề của bài học phải ít nhất 3 ký tự" }),
  idKhoaHoc: z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
      message: "Id khóa học phải là UUID hợp lệ",
    }),
  idChuong: z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
      message: "Id chương phải là UUID hợp lệ",
    }),
  moTa: z.string().min(3,{ message: "Mô tả của bài học phải ít nhất 3 ký tự" }).optional(),
  anhBaiHoc: z.string().optional(),
  maVideo: z.string().optional(),
  thoiLuong: z.number().optional(),
});

export const updateLessonFormSchema = z.object({
  ten: z.string().min(1).optional(),
  moTa: z.string().optional(),
  maVideo: z.string().optional(),
  anhBaiHoc: z.string().optional(),
  thoiLuong: z.number().optional(),
});

export const couponFormSchema = z.object({
  tieuDe: z.string().min(1, "Tiêu đề không được để trống"),
  maGiamGia: z.string().min(1, "Mã giảm giá không được để trống"),
  ngayBatDau: z.string().nullable().optional(),
  ngayKetThuc: z.string().nullable().optional(),
  hoatDong: z.boolean().optional(),
  giaTri: z.number().min(0, "Giá trị phải lớn hơn hoặc bằng 0"),
  loai: z.enum(["PhanTram", "GiamTien"]),
  idKhoaHoc: z.array(z.string()).nullable().optional(),
  soLuong: z.number().nullable().optional(),
}).refine((data) => {
    if (!data.ngayBatDau || !data.ngayKetThuc) return true;
    const start = new Date(data.ngayBatDau);
    const end = new Date(data.ngayKetThuc);
    return end >= start;
}, {
    message: "Ngày kết thúc phải sau ngày bắt đầu",
    path: ["ngayKetThuc"],
});

export type KhoaHocSchemaType = z.infer<typeof khoaHocSchema>;
export type ChuongSchemaType = z.infer<typeof chuongSchema>;
export type BaiHocSchemaType = z.infer<typeof baiHocSchema>;
export type CapNhatBaiHocType = z.infer<typeof updateLessonFormSchema>;
export type CouponFormType = z.infer<typeof couponFormSchema>;