#!/usr/bin/env node
/*
 * Seed auxiliar para popular dados mínimos do módulo Projetos.
 *
 * Seguro para rodar múltiplas vezes: verifica existência prévia pelo número do projeto.
 */

const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function ensureCliente() {
  const existente = await prisma.cliente.findFirst({ orderBy: { id: "asc" } })
  if (existente) return existente

  const agora = new Date()
  return prisma.cliente.create({
    data: {
      tipo: "PJ",
      nomeFantasia: "Cliente Piloto",
      razaoSocial: "Cliente Piloto Ltda",
      nomeChave: "cliente-piloto",
      email: "cliente.piloto@gladpros.local",
      telefone: "+55 (11) 90000-0000",
      atualizadoEm: agora,
      endereco: {
        rua: "Rua Exemplo",
        numero: "123",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01000-000",
      },
    },
  })
}

async function ensureUsuario() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@gladpros.local"
  const admin = await prisma.usuario.findFirst({ where: { email } })
  if (admin) return admin

  // fallback: pega qualquer usuário existente
  const existente = await prisma.usuario.findFirst({ orderBy: { id: "asc" } })
  if (!existente) {
    throw new Error(
      "Nenhum usuário encontrado. Rode primeiro `npm run prisma:seed` ou `node prisma/seed.ts`."
    )
  }
  return existente
}

async function ensureProposta(clienteId) {
  const proposta = await prisma.proposta.findFirst({
    where: { clienteId },
    orderBy: { id: "asc" },
  })
  if (proposta) return proposta

  const numero = "PROP-2025-PILOTO"
  return prisma.proposta.create({
    data: {
      numeroProposta: numero,
      clienteId,
      tipoServico: "Projeto Piloto",
      permite: "SIM",
      contatoEmail: "cliente.piloto@gladpros.local",
      contatoNome: "Cliente Piloto",
      condicoesPagamento: "Pagamento em 3 parcelas.",
      descricaoEscopo: "Escopo base para projeto piloto.",
      status: "APROVADA",
      atualizadoEm: new Date(),
    },
  })
}

async function main() {
  const numeroProjeto = process.env.SEED_PROJECT_NUMBER ?? "PRJ-2025-0001"

  const existente = await prisma.$queryRaw`SELECT id FROM projetos WHERE numero_projeto = ${numeroProjeto} LIMIT 1`
  if (existente.length > 0) {
    console.log(`Projeto ${numeroProjeto} já existe (id=${existente[0].id}). Nenhuma ação realizada.`)
    return
  }

  const usuario = await ensureUsuario()
  const cliente = await ensureCliente()
  const proposta = await ensureProposta(cliente.id)

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO projetos (
        proposta_id, cliente_id, numero_projeto, titulo, descricao, status,
        data_inicio_prevista, localidade, endereco, prioridade,
        valor_estimado, custo_previsto, margem_prevista, lucro_previsto,
        responsavel_id, criado_por, atualizado_por, criado_em
      ) VALUES (
        ${proposta?.id ?? null}, ${cliente.id}, ${numeroProjeto},
        'Implantação Piloto de Infraestrutura',
        'Projeto inicial para validar o módulo Projetos. Inclui etapa de planejamento e execução piloto.',
        'planejado',
        '2025-10-10',
        'São Paulo - SP',
        'Rua Exemplo, 123 - Centro',
        'media',
        150000.00,
        90000.00,
        40.00,
        60000.00,
        ${usuario.id},
        ${usuario.id},
        ${usuario.id},
        NOW()
      );
    `

    const inserted = await tx.$queryRaw`SELECT LAST_INSERT_ID() as id`
    const projetoId = inserted[0].id

    await tx.$executeRaw`
      INSERT INTO projetos_etapas (
        projeto_id, servico, descricao, status, ordem, inicio_previsto, fim_previsto, responsavel_id, porcentagem
      ) VALUES
        (${projetoId}, 'Planejamento Executivo', 'Kickoff, levantamento técnico e plano executivo.', 'pendente', 1, '2025-10-15', '2025-10-30', ${usuario.id}, 25.00),
        (${projetoId}, 'Execução Piloto', 'Implantação da infraestrutura em ambiente controlado.', 'pendente', 2, '2025-11-01', '2025-11-20', ${usuario.id}, 0.00);
    `

    await tx.$executeRaw`
      INSERT INTO projetos_materiais (
        projeto_id, codigo, nome, unidade, quantidade_planejada, status, repassar_custo_cliente
      ) VALUES
        (${projetoId}, 'CABO-12-2', 'Cabo elétrico 12/2', 'rolo', 3.000, 'planejado', 1),
        (${projetoId}, 'QDG-PAINEL', 'Painel elétrico QDG', 'un', 1.000, 'planejado', 0);
    `

    await tx.$executeRaw`
      INSERT INTO projetos_anexos (
        projeto_id, arquivo_url, rotulo, publico_cliente, criado_por
      ) VALUES
        (${projetoId}, 'https://storage.gladpros.local/projetos/piloto/escopo.pdf', 'Escopo Executivo', 1, ${usuario.id});
    `

    await tx.$executeRaw`
      INSERT INTO projetos_historico (
        projeto_id, usuario_id, acao, detalhes
      ) VALUES
        (${projetoId}, ${usuario.id}, 'PROJETO_CRIADO', JSON_OBJECT('origem', 'seed'));
    `

    await tx.$executeRaw`
      INSERT INTO projetos_tarefas (
        projeto_id, titulo, descricao, status, prioridade, criado_por, atribuida_para, prazo
      ) VALUES
        (${projetoId}, 'Preparar cronograma detalhado', 'Documentar milestones e entregas parciais.', 'aberta', 'media', ${usuario.id}, ${usuario.id}, '2025-10-18');
    `

    console.log(`Projeto ${numeroProjeto} criado com sucesso (id=${projetoId}).`)
  })
}

main()
  .catch((err) => {
    console.error("Erro ao executar seed de projetos:\n", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
