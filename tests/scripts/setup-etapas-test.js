/**
 * Script para criar etapas de exemplo no projeto existente
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Criando etapas de exemplo...\n');

  const projetoId = 1;

  // Limpar etapas antigas
  await prisma.projetoEtapa.deleteMany({
    where: { projetoId }
  });
  console.log('✅ Etapas antigas removidas\n');

  // Criar etapas de exemplo (usando nomes de campos do Prisma)
  const etapas = [
    {
      servico: 'Planejamento e Análise',
      descricao: 'Levantamento de requisitos, análise de viabilidade e planejamento detalhado do projeto',
      ordem: 1,
      status: 'concluida',
      inicioPrevisto: new Date('2025-01-01'),
      fimPrevisto: new Date('2025-01-31'),
      inicioReal: new Date('2025-01-01'),
      fimReal: new Date('2025-01-28'),
      porcentagem: 100,
    },
    {
      servico: 'Infraestrutura de Rede',
      descricao: 'Instalação de servidores, switches e configuração da rede principal',
      ordem: 2,
      status: 'em_andamento',
      inicioPrevisto: new Date('2025-02-01'),
      fimPrevisto: new Date('2025-03-15'),
      inicioReal: new Date('2025-02-01'),
      porcentagem: 70,
    },
    {
      servico: 'Segurança e Firewall',
      descricao: 'Implementação de firewalls, sistemas de segurança e políticas de acesso',
      ordem: 3,
      status: 'pendente',
      inicioPrevisto: new Date('2025-03-16'),
      fimPrevisto: new Date('2025-04-15'),
      porcentagem: 0,
    },
    {
      servico: 'Integração de Sistemas',
      descricao: 'Integração com sistemas legados e novos módulos de software',
      ordem: 4,
      status: 'pendente',
      inicioPrevisto: new Date('2025-04-16'),
      fimPrevisto: new Date('2025-05-31'),
      porcentagem: 0,
    },
    {
      servico: 'Testes e Homologação',
      descricao: 'Testes de integração, performance e homologação com usuários',
      ordem: 5,
      status: 'pendente',
      inicioPrevisto: new Date('2025-06-01'),
      fimPrevisto: new Date('2025-06-30'),
      porcentagem: 0,
    },
  ];

  console.log('📋 Criando etapas:\n');
  
  for (const etapaData of etapas) {
    const etapa = await prisma.projetoEtapa.create({
      data: {
        ...etapaData,
        projetoId,
      }
    });

    const statusIcon = 
      etapa.status === 'concluida' ? '✅' :
      etapa.status === 'em_andamento' ? '🔵' :
      '⚪';

    console.log(`   ${statusIcon} Etapa ${etapa.ordem}: ${etapa.servico}`);
    console.log(`      Status: ${etapa.status} | Progresso: ${etapa.porcentagem}%`);
  }

  console.log('\n✅ Etapas criadas com sucesso!\n');
  console.log('🔗 URL de teste: http://localhost:3000/projetos/1\n');
  console.log('🎯 Agora você pode testar o módulo de Etapas!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
