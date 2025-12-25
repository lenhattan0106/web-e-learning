const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Deleting all coupons...');
  try {
    const deleted = await prisma.maGiamGia.deleteMany({});
    console.log(`Deleted ${deleted.count} coupons.`);
  } catch (error) {
    console.error('Error deleting coupons:', error);
    // If table doesn't exist yet, that's fine too, essentially means 0 deleted or schema drift
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
