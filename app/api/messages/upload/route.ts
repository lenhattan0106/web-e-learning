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

// Schema for file upload validation
const chatFileUploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().min(1).max(10 * 1024 * 1024, "File size must be less than 10MB"), // 10MB limit
});

// Rate limiting
const arcjet = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 10, // Allow more uploads for chat than profile
  })
);

const slugify = (str: string) => {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();
  
    // remove accents, swap ñ for n, etc
    const from = "àáäâãåăắặẳẵằèéëêềếệểễìíïîòóöôõơớờợởỡùúüûưứừựửữñç·/_,:;";
    const to   = "aaaaaaaaaaaaaeeeeeeeeeeiiiioooooooouuuuuuuuuuunc------";
    for (let i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }
  
    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes
  
    return str;
}

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
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const validation = chatFileUploadSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: validation.error.message }, { status: 400 });
    }

    const { fileName, contentType, size } = validation.data;

    // Allowed types: Images, PDFs, Docs, Text, Zip
    const allowedTypes = [
        // Images
        "image/jpeg", "image/png", "image/gif", "image/webp",
        // Documents
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
        "text/plain",
        "text/csv",
        // Excel
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        // PowerPoint
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
        // Archives
        "application/zip",
        "application/x-zip-compressed",
        "application/x-7z-compressed",
        // Audio
        "audio/mpeg", 
        "audio/wav", 
        "audio/webm",
        // Video
        "video/mp4", 
        "video/webm",
        // Code/Data
        "application/json",
        "text/javascript",
        "text/html"
    ];

    const isImage = contentType.startsWith("image/");
    const isAllowedOther = allowedTypes.includes(contentType);

    if (!isImage && !isAllowedOther) {
         return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    // Generate unique key - Use slugify for safe filename
    // Preserve extension
    const ext = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const safeName = `${slugify(nameWithoutExt)}.${ext}`;
    const uniqueKey = `chat/${uuidv4()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES,
      ContentType: contentType,
      ContentLength: size,
      Key: uniqueKey,
    });

    const presignedUrl = await getSignedUrl(S3, command, {
      expiresIn: 300, // 5 minutes
    });

    // Construct public URL based on S3 Endpoint (support for Tigris/Compatible S3)
    // Assuming Virtual-hosted-style: https://${bucket}.${endpoint_host}/${key}
    const endpointUrl = env.AWS_ENDPOINT_URL_S3;
    const protocol = endpointUrl.includes("https") ? "https" : "http";
    const host = endpointUrl.replace("https://", "").replace("http://", "");
    
    // Check if we are using standard AWS or custom provider
    const isStandardAWS = host.includes("amazonaws.com");
    
    let fileUrl;
    if (isStandardAWS) {
         fileUrl = `https://${env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES}.s3.amazonaws.com/${uniqueKey}`;
    } else {
         // Custom S3 (Tigris, MinIO, etc)
         fileUrl = `${protocol}://${env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES}.${host}/${uniqueKey}`;
    }

    return NextResponse.json({
      presignedUrl,
      fileKey: uniqueKey,
      fileUrl: fileUrl, 
      fileName: fileName
    });

  } catch (error) {
    console.error("Chat upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
