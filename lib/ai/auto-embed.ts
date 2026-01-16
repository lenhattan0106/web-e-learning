/**
 *Tự động tạo embedding khi Create/Update
 */

import { prisma } from "@/lib/db";
import { generateEmbedding } from "@/lib/ai/embedding";
import { cleanText } from "@/lib/utils/clean";

export async function embedKhoaHoc(
  courseId: string,
  tenKhoaHoc: string,
  moTaNgan: string,
  moTa?: string
): Promise<void> {
  try {
    const rawText = `${tenKhoaHoc}. ${moTaNgan}. ${moTa || ""}`;
    const text = cleanText(rawText);
    
    if (text.length < 10) return;
    
    const embedding = await generateEmbedding(text);
    const vectorQuery = `[${embedding.join(",")}]`;
    
    await prisma.$executeRaw`
      UPDATE "khoaHoc" SET embedding = ${vectorQuery}::vector WHERE id = ${courseId}
    `;
    console.log(`✅ Auto-embedded KhoaHoc: ${tenKhoaHoc}`);
  } catch (error) {
    console.error(`❌ Auto-embed KhoaHoc failed:`, error);
  }
}

export async function embedBaiHoc(
  lessonId: string,
  tenBaiHoc: string,
  moTa?: string
): Promise<void> {
  try {
    // Combine title and description, then clean HTML
    const rawText = `${tenBaiHoc}. ${moTa || ""}`;
    const text = cleanText(rawText);

    if (text.length < 10) return;
    
    const embedding = await generateEmbedding(text);
    const vectorQuery = `[${embedding.join(",")}]`;
    
    await prisma.$executeRaw`
      UPDATE "baiHoc" SET embedding = ${vectorQuery}::vector WHERE id = ${lessonId}
    `;
    console.log(`✅ Auto-embedded BaiHoc: ${tenBaiHoc}`);
  } catch (error) {
    console.error(`❌ Auto-embed BaiHoc failed:`, error);
  }
}

export async function embedMaGiamGia(
  discountId: string,
  tieuDe: string,
  moTa?: string
): Promise<void> {
  try {
    const rawText = `${tieuDe}. ${moTa || ""}`;
    const text = cleanText(rawText);

    if (text.length < 10) return;
    
    const embedding = await generateEmbedding(text);
    const vectorQuery = `[${embedding.join(",")}]`;
    
    await prisma.$executeRaw`
      UPDATE "maGiamGia" SET embedding = ${vectorQuery}::vector WHERE id = ${discountId}
    `;
    console.log(`✅ Auto-embedded maGiamGia: ${tieuDe}`);
  } catch (error) {
    console.error(`❌ Auto-embed maGiamGia failed:`, error);
  }
}
