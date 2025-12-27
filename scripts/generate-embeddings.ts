
import { PrismaClient } from "@prisma/client"; // Use direct import for script
import { generateEmbedding } from "../lib/ai/embedding";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting embedding generation...");

  try {
    // 1. Fetch all lessons (baiHoc)
    const lessons = await prisma.baiHoc.findMany({
      select: {
        id: true,
        tenBaiHoc: true,
        moTa: true,
      },
      // You can optimize by filtering those without embeddings if needed:
      // where: { embedding: null } 
    });

    console.log(`Found ${lessons.length} lessons.`);

    let successCount = 0;
    let skipCount = 0;

    for (const lesson of lessons) {
      // Logic to decide if we regenerate. 
      // For now, let's regenerate only if embedding is missing or to force update, uncomment line below
      // if (lesson.embedding) { skipCount++; continue; } 

      const textToEmbed = `${lesson.tenBaiHoc}. ${lesson.moTa || ""}`;
      
      try {
        console.log(`Processing: ${lesson.tenBaiHoc}`);
        const embeddingVector = await generateEmbedding(textToEmbed);
        
        // Update database using raw SQL because Prisma doesn't fully support vector write types natively in clean string format sometimes
        // But let's try raw update for the vector column specifically
        await prisma.$executeRaw`
          UPDATE "baiHoc"
          SET "embedding" = ${JSON.stringify(embeddingVector)}::vector
          WHERE "id" = ${lesson.id}
        `;

        successCount++;
        // Small delay to avoid rate limits if many items
        await new Promise(r => setTimeout(r, 200)); 

      } catch (err) {
        console.error(`Failed to process lesson ${lesson.id}:`, err);
      }
    }

    console.log(`\n✅ Finished!`);
    console.log(`Processed: ${successCount}`);
    console.log(`Skipped: ${skipCount}`);

  } catch (error) {
    console.error("Script error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
