/**
 * Generate Embeddings Script - Tri-Layer RAG
 * 
 * Chạy: npx tsx scripts/generate-embeddings.ts
 * 
 * Script này tạo embeddings cho:
 * 1. BaiHoc - Mentoring (đã có từ trước)
 * 2. KhoaHoc - Course Discovery (mới)
 * 3. maGiamGia - Sales Assistant (mới)
 */

import { PrismaClient } from "@prisma/client";
import { generateEmbedding } from "../lib/ai/embedding";
import { cleanText } from "../lib/utils/clean";

const prisma = new PrismaClient();

async function generateBaiHocEmbeddings() {
  console.log("📖 Generating embeddings for BaiHoc (Lessons)...");
  
  const lessons = await prisma.baiHoc.findMany({
    select: { id: true, tenBaiHoc: true, moTa: true }
  });

  let count = 0;
  for (const lesson of lessons) {
    const text = cleanText(`${lesson.tenBaiHoc}. ${lesson.moTa || ""}`);
    if (text.trim().length < 10) continue;
    
    try {
      const embedding = await generateEmbedding(text);
      await prisma.$executeRaw`
        UPDATE "baiHoc" SET "embedding" = ${JSON.stringify(embedding)}::vector WHERE "id" = ${lesson.id}
      `;
      count++;
      console.log(`   ✅ ${lesson.tenBaiHoc}`);
    } catch (err) {
      console.error(`   ❌ ${lesson.tenBaiHoc}:`, err);
    }
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`✅ BaiHoc: ${count}/${lessons.length}\n`);
}

async function generateKhoaHocEmbeddings() {
  console.log("📚 Generating embeddings for KhoaHoc (Courses)...");
  
  const courses = await prisma.khoaHoc.findMany({
    select: { id: true, tenKhoaHoc: true, moTaNgan: true, moTa: true }
  });

  let count = 0;
  for (const course of courses) {
    const text = cleanText(`${course.tenKhoaHoc}. ${course.moTaNgan}. ${course.moTa || ""}`);
    if (text.trim().length < 10) continue;
    
    try {
      const embedding = await generateEmbedding(text);
      await prisma.$executeRaw`
        UPDATE "khoaHoc" SET embedding = ${JSON.stringify(embedding)}::vector WHERE id = ${course.id}
      `;
      count++;
      console.log(`   ✅ ${course.tenKhoaHoc}`);
    } catch (err) {
      console.error(`   ❌ ${course.tenKhoaHoc}:`, err);
    }
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`✅ KhoaHoc: ${count}/${courses.length}\n`);
}

async function generateMaGiamGiaEmbeddings() {
  console.log("🎟️ Generating embeddings for maGiamGia (Discounts)...");
  
  const discounts = await prisma.maGiamGia.findMany({
    select: { id: true, tieuDe: true, moTa: true }
  });

  let count = 0;
  for (const discount of discounts) {
    const text = cleanText(`${discount.tieuDe}. ${discount.moTa || ""}`);
    if (text.trim().length < 10) {
      console.log(`   ⏭️ Skip: ${discount.tieuDe} (no description)`);
      continue;
    }
    
    try {
      const embedding = await generateEmbedding(text);
      await prisma.$executeRaw`
        UPDATE "maGiamGia" SET embedding = ${JSON.stringify(embedding)}::vector WHERE id = ${discount.id}
      `;
      count++;
      console.log(`   ✅ ${discount.tieuDe}`);
    } catch (err) {
      console.error(`   ❌ ${discount.tieuDe}:`, err);
    }
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`✅ maGiamGia: ${count}/${discounts.length}\n`);
}

async function main() {
  console.log("🚀 Tri-Layer RAG Embedding Generation\n");
  console.log("=====================================\n");
  
  await generateBaiHocEmbeddings();
  await generateKhoaHocEmbeddings();
  await generateMaGiamGiaEmbeddings();
  
  console.log("=====================================");
  console.log("🎉 Done! AI is now smarter.\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
