/**
 * Script: show-migrations.js
 * 
 * Mostra registros em _prisma_migrations
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('='.repeat(70));
    console.log('_prisma_migrations');
    console.log('='.repeat(70));

    const migrations = await prisma.$queryRaw`
        SELECT migration_name, checksum, finished_at, applied_steps_count
        FROM _prisma_migrations
        ORDER BY applied_steps_count
    `;

    console.log('');
    console.log('migration_name | checksum | finished_at');
    console.log('-'.repeat(70));
    migrations.forEach(m => {
        const checksum = m.checksum ? m.checksum.substring(0, 16) + '...' : 'N/A';
        console.log(`${m.migration_name} | ${checksum} | ${m.finished_at}`);
    });
    console.log('');
    console.log(`Total: ${migrations.length} migrations`);
}

main()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
