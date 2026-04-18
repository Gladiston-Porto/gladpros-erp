/**
 * Seed: Create Owner Worker (OWNER_OPERATOR)
 *
 * Creates a Worker record for the business owner (Gladiston Porto)
 * so he can be assigned to projects, service orders, and log work entries.
 *
 * Safe to run multiple times (checks before creating).
 *
 * Execution: node prisma/seed-owner-worker.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed: Owner Worker (OWNER_OPERATOR)\n');

  const empresa = await prisma.empresa.findFirst({ orderBy: { id: 'asc' } });
  if (!empresa) {
    console.error('❌ Nenhuma empresa encontrada.');
    process.exit(1);
  }
  console.log(`✅ Empresa: ${empresa.nome} (ID: ${empresa.id})\n`);

  // Find the ADMIN user (owner)
  const owner = await prisma.usuario.findFirst({
    where: { nivel: 'ADMIN', status: 'ATIVO' },
    orderBy: { id: 'asc' },
  });

  if (!owner) {
    console.error('❌ Nenhum usuário ADMIN encontrado. Execute create-gladiston-user.js primeiro.');
    process.exit(1);
  }
  console.log(`✅ Owner: ${owner.nomeCompleto} (ID: ${owner.id}, ${owner.email})\n`);

  // Check if Worker already exists for this user
  const existingWorker = await prisma.worker.findUnique({
    where: { usuarioId: owner.id },
  });

  if (existingWorker) {
    console.log(`⏭️  Worker já existe para ${owner.nomeCompleto} (Worker ID: ${existingWorker.id})`);

    // Ensure classification is OWNER_OPERATOR
    if (existingWorker.classification !== 'OWNER_OPERATOR') {
      await prisma.worker.update({
        where: { id: existingWorker.id },
        data: { classification: 'OWNER_OPERATOR' },
      });
      console.log(`✅ Classification atualizada para OWNER_OPERATOR`);
    }

    await ensureFinancialProfile(existingWorker);
    console.log('\n✅ Seed concluído!\n');
    return;
  }

  // Create Worker
  const worker = await prisma.worker.create({
    data: {
      usuarioId: owner.id,
      name: owner.nomeCompleto,
      email: owner.email,
      emailNormalized: owner.email.toLowerCase(),
      phone: owner.telefone || null,
      type: 'INDIVIDUAL',
      status: 'ACTIVE',
      classification: 'OWNER_OPERATOR',
      defaultHourlyRate: 85.00, // Placeholder — adjust based on actual rate
    },
  });
  console.log(`✅ Worker criado: ${worker.name} (ID: ${worker.id}, OWNER_OPERATOR)`);

  // Create WorkerFinancialProfile
  await ensureFinancialProfile(worker);

  console.log('\n✅ Seed concluído!\n');
}

async function ensureFinancialProfile(worker) {
  const existing = await prisma.workerFinancialProfile.findUnique({
    where: { workerId: worker.id },
  });

  if (existing) {
    console.log(`⏭️  WorkerFinancialProfile já existe (ID: ${existing.id})`);
    return;
  }

  const profile = await prisma.workerFinancialProfile.create({
    data: {
      workerId: worker.id,
      paymentMethod: 'CHECK',
      notes: 'Owner — OWNER_OPERATOR. Compensation tracked via OwnerCompensation model.',
    },
  });
  console.log(`✅ WorkerFinancialProfile criado (ID: ${profile.id})`);
}

main()
  .catch((e) => {
    console.error('\n❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
