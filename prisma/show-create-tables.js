/**
 * Script: show-create-tables.js
 * 
 * Coleta SHOW CREATE TABLE para evidências
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('='.repeat(70));
    console.log('EVIDÊNCIAS: SHOW CREATE TABLE');
    console.log('='.repeat(70));
    console.log('');

    // Workers
    console.log('--- WORKERS ---');
    const workersCreate = await prisma.$queryRaw`SHOW CREATE TABLE workers`;
    console.log(workersCreate[0]['Create Table']);
    console.log('');

    // Payables
    console.log('--- PAYABLES ---');
    const payablesCreate = await prisma.$queryRaw`SHOW CREATE TABLE payables`;
    console.log(payablesCreate[0]['Create Table']);
    console.log('');

    // Assignments
    console.log('--- ASSIGNMENTS ---');
    const assignmentsCreate = await prisma.$queryRaw`SHOW CREATE TABLE assignments`;
    console.log(assignmentsCreate[0]['Create Table']);
    console.log('');

    // Indexes
    console.log('--- WORKERS INDEXES ---');
    const workersIdx = await prisma.$queryRaw`SHOW INDEX FROM workers`;
    console.log('Key_name | Column_name | Non_unique');
    workersIdx.forEach(idx => {
        console.log(`${idx.Key_name} | ${idx.Column_name} | ${idx.Non_unique}`);
    });
}

main()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
