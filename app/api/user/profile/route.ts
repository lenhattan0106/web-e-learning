import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Tên không được để trống")
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(100, "Tên không được vượt quá 100 ký tự")
    .trim(),
  image: z
    .string()
    .url("URL ảnh không hợp lệ")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Bạn chưa đăng nhập" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      const errorMessage = firstError?.message || "Dữ liệu không hợp lệ";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { name, image } = validation.data;

    // Update user profile trong User table
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name,
        image: image || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật thông tin. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

