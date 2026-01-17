import { NextResponse } from "next/server";
import { z } from "zod";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import { S3 } from "@/lib/S3Client";
import aj, { fixedWindow } from "@/lib/arcjet";
import { requireTeacher } from "@/app/data/teacher/require-teacher";

const completeMultipartSchema = z.object({
  uploadId: z.string().min(1, { message: "UploadId là bắt buộc" }),
  key: z.string().min(1, { message: "Key là bắt buộc" }),
  parts: z.array(
    z.object({
      PartNumber: z.number().int().min(1),
      ETag: z.string().min(1),
    })
  ).min(1, { message: "Parts array không được rỗng" }),
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
    const validation = completeMultipartSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dữ liệu yêu cầu không hợp lệ", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { uploadId, key, parts } = validation.data;

    console.log(`[Multipart Complete] Assembling ${parts.length} parts for ${key}`);

    const command = new CompleteMultipartUploadCommand({
      Bucket: env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts, // {PartNumber, ETag}[]
      },
    });

    const response = await S3.send(command);

    console.log(`[Multipart Complete] Success! Location: ${response.Location}`);

    return NextResponse.json(
      {
        success: true,
        key: key,
        location: response.Location, 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Multipart Complete] Error:", error);
    return NextResponse.json(
      { error: "Không thể hoàn tất upload. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
