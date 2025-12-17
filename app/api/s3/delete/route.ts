import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import { S3 } from "@/lib/S3Client";
import aj, { fixedWindow } from "@/lib/arcjet";
import { requireTeacher } from "@/app/data/teacher/require-teacher";

const arcjet = aj
  .withRule(
    fixedWindow({
      mode: "LIVE",
      window: "1m",
      max: 5,
    })
  );

export async function DELETE(request: Request) {
  const session = await requireTeacher();

  try {
    const decision = await arcjet.protect(request, {
      fingerprint: session?.user.id as string,
    });
    if (decision.isDenied()) {
      return NextResponse.json({ error: "Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau." }, { status: 429 });
    }
    const body = await request.json();
    const key = body.key;
    if (!key) {
      return NextResponse.json(
        { error: "Thiếu hoặc không hợp lệ khóa đối tượng" },
        { status: 400 }
      );
    }
    const command = new DeleteObjectCommand({
      Bucket: env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES,
      Key: key,
    });
    await S3.send(command);
    return NextResponse.json(
      { message: "Xóa tệp thành công" },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Không thể xóa tệp. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
