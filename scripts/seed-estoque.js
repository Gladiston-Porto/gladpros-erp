/**
 * SCRIPT: Seed Data do Módulo Estoque
 * 
 * Popula dados iniciais nas tabelas base
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do módulo Estoque...\n');

  // ============================================================================
  // UNIDADES
  // ============================================================================
  
  console.log('📦 Criando Unidades...');
  
  const unidades = [
    { codigo: 'UN', nome: 'Unidade' },
    { codigo: 'M', nome: 'Metro' },
    { codigo: 'M2', nome: 'Metro Quadrado' },
    { codigo: 'M3', nome: 'Metro Cúbico' },
    { codigo: 'KG', nome: 'Quilograma' },
    { codigo: 'G', nome: 'Grama' },
    { codigo: 'L', nome: 'Litro' },
    { codigo: 'ML', nome: 'Mililitro' },
    { codigo: 'CX', nome: 'Caixa' },
    { codigo: 'PCT', nome: 'Pacote' },
    { codigo: 'ROLO', nome: 'Rolo' },
    { codigo: 'BARRA', nome: 'Barra' },
    { codigo: 'PC', nome: 'Peça' },
    { codigo: 'JG', nome: 'Jogo' },
    { codigo: 'PAR', nome: 'Par' }
  ];

  for (const un of unidades) {
    await prisma.unidade.upsert({
      where: { codigo: un.codigo },
      update: {},
      create: un
    });
  }
  
  console.log(`✅ ${unidades.length} unidades criadas\n`);

  // ============================================================================
  // CATEGORIAS
  // ============================================================================
  
  console.log('📁 Criando Categorias...');
  
  const categoriasMateriais = [
    { nome: 'Elétrico', tipo: 'MATERIAL', descricao: 'Materiais elétricos em geral' },
    { nome: 'Cabos e Fios', tipo: 'MATERIAL', descricao: 'Cabos e fios elétricos' },
    { nome: 'Condutos', tipo: 'MATERIAL', descricao: 'Eletrodutos e conduítes' },
    { nome: 'Conectores', tipo: 'MATERIAL', descricao: 'Conectores e terminais' },
    { nome: 'Quadros e Disjuntores', tipo: 'MATERIAL', descricao: 'Quadros de distribuição e proteção' },
    { nome: 'Iluminação', tipo: 'MATERIAL', descricao: 'Luminárias e lâmpadas' },
    { nome: 'Interruptores e Tomadas', tipo: 'MATERIAL', descricao: 'Dispositivos de comando' },
    { nome: 'Fixação', tipo: 'MATERIAL', descricao: 'Parafusos, buchas, abraçadeiras' },
    { nome: 'Hidráulico', tipo: 'MATERIAL', descricao: 'Materiais hidráulicos' },
    { nome: 'Telefonia', tipo: 'MATERIAL', descricao: 'Cabos e acessórios de telefonia' },
    { nome: 'Rede', tipo: 'MATERIAL', descricao: 'Cabos e acessórios de rede' },
    { nome: 'CFTV', tipo: 'MATERIAL', descricao: 'Câmeras e acessórios' },
    { nome: 'Automação', tipo: 'MATERIAL', descricao: 'Sensores e atuadores' },
    { nome: 'Diversos', tipo: 'MATERIAL', descricao: 'Outros materiais' }
  ];

  const categoriasEquipamentos = [
    { nome: 'Ferramentas de Medição', tipo: 'EQUIPAMENTO', descricao: 'Multímetros, alicates, etc' },
    { nome: 'Ferramentas de Perfuração', tipo: 'EQUIPAMENTO', descricao: 'Furadeiras e brocas' },
    { nome: 'Ferramentas de Corte', tipo: 'EQUIPAMENTO', descricao: 'Serras e alicates de corte' },
    { nome: 'Ferramentas de Fixação', tipo: 'EQUIPAMENTO', descricao: 'Parafusadeiras' },
    { nome: 'Ferramentas de Rede', tipo: 'EQUIPAMENTO', descricao: 'Alicates de crimpar, testadores' },
    { nome: 'Equipamentos de Segurança', tipo: 'EQUIPAMENTO', descricao: 'EPIs' },
    { nome: 'Equipamentos de Teste', tipo: 'EQUIPAMENTO', descricao: 'Testadores de continuidade' },
    { nome: 'Escadas e Andaimes', tipo: 'EQUIPAMENTO', descricao: 'Equipamentos de acesso' },
    { nome: 'Veículos', tipo: 'EQUIPAMENTO', descricao: 'Carros, vans, caminhões' },
    { nome: 'Equipamentos Diversos', tipo: 'EQUIPAMENTO', descricao: 'Outros equipamentos' }
  ];

  for (const cat of [...categoriasMateriais, ...categoriasEquipamentos]) {
    await prisma.categoria.upsert({
      where: { id: 0 }, // Força create
      update: {},
      create: cat
    }).catch(() => {}); // Ignora erro de duplicate
  }
  
  const totalCat = await prisma.categoria.count();
  console.log(`✅ ${totalCat} categorias criadas\n`);

  // ============================================================================
  // LOCALIZAÇÕES
  // ============================================================================
  
  console.log('📍 Criando Localizações...');
  
  const localizacoes = [
    { codigo: 'DEP-01', nome: 'Depósito Principal', tipo: 'DEPOSITO', descricao: 'Depósito central' },
    { codigo: 'A1', nome: 'Corredor A - Prateleira 1', tipo: 'PRATELEIRA', descricao: 'Cabos e fios' },
    { codigo: 'A2', nome: 'Corredor A - Prateleira 2', tipo: 'PRATELEIRA', descricao: 'Condutos' },
    { codigo: 'A3', nome: 'Corredor A - Prateleira 3', tipo: 'PRATELEIRA', descricao: 'Conectores' },
    { codigo: 'B1', nome: 'Corredor B - Prateleira 1', tipo: 'PRATELEIRA', descricao: 'Quadros' },
    { codigo: 'B2', nome: 'Corredor B - Prateleira 2', tipo: 'PRATELEIRA', descricao: 'Iluminação' },
    { codigo: 'B3', nome: 'Corredor B - Prateleira 3', tipo: 'PRATELEIRA', descricao: 'Interruptores' },
    { codigo: 'C1', nome: 'Corredor C - Prateleira 1', tipo: 'PRATELEIRA', descricao: 'Fixação' },
    { codigo: 'C2', nome: 'Corredor C - Prateleira 2', tipo: 'PRATELEIRA', descricao: 'Diversos' },
    { codigo: 'ARM-01', nome: 'Armário Ferramentas', tipo: 'ARMARIO', descricao: 'Ferramentas manuais' },
    { codigo: 'ARM-02', nome: 'Armário Equipamentos', tipo: 'ARMARIO', descricao: 'Equipamentos elétricos' },
    { codigo: 'VAN-01', nome: 'Van 1 - Estoque Móvel', tipo: 'DEPOSITO', descricao: 'Van de trabalho' },
    { codigo: 'VAN-02', nome: 'Van 2 - Estoque Móvel', tipo: 'DEPOSITO', descricao: 'Van de trabalho' }
  ];

  for (const loc of localizacoes) {
    await prisma.localizacao.upsert({
      where: { codigo: loc.codigo },
      update: {},
      create: loc
    });
  }
  
  console.log(`✅ ${localizacoes.length} localizações criadas\n`);

  // ============================================================================
  // FORNECEDORES
  // ============================================================================
  
  console.log('🏪 Criando Fornecedores...');
  
  const fornecedores = [
    {
      nome: 'Materiais Elétricos ABC',
      tipoDocumento: 'CNPJ',
      documento: '12.345.678/0001-90',
      telefone: '(11) 98765-4321',
      email: 'vendas@abc.com.br',
      endereco: 'Rua das Flores, 123 - Contato: João Silva',
      cidade: 'São Paulo',
      estado: 'SP'
    },
    {
      nome: 'Distribuidora Eletro Sul',
      tipoDocumento: 'CNPJ',
      documento: '98.765.432/0001-10',
      telefone: '(11) 91234-5678',
      email: 'contato@eletrosul.com.br',
      endereco: 'Av. Paulista, 1000 - Contato: Maria Santos',
      cidade: 'São Paulo',
      estado: 'SP'
    },
    {
      nome: 'Ferramentas Pro',
      tipoDocumento: 'CNPJ',
      documento: '11.222.333/0001-44',
      telefone: '(11) 97777-8888',
      email: 'vendas@ferramentaspro.com.br',
      endereco: 'Rua dos Operários, 500 - Contato: Pedro Oliveira',
      cidade: 'São Paulo',
      estado: 'SP'
    }
  ];

  for (const forn of fornecedores) {
    await prisma.fornecedor.create({
      data: forn
    }).catch(() => {}); // Ignora se já existe
  }
  
  const totalForn = await prisma.fornecedor.count();
  console.log(`✅ ${totalForn} fornecedores criados\n`);

  // ============================================================================
  // RESUMO
  // ============================================================================
  
  console.log('========================================');
  console.log('✅ SEED COMPLETO!');
  console.log('========================================\n');
  
  const stats = {
    unidades: await prisma.unidade.count(),
    categorias: await prisma.categoria.count(),
    localizacoes: await prisma.localizacao.count(),
    fornecedores: await prisma.fornecedor.count()
  };
  
  console.log('📊 Estatísticas:');
  console.log(`   Unidades: ${stats.unidades}`);
  console.log(`   Categorias: ${stats.categorias}`);
  console.log(`   Localizações: ${stats.localizacoes}`);
  console.log(`   Fornecedores: ${stats.fornecedores}`);
  console.log(`   TOTAL: ${Object.values(stats).reduce((a,b) => a+b, 0)} registros\n`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🎉 Pronto para uso!\n');
  })
  .catch(async (e) => {
    console.error('❌ Erro no seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
