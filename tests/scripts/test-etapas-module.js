/**
 * Script de Teste - Módulo de Etapas
 * 
 * Objetivos:
 * 1. Verificar se há projetos no banco
 * 2. Criar projeto de teste se necessário
 * 3. Adicionar etapas de exemplo
 * 4. Testar operações CRUD
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 TESTE - MÓDULO DE ETAPAS\n');

  // 1. Verificar projetos existentes
  console.log('📊 Verificando projetos...');
  const projetos = await prisma.projeto.findMany({
    take: 5,
    orderBy: { criadoEm: 'desc' },
    include: {
      Cliente: true,
      _count: {
        select: { Etapas: true }
      }
    }
  });

  console.log(`✅ Encontrados ${projetos.length} projetos\n`);

  if (projetos.length === 0) {
    console.log('⚠️  Nenhum projeto encontrado. Criando projeto de teste...\n');
    
    // Buscar um cliente para associar
    const cliente = await prisma.cliente.findFirst();
    
    if (!cliente) {
      console.error('❌ Nenhum cliente encontrado. Por favor, crie um cliente primeiro.');
      return;
    }

    // Criar projeto de teste
    const novoProjeto = await prisma.projeto.create({
      data: {
        numeroProjeto: `PROJ-TEST-${Date.now()}`,
        titulo: 'Construção de Residência Moderna',
        descricao: 'Projeto residencial de alto padrão com 3 suítes, área gourmet e piscina.',
        clienteId: cliente.id,
        status: 'planejado',
        prioridade: 'alta',
        dataInicioPrevista: new Date('2025-01-15'),
        dataConclusaoPrevista: new Date('2025-07-15'),
        localidade: 'São Paulo, SP',
        endereco: 'Rua das Flores, 123 - Jardim Europa',
        custoPrevisto: 850000.00,
        custoReal: 0,
        criadoPor: 1, // Assumindo usuário admin
      }
    });

    console.log(`✅ Projeto criado: ${novoProjeto.titulo} (ID: ${novoProjeto.id})\n`);
    projetos.push(novoProjeto);
  }

  // 2. Selecionar primeiro projeto para teste
  const projetoTeste = projetos[0];
  console.log(`🎯 Projeto selecionado para teste:`);
  console.log(`   ID: ${projetoTeste.id}`);
  console.log(`   Título: ${projetoTeste.titulo}`);
  console.log(`   Status: ${projetoTeste.status}`);
  console.log(`   Etapas existentes: ${projetoTeste._count?.Etapas || 0}\n`);

  // 3. Verificar etapas existentes
  const etapasExistentes = await prisma.projetoEtapa.findMany({
    where: { projetoId: projetoTeste.id },
    orderBy: { ordem: 'asc' }
  });

  console.log(`📋 Etapas do projeto:\n`);
  
  if (etapasExistentes.length === 0) {
    console.log('⚠️  Nenhuma etapa encontrada. Criando etapas de exemplo...\n');

    // Criar etapas de exemplo
    const etapasExemplo = [
      {
        servico: 'Fundações',
        descricao: 'Preparação do terreno e construção das fundações estruturais',
        ordem: 1,
        status: 'concluida',
        inicioPrevisto: new Date('2025-01-15'),
        fimPrevisto: new Date('2025-02-15'),
        inicioReal: new Date('2025-01-15'),
        fimReal: new Date('2025-02-10'),
        porcentagem: 100,
      },
      {
        servico: 'Estrutura',
        descricao: 'Construção da estrutura de concreto - pilares, vigas e lajes',
        ordem: 2,
        status: 'em_andamento',
        inicioPrevisto: new Date('2025-02-16'),
        fimPrevisto: new Date('2025-04-15'),
        inicioReal: new Date('2025-02-11'),
        porcentagem: 65,
      },
      {
        servico: 'Alvenaria',
        descricao: 'Levantamento de paredes e divisórias',
        ordem: 3,
        status: 'pendente',
        inicioPrevisto: new Date('2025-04-16'),
        fimPrevisto: new Date('2025-05-15'),
        porcentagem: 0,
      },
      {
        servico: 'Instalações',
        descricao: 'Instalações elétricas, hidráulicas e de gás',
        ordem: 4,
        status: 'pendente',
        inicioPrevisto: new Date('2025-05-16'),
        fimPrevisto: new Date('2025-06-15'),
        porcentagem: 0,
      },
      {
        servico: 'Acabamento',
        descricao: 'Revestimentos, pintura, esquadrias e acabamentos finais',
        ordem: 5,
        status: 'pendente',
        inicioPrevisto: new Date('2025-06-16'),
        fimPrevisto: new Date('2025-07-15'),
        porcentagem: 0,
      },
    ];

    for (const etapa of etapasExemplo) {
      const criada = await prisma.projetoEtapa.create({
        data: {
          ...etapa,
          projetoId: projetoTeste.id,
        }
      });
      console.log(`   ✅ Etapa ${criada.ordem}: ${criada.servico} (${criada.status})`);
    }

    console.log('\n');
  } else {
    etapasExistentes.forEach(etapa => {
      const statusIcon = 
        etapa.status === 'concluida' ? '✅' :
        etapa.status === 'em_andamento' ? '🔵' :
        etapa.status === 'bloqueada' ? '🔴' :
        '⚪';
      
      console.log(`   ${statusIcon} Etapa ${etapa.ordem}: ${etapa.servico}`);
      console.log(`      Status: ${etapa.status} | Progresso: ${etapa.porcentagem}%`);
    });
    console.log('\n');
  }

  // 4. Resumo para testes manuais
  console.log('📝 RESUMO PARA TESTES MANUAIS:\n');
  console.log(`🔗 URL de teste: http://localhost:3000/projetos/${projetoTeste.id}`);
  console.log('\n✅ CHECKLIST DE TESTES:');
  console.log('   [ ] 1. Abrir a URL acima no navegador');
  console.log('   [ ] 2. Verificar que a página carrega corretamente');
  console.log('   [ ] 3. Clicar na tab "Etapas"');
  console.log('   [ ] 4. Verificar que as etapas aparecem ordenadas');
  console.log('   [ ] 5. Testar drag & drop (arrastar cards)');
  console.log('   [ ] 6. Clicar em "Nova Etapa"');
  console.log('   [ ] 7. Preencher formulário e salvar');
  console.log('   [ ] 8. Verificar toast de sucesso');
  console.log('   [ ] 9. Editar uma etapa existente');
  console.log('   [ ] 10. Deletar uma etapa (confirmar modal)');
  console.log('   [ ] 11. Verificar validações do formulário');
  console.log('   [ ] 12. Testar em diferentes resoluções\n');

  console.log('🎯 FUNCIONALIDADES A TESTAR:\n');
  console.log('   ✓ CRUD completo (Create, Read, Update, Delete)');
  console.log('   ✓ Drag & drop para reordenar');
  console.log('   ✓ Progress bars visuais');
  console.log('   ✓ Status badges coloridos');
  console.log('   ✓ Validação de formulário');
  console.log('   ✓ Toast notifications');
  console.log('   ✓ Loading states');
  console.log('   ✓ Empty states');
  console.log('   ✓ Modal de confirmação');
  console.log('   ✓ Navegação por tabs\n');

  console.log('✨ Servidor já está rodando em: http://localhost:3000\n');
  console.log('🚀 Pronto para testar!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
