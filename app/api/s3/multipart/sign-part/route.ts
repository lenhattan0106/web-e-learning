import { NextResponse } from "next/server";
import { z } from "zod";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { S3 } from "@/lib/S3Client";
import aj, { fixedWindow } from "@/lib/arcjet";
import { requireTeacher } from "@/app/data/teacher/require-teacher";

const signPartSchema = z.object({
  uploadId: z.string().min(1, { message: "UploadId là bắt buộc" }),
  key: z.string().min(1, { message: "Key là bắt buộc" }),
  partNumber: z.number().int().min(1, { message: "PartNumber phải >= 1" }),
});

const arcjet = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 100, // Higher limit for parts (large files have many parts)
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
    const validation = signPartSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dữ liệu yêu cầu không hợp lệ" },
        { status: 400 }
      );
    }

    const { uploadId, key, partNumber } = validation.data;

    // Generate presigned URL for this part
    // CRITICAL: Configure to expose ETag header for CORS
    const command = new UploadPartCommand({
      Bucket: env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const presignedUrl = await getSignedUrl(S3, command, {
      expiresIn: 3600, // 1 hour
      // CORS: Ensure ETag is accessible in response headers
      unhoistableHeaders: new Set(["x-amz-server-side-encryption"]),
    });

    return NextResponse.json(
      {
        presignedUrl,
        partNumber,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Multipart Sign-Part] Error:", error);
    return NextResponse.json(
      { error: "Không thể tạo URL cho phần upload. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
