"use server";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { revalidatePath } from "next/cache";
import Pusher from "pusher";
import {
  sendNotification,
  NOTIFICATION_TEMPLATES,
} from "@/app/services/notification-service";


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

export async function sendMessage(chatRoomId: string, content: string, fileUrl?: string | null, fileType?: string | null, fileName?: string | null) {
    const session = await requireUser();
    
    // Check if user is banned
    const enrollment = await prisma.dangKyHoc.findFirst({
        where: {
            idNguoiDung: session.id,
            khoaHoc: {
                phongChat: {
                    id: chatRoomId
                }
            }
        },
        select: { camChat: true }
    });

    if (enrollment?.camChat) {
        return { error: "Bạn đã bị hạn chế quyền thảo luận trong phòng này." };
    }

    if (!content.trim() && !fileUrl) return { error: "Nội dung trống hoặc không có tệp đính kèm" };

    try {
        const newMessage = await prisma.tinNhan.create({
            data: {
                noiDung: content,
                phongChatId: chatRoomId,
                userId: session.id,
                fileUrl: fileUrl,
                fileType: fileType,
                fileName: fileName,
                loaiTinNhan: "USER"
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
          secret: env.PUSER_SERCET, 
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

export async function getChatMembers(chatRoomId: string) {
    const session = await requireUser();
    
    try {
        // ... existing findUnique
        const chatRoom = await prisma.phongChat.findUnique({
            where: { id: chatRoomId },
            select: { khoaHoc: { select: { idNguoiDung: true } }, khoaHocId: true }
        });

        if (!chatRoom) return { error: "Phòng chat không tồn tại" };

        const isTeacher = chatRoom.khoaHoc.idNguoiDung === session.id;

        // Get enrollments (members)
        const enrolledMembers = await prisma.dangKyHoc.findMany({
            where: { idKhoaHoc: chatRoom.khoaHocId },
            include: {
                nguoiDung: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        email: true
                    }
                }
            }
        });

        // Get Teacher (Course Owner)
        const teacher = await prisma.user.findUnique({
            where: { id: chatRoom.khoaHoc.idNguoiDung },
            select: { id: true, name: true, image: true, email: true }
        });

        const members = enrolledMembers.map(m => ({
            userId: m.idNguoiDung,
            name: m.nguoiDung.name,
            image: m.nguoiDung.image,
            email: m.nguoiDung.email,
            camChat: m.camChat,
            role: 'STUDENT'
        }));

        if (teacher) {
            // Check if teacher is already in list (unlikely but possible if they bought their own course for testing)
            const exists = members.find(m => m.userId === teacher.id);
            if (!exists) {
                members.unshift({
                    userId: teacher.id,
                    name: teacher.name,
                    image: teacher.image,
                    email: teacher.email,
                    camChat: false,
                    role: 'TEACHER'
                });
            } else {
                // If exists, force role to TEACHER
                exists.role = 'TEACHER';
            }
        }

        return { 
            success: true, 
            isTeacher,
            members
        };
    } catch (error) {
        console.error("Error fetching members:", error);
        return { error: "Lỗi tải thành viên" };
    }
}

export async function toggleChatBan(chatRoomId: string, memberId: string) {
    const session = await requireUser();
    
    // Verify teacher (owner of course)
    const chatRoom = await prisma.phongChat.findUnique({
        where: { id: chatRoomId },
        include: { khoaHoc: true }
    });

    if (!chatRoom || chatRoom.khoaHoc.idNguoiDung !== session.id) {
        return { error: "Bạn không có quyền quản lý phòng này" };
    }

    try {
        // Find enrollment
        const enrollment = await prisma.dangKyHoc.findUnique({
             where: {
                idNguoiDung_idKhoaHoc: {
                    idNguoiDung: memberId,
                    idKhoaHoc: chatRoom.khoaHocId
                }
             }
        });

        if (!enrollment) return { error: "Học viên không tồn tại" };

        const newStatus = !enrollment.camChat;
        
        // Update status
        await prisma.dangKyHoc.update({
            where: { id: enrollment.id },
            data: { camChat: newStatus }
        });

        // Send System Message
        const pusher = new Pusher({
            appId: env.PUSHER_APP_ID,
            key: env.NEXT_PUBLIC_PUSHER_KEY,
            secret: env.PUSER_SERCET, 
            cluster: 'ap1',
            useTLS: true
        });

        const memberUser = await prisma.user.findUnique({ where: { id: memberId }});
        const systemContent = newStatus 
            ? `${memberUser?.name || 'Thành viên'} đã bị hạn chế quyền thảo luận.`
            : `${memberUser?.name || 'Thành viên'} đã được khôi phục quyền thảo luận.`;

        const systemMessage = await prisma.tinNhan.create({
            data: {
                noiDung: systemContent,
                phongChatId: chatRoomId,
                userId: session.id, // Teacher ID but SYSTEM type
                loaiTinNhan: "SYSTEM",
            },
            include: {
                user: { select: { id: true, name: true, image: true } }
            }
        });

        await pusher.trigger('nt-elearning', 'event', systemMessage);
        await pusher.trigger('nt-elearning', 'member-updated', { userId: memberId, camChat: newStatus });

        // Send notification to the affected member
        const courseName = chatRoom.khoaHoc.tenKhoaHoc;
        const courseSlug = chatRoom.khoaHoc.duongDan;
        const template = newStatus
          ? NOTIFICATION_TEMPLATES.CHAT_BANNED(courseName)
          : NOTIFICATION_TEMPLATES.CHAT_UNBANNED(courseName);

        await sendNotification({
          userId: memberId,
          title: template.title,
          message: template.message,
          type: "KHOA_HOC",
          metadata: {
            url: `/courses/${courseSlug}`,
            courseId: chatRoom.khoaHocId,
            chatRoomId: chatRoomId,
          },
        });

        return { success: true, isBanned: newStatus };
    } catch (error) {
        console.error("Error toggling ban:", error);
        return { error: "Lỗi cập nhật trạng thái" };
    }
}

export async function deleteMessage(messageId: string) {
    const session = await requireUser();

    try {
        const message = await prisma.tinNhan.findUnique({
            where: { id: messageId },
        });

        if (!message) return { error: "Không tìm thấy tin nhắn" };
        if (message.userId !== session.id) return { error: "Bạn không có quyền xóa tin nhắn này" };

        const deletedMessage = await prisma.tinNhan.update({
            where: { id: messageId },
            data: { isDeleted: true },
        });

       const pusher = new Pusher({
          appId: env.PUSHER_APP_ID,
          key: env.NEXT_PUBLIC_PUSHER_KEY,
          secret: env.PUSER_SERCET, 
          cluster: 'ap1',
          useTLS: true
        });

        await pusher.trigger('nt-elearning', 'message-deleted', { id: messageId });

        return { success: true };
    } catch (error) {
         console.error("Error deleting message:", error);
         return { error: "Lỗi xóa tin nhắn" };
    }
}

export async function editMessage(messageId: string, newContent: string) {
    const session = await requireUser();

    if (!newContent.trim()) return { error: "Nội dung không được để trống" };

    try {
        const message = await prisma.tinNhan.findUnique({
            where: { id: messageId },
        });

        if (!message) return { error: "Không tìm thấy tin nhắn" };
        if (message.userId !== session.id) return { error: "Bạn không có quyền sửa tin nhắn này" };
        
        // Prevent editing if message has file (per user request)
        if (message.fileUrl) return { error: "Không thể chỉnh sửa tin nhắn có tệp đính kèm" };

        const updatedMessage = await prisma.tinNhan.update({
            where: { id: messageId },
            data: { noiDung: newContent },
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
          secret: env.PUSER_SERCET, 
          cluster: 'ap1',
          useTLS: true
        });

        await pusher.trigger('nt-elearning', 'message-updated', updatedMessage);

        return { success: true, message: updatedMessage };
    } catch (error) {
        console.error("Error editing message:", error);
        return { error: "Lỗi sửa tin nhắn" };
    }
}
