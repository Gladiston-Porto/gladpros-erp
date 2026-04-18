/**
 * Script de teste - PDF com dados grandes para validar paginação
 */

import path from 'path'
import fs from 'fs'
import { writeFile } from 'fs/promises'
import type { PropostaWithRelations } from '../src/shared/lib/services/proposta-pdf'
import { generatePropostaPDFTemplate } from '../src/shared/lib/services/proposta-pdf-template'

// Carregar logo para teste
const getLogoBase64 = () => {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'LOGO 01.png')
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath)
      return `data:image/png;base64,${logoBuffer.toString('base64')}`
    }
  } catch {
    console.warn('Logo não encontrada para teste')
  }
  return undefined
}

// Dados GRANDES para testar quebra de página
const buildLargeProposal = (): PropostaWithRelations => {
  const now = new Date()

  // Escopo longo (mais de 500 chars)
  const escopoLongo = `Este projeto contempla a completa renovação do sistema elétrico do edifício comercial, incluindo substituição de toda a fiação antiga por cabos de cobre THHN de alta qualidade, instalação de novos painéis elétricos com capacidade ampliada para suportar futuras expansões, implementação de sistema de proteção AFCI/GFCI em todos os circuitos conforme exigido pelo National Electrical Code (NEC) 2023, instalação de sistema de iluminação LED de alta eficiência em todas as áreas comuns e privativas, configuração de circuitos dedicados para equipamentos de alta potência, e preparação da infraestrutura para futura instalação de carregadores de veículos elétricos no estacionamento.`

  // Muitas etapas (12 etapas)
  const etapas = [
    { titulo: 'Vistoria técnica inicial', descricao: 'Levantamento completo das instalações existentes, identificação de pontos críticos, medição de cargas atuais e projeção de demanda futura. Inclui relatório fotográfico detalhado.', horas: 8, valor: 0 },
    { titulo: 'Projeto executivo', descricao: 'Elaboração do projeto elétrico completo com memorial de cálculo, diagrama unifilar, lista de materiais e cronograma detalhado de execução.', horas: 24, valor: 2500 },
    { titulo: 'Aprovação e licenciamento', descricao: 'Submissão do projeto aos órgãos competentes, acompanhamento do processo de aprovação e obtenção de todas as licenças necessárias.', horas: 16, valor: 1500 },
    { titulo: 'Mobilização e canteiro', descricao: 'Preparação do canteiro de obras, instalação de sinalização de segurança, montagem de área de armazenamento de materiais.', horas: 8, valor: 800 },
    { titulo: 'Demolição fase 1 - Térreo', descricao: 'Remoção das instalações antigas do pavimento térreo, desativação segura de circuitos, separação de materiais recicláveis.', horas: 32, valor: 3200 },
    { titulo: 'Demolição fase 2 - Andares superiores', descricao: 'Continuação da remoção nos andares superiores, com especial atenção às áreas de difícil acesso e conduítes embutidos.', horas: 48, valor: 4800 },
    { titulo: 'Infraestrutura - Alimentação principal', descricao: 'Instalação do novo quadro geral de baixa tensão, alimentadores principais e sistema de aterramento conforme NBR 5410.', horas: 40, valor: 8500 },
    { titulo: 'Infraestrutura - Distribuição', descricao: 'Instalação dos quadros de distribuição por pavimento, circuitos de iluminação e tomadas, circuitos especiais para ar condicionado.', horas: 80, valor: 12000 },
    { titulo: 'Acabamentos elétricos', descricao: 'Instalação de tomadas, interruptores, espelhos, luminárias LED, sensores de presença e demais dispositivos de acabamento.', horas: 56, valor: 6500 },
    { titulo: 'Sistema de emergência', descricao: 'Instalação de iluminação de emergência, sinalização de rotas de fuga, sistema de alarme de incêndio integrado.', horas: 24, valor: 4200 },
    { titulo: 'Testes e comissionamento', descricao: 'Realização de todos os testes de isolamento, continuidade, impedância de loop, verificação de proteções e ajustes finais.', horas: 32, valor: 2800 },
    { titulo: 'Documentação e entrega', descricao: 'Elaboração do as-built, manuais de operação, treinamento da equipe de manutenção do cliente, acompanhamento da inspeção final.', horas: 16, valor: 1200 },
  ]

  // Muitos materiais (15 materiais)
  const materiais = [
    { nome: 'Painel elétrico 200A, 42 espaços, NEMA 3R, com barramento de cobre', qtd: 1, unidade: 'un', preco: 2850 },
    { nome: 'Painel elétrico 125A, 24 espaços, indoor, com porta e fechadura', qtd: 8, unidade: 'un', preco: 420 },
    { nome: 'Disjuntor termomagnético 20A, curva C, 10kA', qtd: 96, unidade: 'un', preco: 28 },
    { nome: 'Disjuntor AFCI 20A, proteção contra arco elétrico', qtd: 48, unidade: 'un', preco: 85 },
    { nome: 'Disjuntor GFCI 20A, proteção contra choque', qtd: 24, unidade: 'un', preco: 65 },
    { nome: 'Cabo cobre THHN 10 AWG, 600V, vermelho', qtd: 1500, unidade: 'ft', preco: 0.85 },
    { nome: 'Cabo cobre THHN 10 AWG, 600V, preto', qtd: 1500, unidade: 'ft', preco: 0.85 },
    { nome: 'Cabo cobre THHN 10 AWG, 600V, branco', qtd: 1500, unidade: 'ft', preco: 0.85 },
    { nome: 'Cabo cobre THHN 12 AWG, 600V, cores diversas', qtd: 3000, unidade: 'ft', preco: 0.55 },
    { nome: 'Conduíte metálico EMT 3/4"', qtd: 500, unidade: 'ft', preco: 2.80 },
    { nome: 'Conduíte metálico EMT 1"', qtd: 200, unidade: 'ft', preco: 4.20 },
    { nome: 'Caixa de passagem 4x4" metálica', qtd: 120, unidade: 'un', preco: 3.50 },
    { nome: 'Tomada duplex 20A, 125V, grau comercial, branca', qtd: 85, unidade: 'un', preco: 8.50 },
    { nome: 'Interruptor simples 15A, grau comercial, branco', qtd: 45, unidade: 'un', preco: 6.80 },
    { nome: 'Luminária LED painel 2x4, 50W, 5000K, driver integrado', qtd: 60, unidade: 'un', preco: 125 },
  ]

  return {
    id: 99,
    numeroProposta: 'GP-2025-TEST',
    clienteId: 101,
    dataCriacao: now,
    cliente: {
      id: 101,
      tipo: 'PJ',
      displayName: 'ABC Commercial Properties LLC',
      nome: 'ABC Commercial Properties LLC',
      razaoSocial: 'ABC Commercial Properties LLC',
      email: 'projects@abcproperties.com',
      telefone: '(214) 555-1234',
      enderecoTexto: '4500 Commerce Street, Suite 200 – Dallas, TX 75226'
    },
    contatoNome: 'Michael Johnson',
    contatoEmail: 'mjohnson@abcproperties.com',
    contatoTelefone: '(214) 555-5678',
    localExecucaoEndereco: '4500 Commerce Street – Dallas, TX 75226',
    titulo: 'Retrofit Elétrico Completo - Edifício Comercial Commerce Plaza',
    descricaoEscopo: escopoLongo,
    tipoServico: 'Electrical Retrofit',
    tempoParaAceite: 30,
    validadeProposta: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    prazoExecucaoEstimadoDias: 45,
    janelaExecucaoPreferencial: 'Segunda a sexta, 7h às 17h. Trabalhos aos sábados mediante acordo prévio. Áreas ocupadas: trabalho noturno disponível com adicional de 25%.',
    restricoesDeAcesso: 'Elevador de carga disponível apenas até 16h. Estacionamento reservado para veículos da obra no subsolo B2.',
    permite: 'SIM',
    quaisPermites: 'Electrical Permit - City of Dallas, Building Permit',
    normasReferencias: 'NEC 2023, NFPA 70, City of Dallas Electrical Code',
    inspecoesNecessarias: 'Rough-in inspection, Final inspection, Fire Marshal inspection',
    condicoesPagamento: null,
    garantia: 'Garantia de 24 meses sobre toda a mão de obra executada. Garantia dos materiais conforme fabricante (mínimo 12 meses). Suporte técnico prioritário durante o período de garantia.',
    exclusoes: 'Reparos em drywall, pintura ou acabamentos civis não relacionados diretamente às instalações elétricas.\nSubstituição de equipamentos de ar condicionado, apenas alimentação elétrica.\nTaxas de inspeção e licenciamento municipal (responsabilidade do proprietário).\nMobiliário, equipamentos de TI ou qualquer item não especificado nesta proposta.',
    condicoesGerais: 'Todos os serviços executados em conformidade com NEC 2023 e regulamentações locais.\nAlterações de escopo serão formalizadas por aditivo contratual.\nAcesso livre às áreas de trabalho durante o expediente acordado.\nCliente responsável por backup de dados e proteção de equipamentos sensíveis.\nInterrupções programadas de energia serão comunicadas com 48h de antecedência.',
    descontosOfertados: 5,
    opcoesAlternativas: null,
    valorEstimado: 48000,
    internalEstimate: null,
    precoPropostaCliente: 52500,
    moeda: 'USD',
    gatilhoFaturamento: 'POR_MARCOS',
    percentualSinal: 30,
    marcosPagamento: null,
    formaPagamentoPreferida: 'TRANSFERENCIA',
    instrucoesPagamento: 'Wire transfer to GladPros LLC - Bank of America - Account ending 4521',
    multaAtraso: '2% + 1% ao mês',
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
    aprovacaoInternaTecnica: true,
    aprovacaoInternaFinanceira: true,
    aprovadaEm: null,
    motivo_cancelamento: null,
    observacoesInternas: 'Cliente tem histórico de pagamentos pontuais. Projeto estratégico - possibilidade de indicações para outros edifícios do grupo. Atenção: área de estacionamento tem infiltração, verificar condições dos conduítes existentes antes de reaproveitar.',
    observacoesParaCliente: 'Agradecemos a oportunidade de apresentar esta proposta. Nossa equipe está à disposição para esclarecer quaisquer dúvidas e ajustar o escopo conforme suas necessidades.',
    riscosIdentificados: 'Possível presença de amianto em revestimentos antigos - recomendada análise prévia. Estrutura de concreto pode dificultar passagem de conduítes em alguns pontos.',
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
    etapas: etapas.map((e, idx) => ({
      id: idx + 1,
      propostaId: 99,
      titulo: e.titulo,
      descricao: e.descricao,
      ordem: idx + 1,
      valorEstimado: e.valor,
      duracaoEstimadaHoras: e.horas,
      custoMaoObraEstimado: e.valor * 0.7,
      dependencias: idx > 0 ? `Etapa ${idx} concluída` : null,
      status: 'PLANEJADA',
      dataInicioEstimada: null,
      dataFimEstimada: null,
      dataInicioReal: null,
      dataFimReal: null,
      observacoes: null,
      criadoEm: now,
      atualizadoEm: now
    })),
    materiais: materiais.map((m, idx) => ({
      id: idx + 1,
      propostaId: 99,
      nome: m.nome,
      descricao: null,
      quantidade: m.qtd,
      unidade: m.unidade,
      valorUnitario: m.preco,
      fornecedor: null,
      fornecedorPreferencial: null,
      observacoes: null,
      especificacoes: {},
      status: 'PLANEJADO',
      criadoEm: now,
      atualizadoEm: now,
      valorTotalCalculado: m.qtd * m.preco
    })),
    anexos: []
  }
}

async function generate() {
  const proposta = buildLargeProposal()
  const logoBase64 = getLogoBase64()

  // Gerar HTML
  // CLIENTE: valores detalhados ocultos, apenas valor TOTAL visível
  const htmlClient = generatePropostaPDFTemplate(proposta, {
    includeDetailedValues: false,  // Oculta valores por etapa/material
    includeTotalValue: true,       // Mostra valor total da proposta
    isInternal: false,
    logoBase64
  })

  // INTERNO: todos os valores visíveis + observações internas
  const htmlInternal = generatePropostaPDFTemplate(proposta, {
    includeDetailedValues: true,
    includeTotalValue: true,
    isInternal: true,
    logoBase64
  })

  // Salvar HTMLs
  await writeFile(path.resolve(process.cwd(), 'proposta-large-client.html'), htmlClient)
  console.log('HTML cliente salvo: proposta-large-client.html')

  await writeFile(path.resolve(process.cwd(), 'proposta-large-internal.html'), htmlInternal)
  console.log('HTML interno salvo: proposta-large-internal.html')

  // Gerar PDFs
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
    await writeFile(path.resolve(process.cwd(), 'proposta-large-client.pdf'), pdfClient)
    console.log(`PDF cliente salvo: proposta-large-client.pdf (${pdfClient.length} bytes)`)

    // PDF Interno
    const pageInternal = await browser.newPage()
    await pageInternal.setContent(htmlInternal, { waitUntil: 'networkidle0' })
    const pdfInternal = await pageInternal.pdf({
      format: 'Letter',
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      printBackground: true
    })
    await writeFile(path.resolve(process.cwd(), 'proposta-large-internal.pdf'), pdfInternal)
    console.log(`PDF interno salvo: proposta-large-internal.pdf (${pdfInternal.length} bytes)`)

    await browser.close()

    console.log('\n✅ Teste com dados grandes concluído!')
    console.log('Compare os PDFs para verificar a paginação das tabelas.')

  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
  }
}

generate().catch(error => {
  console.error('Falha:', error)
  process.exitCode = 1
})
