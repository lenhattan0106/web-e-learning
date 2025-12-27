import { prisma } from "../lib/db";

async function main() {
  console.log("Creating HNSW index for BaiHoc embedding...");
  try {
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS baihoc_embedding_idx 
      ON "baiHoc" 
      USING hnsw (embedding vector_cosine_ops);
    `;
    console.log("Index created successfully.");
  } catch (error) {
    console.error("Error creating index:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
