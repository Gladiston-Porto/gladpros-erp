// Adapter para converter dados do novo formulário para o formato da API/DB atual
import { PropostaFormData } from '@/components/propostas/types'
import { Proposta_status as StatusProposta, Proposta_permite as StatusPermite } from '@prisma/client'

export interface PropostaAPIPayload {
  // Dados principais
  clienteId: number
  titulo?: string
  descricao?: string
  valorEstimado: number
  status: StatusProposta

  // Contato e local
  contatoNome: string
  contatoEmail: string
  contatoTelefone?: string
  localExecucaoEndereco: string
  // Structured service address
  serviceAddressLine1?: string
  serviceAddressLine2?: string
  serviceAddressCity?: string
  serviceAddressState?: string
  serviceAddressZip?: string

  // Prazos
  tempoParaAceite: number
  validadeProposta: Date
  prazoExecucaoDias: number
  janelaExecucao?: string
  restricoesAcesso?: string

  // Permits e conformidade
  permite: StatusPermite
  quaisPermites?: string
  normasReferencia?: string
  inspecoesNecessarias?: string

  // Comerciais
  condicoesPagamento: string
  garantia: string
  exclusoes: string
  condicoesGerais: string

  // Estimativas internas
  estimativasInternas: {
    custoMaterialEstimado: number
    custoMaoObraEstimado: number
    horasMaoObraEstimadas: number
    custoTerceirosEstimado: number
    overheadPercentual: number
    margemDesejadaPercentual: number
    impostosPercentual: number
    contingenciaPercentual: number
    freteLogisticaEstimado: number
    totalEstimadoInterno: number
  }

  // Faturamento
  gatilhoFaturamento: string
  percentualSinal: number
  formaPreferida: string
  instrucoesFaturamento?: string

  // Observações
  observacoesCliente?: string
  observacoesInternas?: string

  // Tax classification (sent to API which computes the actual tax via salesTaxService)
  propertyType?: string
  serviceCategory?: string
  contractType?: string

  // Materiais e etapas (simplified for DB)
  materiais: Array<{
    estoqueItemId?: number
    codigo: string
    nome: string
    quantidade: number
    unidade: string
    valorUnitarioEstimado?: number
    status: string
    fornecedor?: string
    observacoes?: string
  }>

  etapas: Array<{
    servico: string
    descricao: string
    ordem: number
    quantidade?: number
    unidade?: string
    duracaoEstimadaHoras?: number
    custoMaoObraEstimado?: number
    status: string
  }>
}

export function adaptPropostaFormToAPI(formData: PropostaFormData): PropostaAPIPayload {
  // Calcular totais
  const custoMaterial = formData.materiais.reduce((acc, m) => acc + (m.preco || 0) * m.quantidade, 0)
  const custoMaoObra = formData.interno.custo_mo
  const custoTerceiros = formData.interno.custo_terceiros
  const freteLogistica = formData.interno.frete

  const base = custoMaterial + custoMaoObra + custoTerceiros + freteLogistica
  const overhead = base * (formData.interno.overhead_pct / 100)
  const margem = (base + overhead) * (formData.interno.margem_pct / 100)
  const contingencia = (base + overhead + margem) * (formData.interno.contingencia_pct / 100)
  const subtotal = base + overhead + margem + contingencia
  const impostos = subtotal * (formData.interno.impostos_pct / 100)
  const valorTotal = subtotal + impostos

  return {
    clienteId: parseInt(formData.cliente.id),
    titulo: formData.cliente.titulo,
    descricao: formData.escopo,
    valorEstimado: valorTotal,
    status: formData.status as any,

    // Contato
    contatoNome: formData.cliente.contato_nome,
    contatoEmail: formData.cliente.contato_email,
    contatoTelefone: formData.cliente.contato_telefone || undefined,
    localExecucaoEndereco: formData.cliente.local_endereco,

    // Prazos
    tempoParaAceite: formData.prazos.tempo_para_aceite,
    validadeProposta: new Date(formData.prazos.validade_proposta),
    prazoExecucaoDias: formData.prazos.prazo_execucao_dias,
    janelaExecucao: formData.prazos.janela,
    restricoesAcesso: formData.prazos.restricoes,

    // Permits
    permite: formData.permite as any,
    quaisPermites: formData.quaisPermites,
    normasReferencia: formData.normas,
    inspecoesNecessarias: formData.inspecoes,

    // Comerciais
    condicoesPagamento: formData.comerciais.condicoes_pagamento,
    garantia: formData.comerciais.garantia,
    exclusoes: formData.comerciais.exclusoes,
    condicoesGerais: formData.comerciais.condicoes_gerais,

    // Estimativas internas
    estimativasInternas: {
      custoMaterialEstimado: custoMaterial,
      custoMaoObraEstimado: custoMaoObra,
      horasMaoObraEstimadas: formData.interno.horas_mo,
      custoTerceirosEstimado: custoTerceiros,
      overheadPercentual: formData.interno.overhead_pct,
      margemDesejadaPercentual: formData.interno.margem_pct,
      impostosPercentual: formData.interno.impostos_pct,
      contingenciaPercentual: formData.interno.contingencia_pct,
      freteLogisticaEstimado: freteLogistica,
      totalEstimadoInterno: valorTotal
    },

    // Faturamento
    gatilhoFaturamento: formData.faturamento.gatilho.toUpperCase(),
    percentualSinal: formData.faturamento.percentual_sinal,
    formaPreferida: formData.faturamento.forma_preferida,
    instrucoesFaturamento: formData.faturamento.instrucoes,

    // Observações
    observacoesCliente: formData.obsCliente,
    observacoesInternas: formData.obsInternas,

    // Structured service address
    serviceAddressLine1: formData.cliente.serviceAddressLine1 || undefined,
    serviceAddressLine2: formData.cliente.serviceAddressLine2 || undefined,
    serviceAddressCity: formData.cliente.serviceAddressCity || undefined,
    serviceAddressState: formData.cliente.serviceAddressState || 'TX',
    serviceAddressZip: formData.cliente.serviceAddressZip || undefined,

    // Tax classification
    propertyType: formData.propertyType,
    serviceCategory: formData.serviceCategory,
    contractType: formData.contractType,

    // Materiais adaptados
    materiais: formData.materiais.map(m => ({
      estoqueItemId: m.estoqueItemId,
      codigo: m.codigo,
      nome: m.nome,
      quantidade: m.quantidade,
      unidade: m.unidade,
      valorUnitarioEstimado: m.preco,
      status: m.status === 'substituivel' ? 'SUBSTITUIDO' : 'PLANEJADO',
      fornecedor: m.fornecedor,
      observacoes: m.obs
    })),

    // Etapas adaptadas
    etapas: formData.etapas.map((e, index) => ({
      servico: e.servico,
      descricao: e.descricao,
      ordem: index + 1,
      quantidade: e.quantidade,
      unidade: e.unidade,
      duracaoEstimadaHoras: e.duracaoHoras,
      custoMaoObraEstimado: e.custoMO,
      status: 'PLANEJADA' // Default for now as schema only has PLANEJADA? Check schema.
    }))
  }
}

import { Proposta, PropostaMaterial, PropostaEtapa, Cliente } from '@prisma/client'

// Tipo composto do Prisma com includes
export type PropostaComRelacoes = Proposta & {
  PropostaMaterial: PropostaMaterial[];
  PropostaEtapa: PropostaEtapa[];
  Cliente: Cliente;
}

export function adaptAPIToPropostaForm(proposta: PropostaComRelacoes): PropostaFormData {
  // Parse internal estimate if exists
  const internoData = proposta.internalEstimate ? JSON.parse(proposta.internalEstimate) : {};

  // Parse address from fields or fallback to old JSON
  // Not needed strictly if we trust the address fields in Cliente? 
  // Wait, Proposta form has 'cliente' state which includes address.
  // We should map the proposal's stored client info or the updated client info?
  // Usually proposal has a snapshot of client info at that time, but here we link to Cliente. 
  // The form uses `cliente` state to store current selected client and their contact info.

  // Map materials
  const materiais = proposta.PropostaMaterial.map(m => ({
    id: String(m.id), // Form expects string IDs often for drag/drop or temp ids
    codigo: m.codigo || '',
    nome: m.nome,
    quantidade: Number(m.quantidade),
    unidade: m.unidade || 'un',
    preco: Number(m.precoUnitario || 0),
    status: (m.status === 'PLANEJADO' ? 'necessario' : 'opcional') as any, // Simplified map
    obs: m.observacao || '',
    fornecedor: m.fornecedorPreferencial || '',
    estoqueItemId: m.estoqueItemId ?? undefined,
  }));

  // Map etapas
  const etapas = proposta.PropostaEtapa.map(e => ({
    id: String(e.id),
    servico: e.servico,
    descricao: e.descricao,
    quantidade: Number(e.quantidade || 1),
    unidade: e.unidade || 'serviço',
    duracaoHoras: Number(e.duracaoEstimadaHoras || 0),
    custoMO: Number(e.custoMaoObraEstimado || 0),
    status: (e.status === 'PLANEJADA' ? 'planejada' : 'opcional') as any // Simplified map
  }));

  return {
    cliente: {
      id: String(proposta.clienteId),
      contato_nome: proposta.contatoNome,
      contato_email: proposta.contatoEmail,
      contato_telefone: proposta.contatoTelefone || '',
      local_endereco: proposta.localExecucaoEndereco,
      titulo: proposta.titulo,
      serviceAddressLine1: proposta.serviceAddressLine1 || '',
      serviceAddressLine2: proposta.serviceAddressLine2 || '',
      serviceAddressCity: proposta.serviceAddressCity || '',
      serviceAddressState: proposta.serviceAddressState || 'TX',
      serviceAddressZip: proposta.serviceAddressZip || '',
    },
    escopo: proposta.descricaoEscopo,
    prazos: {
      tempo_para_aceite: proposta.tempoParaAceite || 7,
      validade_proposta: proposta.validadeProposta ? new Date(proposta.validadeProposta).toISOString().split('T')[0] : '',
      prazo_execucao_dias: proposta.prazoExecucaoEstimadoDias || 0,
      janela: proposta.janelaExecucaoPreferencial || '',
      restricoes: proposta.restricoesDeAcesso || ''
    },
    permite: proposta.permite as StatusPermite,
    quaisPermites: proposta.quaisPermites || '',
    normas: proposta.normasReferencias || '',
    inspecoes: proposta.inspecoesNecessarias || '',
    materiais: materiais,
    etapas: etapas,
    comerciais: {
      condicoes_pagamento: proposta.condicoesPagamento || '',
      garantia: proposta.garantia || '',
      exclusoes: proposta.exclusoes || '',
      condicoes_gerais: proposta.condicoesGerais || '',
      desconto: Number(proposta.descontosOfertados || 0)
    },
    interno: {
      custo_material: internoData.custoMaterialEstimado || 0,
      custo_mo: internoData.custoMaoObraEstimado || 0,
      horas_mo: internoData.horasMaoObraEstimadas || 0,
      custo_terceiros: internoData.custoTerceirosEstimado || 0,
      overhead_pct: internoData.overheadPercentual || 0,
      margem_pct: internoData.margemDesejadaPercentual || 0,
      impostos_pct: internoData.impostosPercentual || 0,
      contingencia_pct: internoData.contingenciaPercentual || 0,
      frete: internoData.freteLogisticaEstimado || 0
    },
    faturamento: {
      gatilho: (proposta.gatilhoFaturamento?.toLowerCase() as any) || 'na_aprovacao',
      percentual_sinal: Number(proposta.percentualSinal || 0),
      forma_preferida: proposta.formaPagamentoPreferida || 'Invoice',
      instrucoes: proposta.instrucoesPagamento || ''
    },
    obsCliente: proposta.observacoesParaCliente || '',
    obsInternas: proposta.observacoesInternas || '',
    status: proposta.status as StatusProposta,
    propertyType: (proposta.propertyType as PropostaFormData['propertyType']) ?? 'RESIDENTIAL',
    serviceCategory: (proposta.serviceCategory as PropostaFormData['serviceCategory']) ?? 'REPAIR',
    contractType: (proposta.contractType as PropostaFormData['contractType']) ?? 'LUMP_SUM',
  };
}
