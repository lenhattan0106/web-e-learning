"use server";

import { TrangThaiKhoaHocEnum } from "@/lib/generated/prisma";

const STATUS_MAP: Record<TrangThaiKhoaHocEnum, string> = {
  BanNhap: "Bản nháp",
  BanChinhThuc: "Đã xuất bản",
  BanLuuTru: "Đã lưu trữ",
  BiChan: "Bị chặn",
};

export async function getTrangThais() {
  return Object.entries(STATUS_MAP).map(([value, label]) => ({
    id: value,
    tenTrangThai: label,
    maTrangThai: value,
  }));
}



export async function createQuickTrangThai(_tenTrangThai: string) {
  return { 
    error: "Trạng thái khóa học được định nghĩa cố định trong hệ thống. Không thể tạo mới." 
  };
}

export async function editTrangThai(_id: string, _tenTrangThai: string) {
  return { 
    error: "Trạng thái khóa học được định nghĩa cố định trong hệ thống. Không thể chỉnh sửa." 
  };
}

export async function deleteTrangThai(_id: string) {
  return { 
    error: "Trạng thái khóa học được định nghĩa cố định trong hệ thống. Không thể xóa." 
  };
}
