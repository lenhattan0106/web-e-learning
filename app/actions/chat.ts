"use server";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { revalidatePath } from "next/cache";
import Pusher from "pusher"; // Import Pusher server SDK


/**
 * Get the Chat Room ID and user role for a given Course.
 * Verifies access rights.
 */
export async function getChatRoom(courseId: string) {
  const session = await requireUser();

  // 1. Get Course to check Owner (Teacher)
  const course = await prisma.khoaHoc.findUnique({
    where: { id: courseId },
    include: { phongChat: true },
  });

  if (!course) {
    return { error: "Không tìm thấy khóa học" };
  }

  // Ensure Chat Room exists
  if (!course.phongChat) {
    // Attempt to backfill if missing (Unexpected but safe)
    const newChat = await prisma.phongChat.create({
      data: {
        tenPhong: course.tenKhoaHoc,
        khoaHocId: course.id,
      },
    });
    course.phongChat = newChat;
  }

  // Check Role
  let role = "student";
  if (course.idNguoiDung === session.id) {
    role = "admin"; // Teacher/Owner
  } else {
    // Check Enrollment for Student
    const enrollment = await prisma.dangKyHoc.findUnique({
      where: {
        idNguoiDung_idKhoaHoc: {
          idNguoiDung: session.id,
          idKhoaHoc: course.id,
        },
      },
    });

    if (!enrollment || enrollment.trangThai !== "DaThanhToan") {
       // Allow access? No.
       return { error: "Bạn chưa đăng ký khóa học này" };
    }
  }

  return {
    chatRoomId: course.phongChat.id,
    maMoi: course.phongChat.maMoi,
    role: role,
    currentUserId: session.id,
  };
}

export async function getMessages(chatRoomId: string, cursor?: string) {
    try {
        const MESSAGES_PER_PAGE = 50;

        const messages = await prisma.tinNhan.findMany({
            where: { phongChatId: chatRoomId, isDeleted: false },
            take: MESSAGES_PER_PAGE,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" }, // Fetch newest first
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    }
                }
            }
        });

        // Reverse to show chronological order (oldest -> newest)
        return { messages: messages.reverse() };
    } catch (error) {
        console.error("Error fetching messages:", error);
        return { error: "Lỗi tải tin nhắn" };
    }
}

export async function sendMessage(chatRoomId: string, content: string) {
    const session = await requireUser();
    // const Pusher = require('pusher'); // Removed commonjs require
    if (!content.trim()) return { error: "Nội dung trống" };

    try {
        const newMessage = await prisma.tinNhan.create({
            data: {
                noiDung: content,
                phongChatId: chatRoomId,
                userId: session.id,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    }
                }
            }
        });
        
        const pusher = new Pusher({
          appId: env.PUSHER_APP_ID,
          key: env.NEXT_PUBLIC_PUSHER_KEY,
          secret: env.PUSER_SERCET, // Note: Keeping env var name as is if that's how it is in env file, but key property MUST be 'secret'
          cluster: 'ap1',
          useTLS: true
        });
        
        await pusher.trigger('nt-elearning', 'event', newMessage);        
        return { success: true, message: newMessage };
    } catch (error) {
        console.error("Error sending message:", error);
        return { error: "Lỗi gửi tin nhắn" };
    }
}
