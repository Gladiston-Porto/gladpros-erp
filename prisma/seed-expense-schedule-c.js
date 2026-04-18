/**
 * Seed: Expense Categories — IRS Schedule C Aligned
 *
 * Updates existing categories and creates new ones mapped to Schedule C lines.
 * Safe to run multiple times (upsert by slug).
 *
 * Execution: node prisma/seed-expense-schedule-c.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed: Expense Categories → IRS Schedule C\n');

  const empresa = await prisma.empresa.findFirst({ orderBy: { id: 'asc' } });
  if (!empresa) {
    console.log('⚠️  Nenhuma empresa encontrada. Criando GladPros LLC...');
    const newEmpresa = await prisma.empresa.create({
      data: {
        nome: 'GladPros LLC',
        razaoSocial: 'GladPros LLC',
        email: 'admin@gladpros.com',
        ativo: true,
        addressCity: 'Dallas',
        addressState: 'TX',
        addressZip: '75001',
        tipoTributacao: 'LLC_DEFAULT',
        tipoTributacaoDesde: new Date('2024-01-01'),
      },
    });
    console.log(`✅ Empresa criada: ${newEmpresa.nome} (ID: ${newEmpresa.id})\n`);
    var empresaId = newEmpresa.id;
    var empresaNome = newEmpresa.nome;
  } else {
    console.log(`✅ Empresa: ${empresa.nome} (ID: ${empresa.id})\n`);
    var empresaId = empresa.id;
    var empresaNome = empresa.nome;
  }

  // Schedule C-aligned categories for construction/services
  const categories = [
    { nome: 'Advertising',                    slug: 'advertising',        scheduleCLine: 'Line 8',   cor: '#EC4899', icone: 'megaphone',    dedutivel: true },
    { nome: 'Car & Truck Expenses',           slug: 'car-truck',          scheduleCLine: 'Line 9',   cor: '#6366F1', icone: 'truck',         dedutivel: true },
    { nome: 'Commissions & Fees',             slug: 'commissions-fees',   scheduleCLine: 'Line 10',  cor: '#8B5CF6', icone: 'percent',       dedutivel: true },
    { nome: 'Contract Labor',                 slug: 'contract-labor',     scheduleCLine: 'Line 11',  cor: '#F97316', icone: 'hard-hat',      dedutivel: true },
    { nome: 'Depreciation',                   slug: 'depreciation',       scheduleCLine: 'Line 13',  cor: '#78716C', icone: 'trending-down', dedutivel: true },
    { nome: 'Employee Benefits',              slug: 'employee-benefits',  scheduleCLine: 'Line 14',  cor: '#14B8A6', icone: 'heart',         dedutivel: true },
    { nome: 'Insurance',                      slug: 'insurance',          scheduleCLine: 'Line 15',  cor: '#3B82F6', icone: 'shield',        dedutivel: true },
    { nome: 'Interest (Mortgage)',             slug: 'interest-mortgage',  scheduleCLine: 'Line 16a', cor: '#DC2626', icone: 'landmark',      dedutivel: true },
    { nome: 'Interest (Other)',                slug: 'interest-other',     scheduleCLine: 'Line 16b', cor: '#EF4444', icone: 'credit-card',   dedutivel: true },
    { nome: 'Legal & Professional Services',  slug: 'legal-professional', scheduleCLine: 'Line 17',  cor: '#0EA5E9', icone: 'scale',         dedutivel: true },
    { nome: 'Office Expense',                 slug: 'office-expense',     scheduleCLine: 'Line 18',  cor: '#64748B', icone: 'briefcase',     dedutivel: true },
    { nome: 'Pension & Profit-Sharing Plans', slug: 'pension-plans',      scheduleCLine: 'Line 19',  cor: '#059669', icone: 'piggy-bank',    dedutivel: true },
    { nome: 'Rent (Equipment)',                slug: 'rent-equipment',     scheduleCLine: 'Line 20a', cor: '#F59E0B', icone: 'wrench',        dedutivel: true },
    { nome: 'Rent (Business Property)',        slug: 'rent-property',      scheduleCLine: 'Line 20b', cor: '#D97706', icone: 'home',          dedutivel: true },
    { nome: 'Repairs & Maintenance',          slug: 'repairs-maintenance', scheduleCLine: 'Line 21', cor: '#EA580C', icone: 'settings',      dedutivel: true },
    { nome: 'Supplies',                       slug: 'supplies',           scheduleCLine: 'Line 22',  cor: '#FB923C', icone: 'package',       dedutivel: true },
    { nome: 'Taxes & Licenses',               slug: 'taxes-licenses',     scheduleCLine: 'Line 23',  cor: '#DC2626', icone: 'file-text',     dedutivel: true },
    { nome: 'Travel',                         slug: 'travel',             scheduleCLine: 'Line 24a', cor: '#0EA5E9', icone: 'plane',         dedutivel: true },
    { nome: 'Meals (50% Deductible)',          slug: 'meals',              scheduleCLine: 'Line 24b', cor: '#10B981', icone: 'utensils',      dedutivel: true },
    { nome: 'Utilities',                      slug: 'utilities',          scheduleCLine: 'Line 25',  cor: '#FBBF24', icone: 'zap',           dedutivel: true },
    { nome: 'Wages',                          slug: 'wages',              scheduleCLine: 'Line 26',  cor: '#EF4444', icone: 'users',         dedutivel: true },
    { nome: 'Other Expenses',                 slug: 'other-expenses',     scheduleCLine: 'Line 27a', cor: '#6B7280', icone: 'more-horizontal', dedutivel: true },
    { nome: 'Materials (COGS)',               slug: 'materials-cogs',     scheduleCLine: 'COGS',     cor: '#A855F7', icone: 'layers',        dedutivel: true },
    { nome: 'Owner Draw',                     slug: 'owner-draw',         scheduleCLine: null,        cor: '#1E40AF', icone: 'wallet',        dedutivel: false },
    { nome: 'Personal / Non-Deductible',      slug: 'non-deductible',     scheduleCLine: null,        cor: '#9CA3AF', icone: 'x-circle',      dedutivel: false },
  ];

  // Mapping from old Portuguese names to new Schedule C slugs (for updating existing records)
  const oldToNew = {
    'Salários e Encargos':       'wages',
    'Aluguel e Condomínio':      'rent-property',
    'Marketing e Publicidade':   'advertising',
    'Tecnologia e Software':     'other-expenses',
    'Impostos e Taxas':          'taxes-licenses',
    'Fornecedores e Compras':    'materials-cogs',
    'Despesas Administrativas':  'office-expense',
    'Viagens e Representação':   'travel',
    'Manutenção e Reparos':      'repairs-maintenance',
    'Diversas':                  'other-expenses',
  };

  // Step 1: Update existing categories with slug + scheduleCLine
  console.log('📝 Step 1: Updating existing categories with Schedule C mapping...\n');
  const existing = await prisma.expenseCategory.findMany({
    where: { empresaId: empresaId },
  });

  let updated = 0;
  for (const cat of existing) {
    const newSlug = oldToNew[cat.nome];
    if (newSlug) {
      const target = categories.find(c => c.slug === newSlug);
      if (!target) continue;

      // Skip if slug is already taken by another record
      const slugTaken = await prisma.expenseCategory.findUnique({ where: { slug: newSlug } });
      if (slugTaken && slugTaken.id !== cat.id) {
        console.log(`⏭️  "${cat.nome}" → slug "${newSlug}" já atribuído a outro registro`);
        continue;
      }

      await prisma.expenseCategory.update({
        where: { id: cat.id },
        data: {
          nome: target.nome,
          slug: target.slug,
          scheduleCLine: target.scheduleCLine,
          cor: target.cor,
          icone: target.icone,
          dedutivel: target.dedutivel,
        },
      });
      console.log(`✅ Updated: "${cat.nome}" → "${target.nome}" (${target.scheduleCLine})`);
      updated++;
    }
  }

  // Step 2: Create missing categories
  console.log('\n📝 Step 2: Creating missing Schedule C categories...\n');
  let created = 0;
  for (const cat of categories) {
    const exists = await prisma.expenseCategory.findUnique({ where: { slug: cat.slug } });
    if (exists) {
      continue; // Already exists (was updated or was created before)
    }

    // Also check by name in case slug wasn't set
    const byName = await prisma.expenseCategory.findUnique({
      where: { empresaId_nome: { empresaId: empresaId, nome: cat.nome } },
    });
    if (byName) {
      await prisma.expenseCategory.update({
        where: { id: byName.id },
        data: { slug: cat.slug, scheduleCLine: cat.scheduleCLine, dedutivel: cat.dedutivel },
      });
      console.log(`🔄 Linked: "${cat.nome}" → slug "${cat.slug}"`);
      continue;
    }

    await prisma.expenseCategory.create({
      data: {
        empresaId: empresaId,
        nome: cat.nome,
        slug: cat.slug,
        scheduleCLine: cat.scheduleCLine,
        cor: cat.cor,
        icone: cat.icone,
        dedutivel: cat.dedutivel,
        ativo: true,
      },
    });
    console.log(`✅ Created: ${cat.nome} → ${cat.scheduleCLine || 'N/A'} (${cat.slug})`);
    created++;
  }

  // Summary
  const total = await prisma.expenseCategory.count({ where: { empresaId: empresaId } });
  const withScheduleC = await prisma.expenseCategory.count({
    where: { empresaId: empresaId, scheduleCLine: { not: null } },
  });

  console.log('\n📊 Summary:');
  console.log(`   • Updated: ${updated}`);
  console.log(`   • Created: ${created}`);
  console.log(`   • Total categories: ${total}`);
  console.log(`   • With Schedule C mapping: ${withScheduleC}`);
  console.log('\n✅ Schedule C category seed completed!\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
