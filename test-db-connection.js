const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('Attempting to connect to the database...');
  try {
    await prisma.$connect();
    console.log('Successfully connected to the database via Prisma!');
    
    // Run a simple query
    const userCount = await prisma.user.count();
    console.log(`Connection verified. User count: ${userCount}`);
  } catch (error) {
    console.error('Failed to connect to the database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
