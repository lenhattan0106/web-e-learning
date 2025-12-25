import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from '@/lib/env';
import { v4 as uuidv4 } from 'uuid';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3 } from '@/lib/S3Client';
import aj, { fixedWindow } from '@/lib/arcjet';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const fileUploadSchema = z.object({
  fileName: z.string().min(1, { message: "Tên tệp là bắt buộc" }),
  contentType: z.string().min(1, { message: "Loại nội dung là bắt buộc" }),
  size: z.number().min(1, { message: "Kích thước là bắt buộc" }),
  isImage: z.boolean(),
});

const arcjet = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 5,
  })
);

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decision = await arcjet.protect(request, { fingerprint: session.user.id });
    if (decision.isDenied()) {
      return NextResponse.json({ error: "Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau." }, { status: 429 });
    }

    const body = await request.json();
    const validation = fileUploadSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      const errorMessage = firstError?.message || "Dữ liệu yêu cầu không hợp lệ";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { fileName, contentType, size } = validation.data;
    
    // Validate file name length
    if (fileName.length > 255) {
      return NextResponse.json({ error: "Tên file quá dài. Vui lòng đổi tên file ngắn hơn" }, { status: 400 });
    }

    // Validate it's an image
    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!contentType.startsWith("image/") || !allowedImageTypes.includes(contentType)) {
      return NextResponse.json({ error: "Chỉ được phép tải lên file ảnh (JPG, PNG, GIF, WEBP)" }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (size > maxSize) {
      return NextResponse.json({ error: "Kích thước ảnh không được vượt quá 5MB" }, { status: 400 });
    }

    const uniqueKey = `avatars/${uuidv4()}-${fileName}`;
    const command = new PutObjectCommand({
      Bucket: env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES,
      ContentType: contentType,
      ContentLength: size,
      Key: uniqueKey,
    });
    const presignedURL = await getSignedUrl(S3, command, {
      expiresIn: 360, // url expires in 6 minutes
    });
    const response = {
      presignedURL: presignedURL,
      key: uniqueKey,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json({ error: "Không thể tạo URL tải lên. Vui lòng thử lại." }, { status: 500 });
  }
}

