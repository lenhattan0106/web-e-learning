import { NextResponse } from "next/server";
import { z } from "zod";
import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import { S3 } from "@/lib/S3Client";
import aj, { fixedWindow } from "@/lib/arcjet";
import { requireTeacher } from "@/app/data/teacher/require-teacher";

const abortMultipartSchema = z.object({
  uploadId: z.string().min(1, { message: "UploadId là bắt buộc" }),
  key: z.string().min(1, { message: "Key là bắt buộc" }),
});

const arcjet = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 10,
  })
);

export async function POST(request: Request) {
  const session = await requireTeacher();
  
  try {
    const decision = await arcjet.protect(request, {
      fingerprint: session?.user.id as string,
    });
    
    if (decision.isDenied()) {
      return NextResponse.json(
        { error: "Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = abortMultipartSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dữ liệu yêu cầu không hợp lệ" },
        { status: 400 }
      );
    }

    const { uploadId, key } = validation.data;

    console.log(`[Multipart Abort] Aborting upload for ${key}, UploadId: ${uploadId}`);

    // Abort multipart upload - cleans up all parts
    const command = new AbortMultipartUploadCommand({
      Bucket: env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES,
      Key: key,
      UploadId: uploadId,
    });

    await S3.send(command);

    console.log(`[Multipart Abort] Successfully aborted upload for ${key}`);

    return NextResponse.json(
      {
        success: true,
        message: "Upload đã được hủy và dọn dẹp thành công",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Multipart Abort] Error:", error);
    // Even if abort fails, return success to not block UI
    return NextResponse.json(
      {
        success: true,
        message: "Đã cố gắng hủy upload",
      },
      { status: 200 }
    );
  }
}
