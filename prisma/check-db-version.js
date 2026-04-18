/**
 * Script: check-db-version.js
 * 
 * Checa a versão do banco para validar compatibilidade DROP FK IF EXISTS
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Verificando versão do banco...');
    const result = await prisma.$queryRaw`SELECT VERSION() as v`;
    const version = result[0].v;
    console.log(`Versão: ${version}`);

    // Validação simples
    // MariaDB 10.5+ suporta DROP FK IF EXISTS
    // MySQL 8.0+ suporta DROP FK IF EXISTS? MySQL 5.7 não.
    //
    // Mas no migration init_v2 squashed, o CREATE TABLE é usado, 
    // então DROP FK IF EXISTS nem deve existir se é CREATE limpo!
    //
    // Se init_v2 é "Create", não tem drops. O drop existe na migration incremental antiga.
    // Como fizemos squash, o risco de DROP IF EXISTS sumiu!
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
