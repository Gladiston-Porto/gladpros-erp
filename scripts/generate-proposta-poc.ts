/**
 * Script de prova de conceito - Gerar PDF usando o template baseado no HTML de referência
 */

import path from 'path'
import { writeFile } from 'fs/promises'
import type { PropostaWithRelations } from '../src/shared/lib/services/proposta-pdf'
import { generatePropostaPDFTemplate } from '../src/shared/lib/services/proposta-pdf-template'

// Dados de exemplo
const buildFakeProposal = (): PropostaWithRelations => {
  const now = new Date()

  return {
    id: 42,
    numeroProposta: 'GP-2025-001',
    clienteId: 101,
    dataCriacao: now,
    cliente: {
      id: 101,
      tipo: 'PJ',
      displayName: 'Cliente Exemplo LLC',
      nome: 'Cliente Exemplo LLC',
      razaoSocial: 'Cliente Exemplo LLC',
      email: 'john.doe@email.com',
      telefone: '(999) 999-9999',
      enderecoTexto: '1234 Main Street, Apt 101 – Dallas, TX 75001'
    },
    contatoNome: 'John Doe',
    contatoEmail: 'john.doe@email.com',
    contatoTelefone: '(999) 999-9999',
    localExecucaoEndereco: '1234 Main Street, Apt 101 – Dallas, TX 75001',
    titulo: 'Serviços de adequação elétrica e melhorias gerais',
    descricaoEscopo:
      'Adequar a infraestrutura elétrica do edifício às normas vigentes, aumentar a segurança e preparar as unidades para futuras expansões de carga, minimizando paradas e impactos para os moradores.',
    tipoServico: 'Electrical Services',
    tempoParaAceite: 30,
    validadeProposta: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    prazoExecucaoEstimadoDias: 10,
    janelaExecucaoPreferencial: 'Acesso liberado das 9h às 16h, segunda a sexta. Silêncio após 18h.',
    restricoesDeAcesso: null,
    permite: 'SIM',
    quaisPermites: null,
    normasReferencias: 'NEC',
    inspecoesNecessarias: null,
    condicoesPagamento: null,
    garantia: 'Garantia de 12 meses sobre a mão de obra, conforme condições gerais desta proposta.',
    exclusoes: 'Mobiliário, decoração, reparos estéticos extensos ou reposição de itens não descritos no escopo.\nTaxas de inspeção e licenças municipais, quando contratadas diretamente pelo cliente.\nDanos pré-existentes na infraestrutura.',
    condicoesGerais: 'Todos os serviços serão executados em conformidade com o National Electrical Code (NEC) vigente.\nQualquer necessidade de adequação estrutural pode ser orçada à parte.\nInterrupções imprevistas podem impactar o cronograma.',
    descontosOfertados: null,
    opcoesAlternativas: null,
    valorEstimado: 18750,
    internalEstimate: null,
    precoPropostaCliente: 18750,
    moeda: 'USD',
    gatilhoFaturamento: 'NA_APROVACAO',
    percentualSinal: 30,
    marcosPagamento: null,
    formaPagamentoPreferida: 'TRANSFERENCIA',
    instrucoesPagamento: null,
    multaAtraso: null,
    descontosCondicionais: null,
    status: 'ENVIADA',
    enviadaParaOCliente: now,
    tokenPublico: null,
    tokenExpiresAt: null,
    assinaturaTipo: null,
    assinaturaCliente: null,
    assinaturaImagem: null,
    assinaturaIp: null,
    assinaturaUserAgent: null,
    assinadaEm: null,
    assinaturaResponsavel: null,
    aprovacaoInternaTecnica: false,
    aprovacaoInternaFinanceira: false,
    aprovadaEm: null,
    motivo_cancelamento: null,
    observacoesInternas: 'Cliente pediu compressão do cronograma em 10%. Avaliar uso de squad estendido.',
    observacoesParaCliente: null,
    riscosIdentificados: 'Dependência de aprovação de acessos.',
    projetoId: null,
    dataConversao: null,
    responsavelConversao: null,
    criadoPor: 7,
    atualizadoPor: 7,
    historicoAlteracoes: null,
    deletedAt: null,
    deletedBy: null,
    criadoEm: now,
    atualizadoEm: now,
    etapas: [
      {
        id: 1,
        propostaId: 42,
        titulo: 'Vistoria técnica detalhada',
        descricao: 'Conferência de painéis, medições de carga, avaliação de pontos críticos e alinhamento final com o cliente.',
        ordem: 1,
        valorEstimado: 0,
        duracaoEstimadaHoras: 4,
        custoMaoObraEstimado: 0,
        dependencias: null,
        status: 'PLANEJADA',
        dataInicioEstimada: null,
        dataFimEstimada: null,
        dataInicioReal: null,
        dataFimReal: null,
        observacoes: null,
        criadoEm: now,
        atualizadoEm: now
      },
      {
        id: 2,
        propostaId: 42,
        titulo: 'Demolição e preparação',
        descricao: 'Remoção de fiações antigas, identificação de conduítes reaproveitáveis e preparação para nova instalação.',
        ordem: 2,
        valorEstimado: 3500,
        duracaoEstimadaHoras: 16,
        custoMaoObraEstimado: 2800,
        dependencias: null,
        status: 'PLANEJADA',
        dataInicioEstimada: null,
        dataFimEstimada: null,
        dataInicioReal: null,
        dataFimReal: null,
        observacoes: null,
        criadoEm: now,
        atualizadoEm: now
      },
      {
        id: 3,
        propostaId: 42,
        titulo: 'Nova infraestrutura elétrica',
        descricao: 'Instalação de novos circuitos, painéis, proteções AFCI/GFCI conforme NEC e especificações do projeto.',
        ordem: 3,
        valorEstimado: 12000,
        duracaoEstimadaHoras: 40,
        custoMaoObraEstimado: 9600,
        dependencias: 'Etapa 2 concluída',
        status: 'PLANEJADA',
        dataInicioEstimada: null,
        dataFimEstimada: null,
        dataInicioReal: null,
        dataFimReal: null,
        observacoes: null,
        criadoEm: now,
        atualizadoEm: now
      },
      {
        id: 4,
        propostaId: 42,
        titulo: 'Acabamentos e testes',
        descricao: 'Instalação de tomadas, luminárias, testes finais, ajustes e acompanhamento em inspeção quando aplicável.',
        ordem: 4,
        valorEstimado: 3250,
        duracaoEstimadaHoras: 16,
        custoMaoObraEstimado: 2400,
        dependencias: 'Etapa 3 concluída',
        status: 'PLANEJADA',
        dataInicioEstimada: null,
        dataFimEstimada: null,
        dataInicioReal: null,
        dataFimReal: null,
        observacoes: null,
        criadoEm: now,
        atualizadoEm: now
      }
    ],
    materiais: [
      {
        id: 11,
        propostaId: 42,
        nome: 'Painel elétrico 125A, 24 espaços, indoor',
        descricao: null,
        quantidade: 8,
        unidade: 'un',
        valorUnitario: 380,
        fornecedor: null,
        fornecedorPreferencial: null,
        observacoes: null,
        especificacoes: {},
        status: 'PLANEJADO',
        criadoEm: now,
        atualizadoEm: now,
        valorTotalCalculado: 3040
      },
      {
        id: 12,
        propostaId: 42,
        nome: 'Cabo cobre THHN, bitolas diversas (alimentação e circuitos)',
        descricao: null,
        quantidade: 1,
        unidade: 'lote',
        valorUnitario: 4800,
        fornecedor: null,
        fornecedorPreferencial: null,
        observacoes: null,
        especificacoes: {},
        status: 'PLANEJADO',
        criadoEm: now,
        atualizadoEm: now,
        valorTotalCalculado: 4800
      },
      {
        id: 13,
        propostaId: 42,
        nome: 'Disjuntores AFCI/GFCI conforme projeto',
        descricao: null,
        quantidade: 1,
        unidade: 'lote',
        valorUnitario: 3500,
        fornecedor: null,
        fornecedorPreferencial: null,
        observacoes: null,
        especificacoes: {},
        status: 'PLANEJADO',
        criadoEm: now,
        atualizadoEm: now,
        valorTotalCalculado: 3500
      },
      {
        id: 14,
        propostaId: 42,
        nome: 'Materiais de fixação, conduítes, caixas, conectores e insumos',
        descricao: null,
        quantidade: 1,
        unidade: 'lote',
        valorUnitario: 2100,
        fornecedor: null,
        fornecedorPreferencial: null,
        observacoes: null,
        especificacoes: {},
        status: 'PLANEJADO',
        criadoEm: now,
        atualizadoEm: now,
        valorTotalCalculado: 2100
      }
    ],
    anexos: []
  }
}

async function generate() {
  const proposta = buildFakeProposal()

  // Gerar HTML para versão cliente
  const htmlClient = generatePropostaPDFTemplate(proposta, {
    // includeValues: true,
    isInternal: false
  })

  // Gerar HTML para versão interna
  const htmlInternal = generatePropostaPDFTemplate(proposta, {
    // includeValues: true,
    isInternal: true
  })

  // Salvar HTMLs para preview
  await writeFile(
    path.resolve(process.cwd(), 'proposta-poc-client.html'),
    htmlClient
  )
  console.log('HTML cliente salvo: proposta-poc-client.html')

  await writeFile(
    path.resolve(process.cwd(), 'proposta-poc-internal.html'),
    htmlInternal
  )
  console.log('HTML interno salvo: proposta-poc-internal.html')

  // Tentar gerar PDF com Puppeteer
  try {
    const puppeteer = await import('puppeteer')

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    // PDF Cliente
    const pageClient = await browser.newPage()
    await pageClient.setContent(htmlClient, { waitUntil: 'networkidle0' })
    const pdfClient = await pageClient.pdf({
      format: 'Letter',
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      printBackground: true
    })
    await writeFile(
      path.resolve(process.cwd(), 'proposta-poc-client.pdf'),
      pdfClient
    )
    console.log(`PDF cliente salvo: proposta-poc-client.pdf (${pdfClient.length} bytes)`)

    // PDF Interno
    const pageInternal = await browser.newPage()
    await pageInternal.setContent(htmlInternal, { waitUntil: 'networkidle0' })
    const pdfInternal = await pageInternal.pdf({
      format: 'Letter',
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      printBackground: true
    })
    await writeFile(
      path.resolve(process.cwd(), 'proposta-poc-internal.pdf'),
      pdfInternal
    )
    console.log(`PDF interno salvo: proposta-poc-internal.pdf (${pdfInternal.length} bytes)`)

    await browser.close()

    console.log('\n✅ Prova de conceito concluída!')
    console.log('Abra os arquivos e compare com o HTML de referência.')

  } catch (error) {
    console.error('Erro ao gerar PDF com Puppeteer:', error)
    console.log('\n⚠️ Os HTMLs foram salvos. Abra-os no navegador para visualizar.')
  }
}

generate().catch(error => {
  console.error('Falha:', error)
  process.exitCode = 1
})
