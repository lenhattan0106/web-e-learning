import { getDanhMucs } from "@/app/teacher/actions/categories";
import { getCapDos } from "@/app/teacher/actions/levels";
import { trangThaiKhoaHoc } from "@/lib/zodSchemas";
import { CourseCreationForm } from "./CourseCreationForm";

export const dynamic = "force-dynamic";

export default async function CourseCreationPage() {
  const [categories, levels] = await Promise.all([
    getDanhMucs(),
    getCapDos(),
  ]);

  // Use constant status values (excludes BiChan)
  const statuses = trangThaiKhoaHoc.map((code) => ({
    id: code,
    maTrangThai: code,
    tenTrangThai: code === "BanNhap" ? "Bản nháp" : code === "BanChinhThuc" ? "Đã xuất bản" : "Lưu trữ"
  }));

  return (
    <CourseCreationForm 
      categories={categories} 
      levels={levels} 
      statuses={statuses} 
    />
  );
}
