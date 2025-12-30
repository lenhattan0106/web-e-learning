import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting platform fee migration...");

  try {
    const PLATFORM_FEE_RATE = 0.05;

    // 1. Find records to update
    const recordsToUpdate = await prisma.dangKyHoc.findMany({
      where: {
        trangThai: "DaThanhToan",
        phiSan: 0,
        soTien: { gt: 0 }
      },
      select: {
        id: true,
        soTien: true
      }
    });

    console.log(`📋 Found ${recordsToUpdate.length} records needing update.`);

    if (recordsToUpdate.length === 0) {
      console.log("✅ No records to update.");
      return;
    }

    // 2. Update loop
    let updatedCount = 0;
    
    // Process in batches or parallel
    await prisma.$transaction(
      recordsToUpdate.map((record) => {
        const phiSan = Math.round(record.soTien * PLATFORM_FEE_RATE);
        const thanhToanThuc = record.soTien - phiSan;

        return prisma.dangKyHoc.update({
          where: { id: record.id },
          data: {
            phiSan,
            thanhToanThuc
          }
        });
      })
    );
    
    updatedCount = recordsToUpdate.length;

    console.log(`✅ Successfully updated ${updatedCount} records.`);
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
