import { NextResponse } from "next/server";
import { z } from "zod";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import { v4 as uuidv4 } from "uuid";
import { S3 } from "@/lib/S3Client";
import aj, { fixedWindow } from "@/lib/arcjet";
import { requireTeacher } from "@/app/data/teacher/require-teacher";

const multipartInitiateSchema = z.object({
  fileName: z.string().min(1, { message: "Tên tệp là bắt buộc" }),
  contentType: z.string().min(1, { message: "Loại nội dung là bắt buộc" }),
  size: z.number().min(1, { message: "Kích thước là bắt buộc" }),
  folder: z.string().optional(), // Optional S3 folder prefix
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
    const validation = multipartInitiateSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dữ liệu yêu cầu không hợp lệ" },
        { status: 400 }
      );
    }

    const { fileName, contentType, size, folder } = validation.data;
    
    // Construct key with optional folder prefix
    const folderPrefix = folder ? `${folder}/` : "";
    const uniqueKey = `${folderPrefix}${uuidv4()}-${fileName}`;

    // Initiate multipart upload
    const command = new CreateMultipartUploadCommand({
      Bucket: env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES,
      Key: uniqueKey,
      ContentType: contentType,
    });

    const response = await S3.send(command);

    if (!response.UploadId) {
      throw new Error("S3 did not return UploadId");
    }

    console.log(`[Multipart] Initiated upload for ${fileName} (${size} bytes), UploadId: ${response.UploadId}`);

    return NextResponse.json(
      {
        uploadId: response.UploadId,
        key: uniqueKey,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Multipart Initiate] Error:", error);
    return NextResponse.json(
      { error: "Không thể khởi tạo upload. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
