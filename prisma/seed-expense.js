/**
 * Seed de Categorias de Despesas
 * 
 * Popula categorias padrão para o módulo financeiro
 * Execução: node prisma/seed-expense.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de Categorias de Despesas...\n');

  // Buscar primeira empresa (usar a mesma do seed de receitas)
  const empresa = await prisma.empresa.findFirst({
    orderBy: { id: 'asc' }
  });

  if (!empresa) {
    console.error('❌ Nenhuma empresa encontrada. Execute o seed principal primeiro.');
    process.exit(1);
  }

  console.log(`✅ Empresa encontrada: ${empresa.nome} (ID: ${empresa.id})\n`);

  // Categorias de despesas padrão
  const categorias = [
    {
      nome: 'Salários e Encargos',
      descricao: 'Folha de pagamento, benefícios, encargos trabalhistas e provisões',
      cor: '#EF4444', // Red
      icone: 'users',
      orcamentoMensal: 50000.00
    },
    {
      nome: 'Aluguel e Condomínio',
      descricao: 'Aluguel de imóveis, taxas condominiais, IPTU e seguros',
      cor: '#F97316', // Orange
      icone: 'home',
      orcamentoMensal: 8000.00
    },
    {
      nome: 'Marketing e Publicidade',
      descricao: 'Campanhas, anúncios, redes sociais, material promocional',
      cor: '#EC4899', // Pink
      icone: 'megaphone',
      orcamentoMensal: 5000.00
    },
    {
      nome: 'Tecnologia e Software',
      descricao: 'Licenças, servidores, cloud, hardware, manutenção de TI',
      cor: '#8B5CF6', // Purple
      icone: 'laptop',
      orcamentoMensal: 3000.00
    },
    {
      nome: 'Impostos e Taxas',
      descricao: 'Tributos federais, estaduais, municipais e taxas governamentais',
      cor: '#DC2626', // Dark red
      icone: 'file-text',
      orcamentoMensal: 15000.00
    },
    {
      nome: 'Fornecedores e Compras',
      descricao: 'Compra de produtos, matéria-prima, insumos e materiais',
      cor: '#FB923C', // Light orange
      icone: 'package',
      orcamentoMensal: 20000.00
    },
    {
      nome: 'Despesas Administrativas',
      descricao: 'Material de escritório, limpeza, telefone, internet, correio',
      cor: '#64748B', // Slate
      icone: 'briefcase',
      orcamentoMensal: 2000.00
    },
    {
      nome: 'Viagens e Representação',
      descricao: 'Viagens corporativas, hospedagem, alimentação, transporte',
      cor: '#0EA5E9', // Sky blue
      icone: 'plane',
      orcamentoMensal: 3000.00
    },
    {
      nome: 'Manutenção e Reparos',
      descricao: 'Manutenção predial, equipamentos, veículos e instalações',
      cor: '#F59E0B', // Amber
      icone: 'wrench',
      orcamentoMensal: 2500.00
    },
    {
      nome: 'Diversas',
      descricao: 'Outras despesas operacionais não categorizadas',
      cor: '#6B7280', // Gray
      icone: 'more-horizontal',
      orcamentoMensal: 1000.00
    }
  ];

  console.log('📝 Criando categorias de despesas...\n');

  let criadas = 0;
  let existentes = 0;

  for (const cat of categorias) {
    try {
      // Verificar se já existe
      const existe = await prisma.expenseCategory.findUnique({
        where: {
          empresaId_nome: {
            empresaId: empresa.id,
            nome: cat.nome
          }
        }
      });

      if (existe) {
        console.log(`⏭️  Categoria "${cat.nome}" já existe (ID: ${existe.id})`);
        existentes++;
        continue;
      }

      // Criar nova categoria
      const categoria = await prisma.expenseCategory.create({
        data: {
          empresaId: empresa.id,
          nome: cat.nome,
          descricao: cat.descricao,
          cor: cat.cor,
          icone: cat.icone,
          orcamentoMensal: cat.orcamentoMensal,
          ativo: true
        }
      });

      console.log(`✅ Criada: ${categoria.nome} (ID: ${categoria.id}) - Orçamento: R$ ${categoria.orcamentoMensal}`);
      criadas++;

    } catch (error) {
      console.error(`❌ Erro ao criar categoria "${cat.nome}":`, error.message);
    }
  }

  console.log('\n📊 Resumo do Seed:');
  console.log(`   • Categorias criadas: ${criadas}`);
  console.log(`   • Categorias existentes: ${existentes}`);
  console.log(`   • Total: ${criadas + existentes}/${categorias.length}`);

  // Estatísticas finais
  const totalCategorias = await prisma.expenseCategory.count({
    where: { empresaId: empresa.id }
  });

  const orcamentoTotal = await prisma.expenseCategory.aggregate({
    where: { empresaId: empresa.id, ativo: true },
    _sum: { orcamentoMensal: true }
  });

  console.log('\n💰 Orçamento Total Mensal de Despesas:');
  console.log(`   R$ ${orcamentoTotal._sum.orcamentoMensal?.toFixed(2) || '0.00'}`);
  console.log(`\n✅ Seed de Categorias de Despesas concluído com sucesso!\n`);
}

main()
  .catch((e) => {
    console.error('\n❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
