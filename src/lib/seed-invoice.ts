import { prisma } from '@/lib/prisma';

async function seedInvoiceSystem() {
  console.log('🌱 Seeding Invoice System...');

  // Seed TaxRate: Texas Sales Tax 8.25%
  const texasTaxRate = await prisma.taxRate.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Texas Sales Tax',
      jurisdictionType: 'STATE',
      rate: 0.0825, // 8.25%
    },
  });

  console.log('✅ TaxRate criada:', texasTaxRate.name, '-', Number(texasTaxRate.rate) * 100 + '%');

  // Opcional: Adicionar outras tax rates para cidades do Texas
  const austinTaxRate = await prisma.taxRate.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Austin Sales Tax',
      jurisdictionType: 'CITY',
      rate: 0.02, // 2% local rate
    },
  });

  console.log('✅ TaxRate criada:', austinTaxRate.name, '-', Number(austinTaxRate.rate) * 100 + '%');

  const houstonTaxRate = await prisma.taxRate.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Houston Sales Tax',
      jurisdictionType: 'CITY',
      rate: 0.02, // 2% local rate
    },
  });

  console.log('✅ TaxRate criada:', houstonTaxRate.name, '-', Number(houstonTaxRate.rate) * 100 + '%');

  console.log('✅ Invoice System seed completo!');
}

seedInvoiceSystem()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
