// Seed data para Revenue Categories
// Executar: node prisma/seed-revenue.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Revenue data...');

  // 1. Criar empresa padrão (se não existir)
  let empresa = await prisma.empresa.findFirst();
  
  if (!empresa) {
    empresa = await prisma.empresa.create({
      data: {
        nome: 'GladPros Inc',
        razaoSocial: 'GladPros Technology Solutions Inc',
        cnpj: '00.000.000/0001-00',
        email: 'contato@gladpros.com',
        telefone: '+1 (555) 123-4567',
        endereco: {
          rua: '123 Main Street',
          numero: '100',
          complemento: 'Suite 200',
          bairro: 'Downtown',
          cidade: 'Austin',
          estado: 'TX',
          cep: '73301'
        },
        ativo: true,
        atualizadoEm: new Date()
      }
    });
    console.log('✅ Empresa criada:', empresa.nome);
  } else {
    console.log('ℹ️  Empresa já existe:', empresa.nome);
  }

  // 2. Criar categorias de receitas
  const categories = [
    {
      nome: 'Serviços de Consultoria',
      descricao: 'Receitas provenientes de consultoria técnica e estratégica',
      cor: '#3B82F6',
      icone: 'briefcase'
    },
    {
      nome: 'Desenvolvimento de Software',
      descricao: 'Receitas de projetos de desenvolvimento customizado',
      cor: '#10B981',
      icone: 'code'
    },
    {
      nome: 'Manutenção e Suporte',
      descricao: 'Receitas de contratos de manutenção e suporte técnico',
      cor: '#F59E0B',
      icone: 'wrench'
    },
    {
      nome: 'Mensalidades SaaS',
      descricao: 'Receitas recorrentes de assinaturas de software',
      cor: '#8B5CF6',
      icone: 'refresh'
    },
    {
      nome: 'Treinamentos',
      descricao: 'Receitas de cursos e treinamentos técnicos',
      cor: '#EC4899',
      icone: 'academic-cap'
    },
    {
      nome: 'Licenças de Software',
      descricao: 'Venda de licenças de software',
      cor: '#06B6D4',
      icone: 'key'
    },
    {
      nome: 'Comissões',
      descricao: 'Comissões de vendas e parcerias',
      cor: '#84CC16',
      icone: 'currency-dollar'
    },
    {
      nome: 'Outros',
      descricao: 'Outras receitas não categorizadas',
      cor: '#6B7280',
      icone: 'dots-horizontal'
    }
  ];

  for (const cat of categories) {
    const existing = await prisma.revenueCategory.findUnique({
      where: {
        empresaId_nome: {
          empresaId: empresa.id,
          nome: cat.nome
        }
      }
    });

    if (!existing) {
      await prisma.revenueCategory.create({
        data: {
          empresaId: empresa.id,
          ...cat
        }
      });
      console.log(`✅ Categoria criada: ${cat.nome}`);
    } else {
      console.log(`ℹ️  Categoria já existe: ${cat.nome}`);
    }
  }

  console.log('✅ Seed Revenue concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
