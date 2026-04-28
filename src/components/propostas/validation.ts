import { z } from 'zod'

export const materialSchema = z.object({
  id: z.string(),
  codigo: z.string().min(1, 'Código obrigatório'),
  nome: z.string().min(1, 'Nome obrigatório'),
  quantidade: z.number().min(0, 'Quantidade deve ser positiva'),
  unidade: z.string().min(1, 'Unidade obrigatória'),
  preco: z.number().optional(),
  status: z.enum(['necessario', 'opcional', 'substituivel']),
  fornecedor: z.string().optional(),
  obs: z.string().optional(),
})

export const etapaSchema = z.object({
  id: z.string(),
  servico: z.string().min(1, 'Serviço obrigatório'),
  descricao: z.string().min(1, 'Descrição obrigatória'),
  quantidade: z.number().optional(),
  unidade: z.string().optional(),
  duracaoHoras: z.number().optional(),
  custoMO: z.number().optional(),
  status: z.enum(['planejada', 'opcional', 'removida']),
})

export const clienteInfoSchema = z.object({
  id: z.string().min(1, 'Cliente obrigatório'),
  contato_nome: z.string().min(1, 'Nome do contato obrigatório'),
  contato_email: z.string().email('E-mail inválido'),
  contato_telefone: z.string().optional(),
  local_endereco: z.string().min(1, 'Endereço obrigatório'),
  titulo: z.string().min(1, 'Título obrigatório'),
})

export const prazosInfoSchema = z.object({
  tempo_para_aceite: z.number().min(1, 'Tempo para aceite deve ser positivo'),
  validade_proposta: z.string().min(1, 'Validade obrigatória'),
  prazo_execucao_dias: z.number().min(1, 'Prazo de execução deve ser positivo'),
  janela: z.string().optional(),
  restricoes: z.string().optional(),
})

export const comerciaisInfoSchema = z.object({
  condicoes_pagamento: z.string().min(1, 'Condições de pagamento obrigatórias'),
  garantia: z.string().min(1, 'Garantia obrigatória'),
  exclusoes: z.string().min(1, 'Exclusões obrigatórias'),
  condicoes_gerais: z.string().min(1, 'Condições gerais obrigatórias'),
  desconto: z.number().min(0).max(100, 'Desconto deve estar entre 0 e 100%'),
})

export const internoInfoSchema = z.object({
  custo_material: z.number().min(0),
  custo_mo: z.number().min(0),
  horas_mo: z.number().min(0),
  custo_terceiros: z.number().min(0),
  overhead_pct: z.number().min(0).max(100),
  margem_pct: z.number().min(0).max(100),
  impostos_pct: z.number().min(0).max(100),
  contingencia_pct: z.number().min(0).max(100),
  frete: z.number().min(0),
})

export const faturamentoInfoSchema = z.object({
  gatilho: z.enum(['na_aprovacao', 'por_marcos', 'na_entrega', 'custom']),
  percentual_sinal: z.number().min(0).max(100),
  forma_preferida: z.string().min(1, 'Forma de pagamento obrigatória'),
  instrucoes: z.string().optional(),
})

export const propostaFormSchema = z.object({
  cliente: clienteInfoSchema,
  escopo: z.string().min(10, 'Escopo deve ter pelo menos 10 caracteres'),
  prazos: prazosInfoSchema,
  permite: z.enum(['NECESSARIO', 'NAO_NECESSARIO', 'OBTIDO']),
  quaisPermites: z.string().optional(),
  normas: z.string().optional(),
  inspecoes: z.string().optional(),
  materiais: z.array(materialSchema),
  etapas: z.array(etapaSchema),
  comerciais: comerciaisInfoSchema,
  interno: internoInfoSchema,
  faturamento: faturamentoInfoSchema,
  obsCliente: z.string().optional(),
  obsInternas: z.string().optional(),
  status: z.enum(['RASCUNHO', 'ENVIADA', 'ASSINADA', 'APROVADA', 'CANCELADA']),
})

export type PropostaFormValidated = z.infer<typeof propostaFormSchema>
