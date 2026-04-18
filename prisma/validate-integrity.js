/**
 * Script: validate-integrity.js
 * 
 * Valida integridade do banco após Migração Etapa 2
 * 
 * Uso: node prisma/validate-integrity.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('='.repeat(70));
    console.log('VALIDAÇÃO DE INTEGRIDADE - WORKFORCE v2');
    console.log('='.repeat(70));
    console.log('');

    let allPassed = true;

    // =========================================================
    // 2.1 INTEGRIDADE E ÓRFÃOS
    // =========================================================
    console.log('2.1 INTEGRIDADE E ÓRFÃOS');
    console.log('-'.repeat(70));

    // Payables NULL worker_id
    const payablesNullWorker = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM payables WHERE worker_id IS NULL
    `;
    const payablesNull = Number(payablesNullWorker[0].count);
    console.log(`Payables com worker_id NULL: ${payablesNull} ${payablesNull === 0 ? '✅' : '❌'}`);
    if (payablesNull !== 0) allPassed = false;

    // Assignments NULL worker_id
    const assignmentsNullWorker = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM assignments WHERE worker_id IS NULL
    `;
    const assignmentsNull = Number(assignmentsNullWorker[0].count);
    console.log(`Assignments com worker_id NULL: ${assignmentsNull} ${assignmentsNull === 0 ? '✅' : '❌'}`);
    if (assignmentsNull !== 0) allPassed = false;

    // Payables órfãos
    const payablesOrfaos = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM payables p 
        LEFT JOIN workers w ON w.id = p.worker_id
        WHERE p.worker_id IS NOT NULL AND w.id IS NULL
    `;
    const payablesOrf = Number(payablesOrfaos[0].count);
    console.log(`Payables com worker_id órfão: ${payablesOrf} ${payablesOrf === 0 ? '✅' : '❌'}`);
    if (payablesOrf !== 0) allPassed = false;

    // Assignments órfãos  
    const assignmentsOrfaos = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM assignments a 
        LEFT JOIN workers w ON w.id = a.worker_id
        WHERE a.worker_id IS NOT NULL AND w.id IS NULL
    `;
    const assignmentsOrf = Number(assignmentsOrfaos[0].count);
    console.log(`Assignments com worker_id órfão: ${assignmentsOrf} ${assignmentsOrf === 0 ? '✅' : '❌'}`);
    if (assignmentsOrf !== 0) allPassed = false;

    console.log('');

    // =========================================================
    // 2.2 DUPLICIDADE DE WORKERS
    // =========================================================
    console.log('2.2 DUPLICIDADE DE WORKERS');
    console.log('-'.repeat(70));

    // Email duplicados
    const emailDuplicados = await prisma.$queryRaw`
        SELECT email_normalized, COUNT(*) as c
        FROM workers
        WHERE email_normalized IS NOT NULL
        GROUP BY email_normalized
        HAVING c > 1
    `;
    console.log(`Emails duplicados: ${emailDuplicados.length} ${emailDuplicados.length === 0 ? '✅' : '❌'}`);
    if (emailDuplicados.length > 0) {
        allPassed = false;
        console.log('  Duplicados:', emailDuplicados);
    }

    // EIN duplicados
    const einDuplicados = await prisma.$queryRaw`
        SELECT ein, COUNT(*) as c
        FROM workers
        WHERE ein IS NOT NULL
        GROUP BY ein
        HAVING c > 1
    `;
    console.log(`EINs duplicados: ${einDuplicados.length} ${einDuplicados.length === 0 ? '✅' : '❌'}`);
    if (einDuplicados.length > 0) {
        allPassed = false;
        console.log('  Duplicados:', einDuplicados);
    }

    console.log('');

    // =========================================================
    // 2.3 ÍNDICES E CONSTRAINTS
    // =========================================================
    console.log('2.3 ÍNDICES E CONSTRAINTS');
    console.log('-'.repeat(70));

    // Workers indexes
    const workersIndexes = await prisma.$queryRaw`SHOW INDEX FROM workers`;
    console.log(`Workers: ${workersIndexes.length} índices`);

    const uniqueIndexes = workersIndexes.filter(i => i.Non_unique === 0);
    console.log(`  Unique indexes: ${uniqueIndexes.map(i => i.Key_name).join(', ')}`);

    // Payables indexes
    const payablesIndexes = await prisma.$queryRaw`SHOW INDEX FROM payables`;
    console.log(`Payables: ${payablesIndexes.length} índices`);

    // Assignments indexes
    const assignmentsIndexes = await prisma.$queryRaw`SHOW INDEX FROM assignments`;
    console.log(`Assignments: ${assignmentsIndexes.length} índices`);

    console.log('');

    // =========================================================
    // RESULTADO FINAL
    // =========================================================
    console.log('='.repeat(70));
    if (allPassed) {
        console.log('✅ TODAS AS VALIDAÇÕES PASSARAM');
    } else {
        console.log('❌ ALGUMAS VALIDAÇÕES FALHARAM');
    }
    console.log('='.repeat(70));

    return allPassed;
}

main()
    .then((passed) => {
        process.exit(passed ? 0 : 1);
    })
    .catch((e) => {
        console.error('Erro:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
