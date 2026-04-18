const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Cleaning Up Client Address Fields (Empty String -> NULL) ---');
    try {
        const clients = await prisma.cliente.findMany();
        let updatedCount = 0;

        for (const client of clients) {
            const dataToUpdate = {};
            let needsUpdate = false;

            const fields = ['addressStreet', 'addressUnit', 'addressCity', 'addressState', 'addressZip', 'addressCounty'];

            for (const field of fields) {
                if (client[field] === '') {
                    dataToUpdate[field] = null;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await prisma.cliente.update({
                    where: { id: client.id },
                    data: dataToUpdate
                });
                updatedCount++;
                process.stdout.write('.');
            }
        }
        console.log(`\nCleanup complete. Updated ${updatedCount} clients.`);
    } catch (e) {
        console.error("Error during cleanup:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
