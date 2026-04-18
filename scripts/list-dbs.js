const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const dbs = await prisma.$queryRaw`SHOW DATABASES`;
        console.log("Existing Databases:", dbs);
    } catch (e) {
        console.error("Error showing databases:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
