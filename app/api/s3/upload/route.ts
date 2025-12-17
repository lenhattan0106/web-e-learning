import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from '@/lib/env';
import { v4 as uuidv4 } from 'uuid';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3 } from '@/lib/S3Client';
import aj, { fixedWindow } from '@/lib/arcjet';
import { requireTeacher } from '@/app/data/teacher/require-teacher';

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
  const session = await requireTeacher();
  try {
    const decision = await arcjet.protect(request, { fingerprint: session?.user.id as string });
    if (decision.isDenied()) {
      return NextResponse.json({ error: "Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau." }, { status: 429 });
    }
    const body = await request.json();
    const validation = fileUploadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dữ liệu yêu cầu không hợp lệ" }, { status: 400 });
    }
    const { fileName, contentType, size } = validation.data;
    const uniqueKey = `${uuidv4()}-${fileName}`;
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
      // 👇 Frontend Uploader.tsx đang expect field "presignedURL"
      presignedURL: presignedURL,
      key: uniqueKey,
    };
    return NextResponse.json(response, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Không thể tạo URL tải lên. Vui lòng thử lại." }, { status: 500 });
  }
}