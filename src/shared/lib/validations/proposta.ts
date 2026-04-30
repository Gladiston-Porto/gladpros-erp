// src/shared/lib/validations/proposta.ts
//
// ATENÇÃO: Este arquivo é usado EXCLUSIVAMENTE pela rota de assinatura do portal do cliente:
//   → src/app/api/client/proposta/[token]/sign/route.ts
//
// Para validação de novas rotas de API internas, use:
//   → src/schemas/proposta.schema.ts  ← ARQUIVO CANÔNICO
//
// Nota: FormaPagamentoEnum aqui inclui métodos brasileiros (PIX, BOLETO, CHEQUE).
// Não expandir este arquivo para novas funcionalidades.
import { z } from "zod";

export const StatusPropostaEnum = z.enum(['RASCUNHO', 'ENVIADA', 'ASSINADA', 'APROVADA', 'CANCELADA']);
export const StatusPermiteEnum = z.enum(['SIM', 'NAO']);
export const StatusEtapaPropostaEnum = z.enum(['PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA']);
export const StatusMaterialPropostaEnum = z.enum(['PLANEJADO', 'SUBSTITUIDO', 'REMOVIDO']);
export const TipoAssinaturaEnum = z.enum(['CANVAS', 'CHECKBOX', 'NOME_CHECKBOX']);
export const GatilhoFaturamentoEnum = z.enum(['NA_APROVACAO', 'POR_MARCOS', 'NA_ENTREGA', 'CUSTOMIZADO']);
export const FormaPagamentoEnum = z.enum(['PIX', 'CARTAO', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'CHEQUE']);

// Schema para estimativas internas (JSON flexível)
export const internalEstimateSchema = z.object({
  custoMaterialEstimado: z.number().min(0).optional(),
  custoMaoObraEstimado: z.number().min(0).optional(),
  horasMaoObraEstimadas: z.number().min(0).optional(),
  custoTerceirosEstimado: z.number().min(0).optional(),
  overheadPercentual: z.number().min(0).max(100).optional(),
  margemDesejadaPercentual: z.number().min(0).max(100).optional(),
  impostosPercentual: z.number().min(0).max(100).optional(),
  contingenciaPercentual: z.number().min(0).max(100).optional(),
  freteLogisticaEstimado: z.number().min(0).optional(),
  totalEstimadoInterno: z.number().min(0).optional()
}).optional();

// Schema para marcos de pagamento (JSON flexível)
export const marcosPagamentoSchema = z.array(z.object({
  etapa: z.string(),
  percentual: z.number().min(0).max(100),
  descricao: z.string().optional()
})).optional();

// Schema para opções alternativas (JSON flexível) 
export const opcoesAlternativasSchema = z.array(z.object({
  nome: z.string(),
  descricao: z.string().optional(),
  valorAdicional: z.number().optional(),
  incluso: z.boolean().default(false)
})).optional();

// Schema base para criação de proposta
export const createPropostaSchema = z.object({
  clienteId: z.number().int().positive('Cliente é obrigatório'),

  // Informações de contato e execução
  contatoNome: z.string().min(1, 'Nome do contato é obrigatório').max(255),
  contatoEmail: z.string().email('Email inválido').max(255),
  contatoTelefone: z.string().max(50).optional(),
  localExecucaoEndereco: z.string().min(1, 'Endereço de execução é obrigatório'),

  // Título e escopo
  titulo: z.string().min(1, 'Título é obrigatório').max(500),
  descricaoEscopo: z.string().min(1, 'Descrição do escopo é obrigatória'),
  tipoServico: z.string().min(1, 'Tipo de serviço é obrigatório').max(255),

  // Prazos e validade
  tempoParaAceite: z.number().int().min(1).max(365).optional(),
  validadeProposta: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  prazoExecucaoEstimadoDias: z.number().int().min(1).optional(),
  janelaExecucaoPreferencial: z.string().optional(),
  restricoesDeAcesso: z.string().optional(),

  // Permissões e conformidades
  permite: StatusPermiteEnum,
  quaisPermites: z.string().optional(),
  normasReferencias: z.string().optional(),
  inspecoesNecessarias: z.string().optional(),

  // Condições comerciais
  condicoesPagamento: z.record(z.string(), z.any()).optional(),
  garantia: z.string().optional(),
  exclusoes: z.string().optional(),
  condicoesGerais: z.string().optional(),
  descontosOfertados: z.number().min(0).max(100).optional(),
  opcoesAlternativas: opcoesAlternativasSchema,

  // Estimativas
  valorEstimado: z.number().min(0).optional().transform(val => val ? Number(val) : undefined),
  internalEstimate: internalEstimateSchema,
  precoPropostaCliente: z.number().min(0).optional(),

  // Faturamento
  gatilhoFaturamento: GatilhoFaturamentoEnum.optional(),
  percentualSinal: z.number().min(0).max(100).optional(),
  marcosPagamento: marcosPagamentoSchema,
  formaPagamentoPreferida: FormaPagamentoEnum.optional(),
  instrucoesPagamento: z.string().optional(),
  multaAtraso: z.string().optional(),
  descontosCondicionais: z.string().optional(),

  // Observações
  observacoesInternas: z.string().optional(),
  observacoesParaCliente: z.string().optional(),
  riscosIdentificados: z.string().optional(),

  // Etapas
  etapas: z.array(z.object({
    servico: z.string().min(1, 'Serviço é obrigatório'),
    descricao: z.string().min(1, 'Descrição é obrigatória'),
    quantidade: z.number().min(0).optional(),
    unidade: z.string().optional(),
    duracaoEstimadaHoras: z.number().min(0).optional(),
    custoMaoObraEstimado: z.number().min(0).optional(),
    status: StatusEtapaPropostaEnum.default('PLANEJADA'),
    ordem: z.number().int().min(0).default(0),
    dependencias: z.string().optional(),
    taxable: z.boolean().default(false) // Services usually non-taxable (unless residential repair under separated contract rules, but defaulting to false for labor is safer for now)
  })).default([]),

  // Materiais
  materiais: z.array(z.object({
    codigo: z.string().optional(),
    nome: z.string().min(1, 'Nome do material é obrigatório'),
    quantidade: z.number().min(0, 'Quantidade deve ser maior que zero').default(0),
    unidade: z.string().optional(),
    status: StatusMaterialPropostaEnum.default('PLANEJADO'),
    observacao: z.string().optional(),
    precoUnitario: z.number().min(0).optional(),
    fornecedorPreferencial: z.string().optional(),
    moeda: z.string().default('USD'),
    taxable: z.boolean().default(true) // Materials usually taxable
  })).default([])
}).refine((data) => {
  if (data.permite === 'SIM' && !data.quaisPermites?.trim()) {
    return false;
  }
  return true;
}, {
  message: 'Campo "Quais permites" é obrigatório quando permite = SIM',
  path: ['quaisPermites']
});

// Schema para atualização de proposta
export const updatePropostaSchema = createPropostaSchema.partial().extend({
  id: z.number().int().positive(),
  status: StatusPropostaEnum.optional()
});

// Schema para filtros de listagem
export const propostaFiltersSchema = z.object({
  status: StatusPropostaEnum.optional(),
  clienteId: z.number().int().positive().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(), // Para cursor pagination
  sortKey: z.enum(['dataCriacao', 'numeroProposta', 'status', 'valorEstimado', 'criadoEm', 'titulo', 'cliente', 'valor']).default('dataCriacao'),
  sortDir: z.enum(['asc', 'desc']).default('desc')
});

// Schema para assinatura do cliente
export const assinaturaClienteSchema = z.object({
  assinaturaTipo: TipoAssinaturaEnum.default('CANVAS'),
  assinaturaCliente: z.string().min(1, 'Nome do signatário é obrigatório'),
  assinaturaImagem: z.string().optional(), // Base64 da imagem de assinatura (para CANVAS)
  aceiteTermos: z.boolean().refine(val => val === true, 'Deve aceitar os termos'),
  ip: z.string().optional(),
  userAgent: z.string().optional()
});

// Schema para envio (com token público)
export const enviarPropostaSchema = z.object({
  gerarToken: z.boolean().default(true),
  diasExpiracao: z.number().int().min(1).max(365).default(30)
});

// Schema para upload de anexos
export const uploadAnexoSchema = z.object({
  filename: z.string().min(1),
  mime: z.string().min(1),
  size: z.number().max(10 * 1024 * 1024, 'Arquivo deve ter no máximo 10MB'),
  privado: z.boolean().default(false),
  descricao: z.string().optional()
});

// Schema para aprovação
export const aprovarPropostaSchema = z.object({
  assinaturaResponsavel: z.string().min(1, 'Assinatura do responsável é obrigatória'),
  observacoes: z.string().optional()
});

// Schema para cancelamento
export const cancelarPropostaSchema = z.object({
  motivo: z.string().min(1, 'Motivo do cancelamento é obrigatório'),
  observacoes: z.string().optional()
});

// Schema de resposta da API (com mascaramento RBAC)
export const propostaResponseSchema = z.object({
  id: z.number(),
  numeroProposta: z.string(),
  clienteId: z.number(),

  // Informações de contato e execução
  contatoNome: z.string(),
  contatoEmail: z.string(),
  contatoTelefone: z.string().optional(),
  localExecucaoEndereco: z.string(),

  // Título e escopo
  titulo: z.string(),
  descricaoEscopo: z.string(),
  tipoServico: z.string(),

  // Prazos e validade
  dataCriacao: z.string(),
  tempoParaAceite: z.number().optional(),
  validadeProposta: z.string().optional(),
  prazoExecucaoEstimadoDias: z.number().optional(),
  janelaExecucaoPreferencial: z.string().optional(),
  restricoesDeAcesso: z.string().optional(),

  // Permissões
  permite: StatusPermiteEnum,
  quaisPermites: z.string().optional(),
  normasReferencias: z.string().optional(),
  inspecoesNecessarias: z.string().optional(),

  // Condições comerciais (visíveis para cliente)
  condicoesPagamento: z.record(z.string(), z.any()).optional(),
  garantia: z.string().optional(),
  exclusoes: z.string().optional(),
  condicoesGerais: z.string().optional(),
  descontosOfertados: z.number().optional(),
  opcoesAlternativas: z.any().optional(),

  // Valores (mascarados por RBAC)
  valorEstimado: z.union([z.number(), z.string()]).optional(), // String "****" para mascaramento
  precoPropostaCliente: z.union([z.number(), z.string()]).optional(),
  // internalEstimate não retornado na API para cliente

  // Faturamento
  gatilhoFaturamento: GatilhoFaturamentoEnum.optional(),
  percentualSinal: z.number().optional(),
  marcosPagamento: z.any().optional(),
  formaPagamentoPreferida: FormaPagamentoEnum.optional(),
  instrucoesPagamento: z.string().optional(),
  multaAtraso: z.string().optional(),
  descontosCondicionais: z.string().optional(),

  // Status e fluxo
  status: StatusPropostaEnum,
  enviadaParaOCliente: z.string().optional(),
  tokenPublico: z.string().optional(),
  tokenExpiresAt: z.string().optional(),

  // Assinaturas
  assinaturaTipo: TipoAssinaturaEnum.optional(),
  assinaturaCliente: z.string().optional(),
  assinadaEm: z.string().optional(),
  assinaturaResponsavel: z.string().optional(),
  aprovacaoInternaTecnica: z.boolean().optional(),
  aprovacaoInternaFinanceira: z.boolean().optional(),

  // Observações
  observacoesParaCliente: z.string().optional(),
  // observacoesInternas não retornado na API para cliente
  riscosIdentificados: z.string().optional(),

  // Timestamps
  criadoEm: z.string(),
  atualizadoEm: z.string(),

  // Relacionamentos
  cliente: z.object({
    id: z.number(),
    nomeCompleto: z.string().optional(),
    razaoSocial: z.string().optional(),
    email: z.string()
  }).optional(),

  etapas: z.array(z.object({
    id: z.number(),
    servico: z.string(),
    descricao: z.string(),
    quantidade: z.number().optional(),
    unidade: z.string().optional(),
    duracaoEstimadaHoras: z.number().optional(),
    custoMaoObraEstimado: z.union([z.number(), z.string()]).optional(), // Mascarado por RBAC
    status: StatusEtapaPropostaEnum,
    ordem: z.number(),
    dependencias: z.string().optional()
  })).optional(),

  materiais: z.array(z.object({
    id: z.number(),
    codigo: z.string().optional(),
    nome: z.string(),
    quantidade: z.number(),
    unidade: z.string().optional(),
    status: StatusMaterialPropostaEnum,
    observacao: z.string().optional(),
    precoUnitario: z.union([z.number(), z.string()]).optional(), // Mascarado por RBAC
    fornecedorPreferencial: z.string().optional(),
    totalItem: z.union([z.number(), z.string()]).optional() // Mascarado por RBAC
  })).optional(),

  anexos: z.array(z.object({
    id: z.number(),
    filename: z.string(),
    mime: z.string(),
    privado: z.boolean().optional(),
    descricao: z.string().optional(),
    criadoEm: z.string()
  })).optional(),

  // Metadados para UI
  canViewInternalValues: z.boolean().optional(),
  canEdit: z.boolean().optional(),
  canApprove: z.boolean().optional()
});

// Tipos TypeScript derivados
export type CreatePropostaInput = z.infer<typeof createPropostaSchema>;
export type UpdatePropostaInput = z.infer<typeof updatePropostaSchema>;
export type PropostaFilters = z.infer<typeof propostaFiltersSchema>;
export type AssinaturaClienteInput = z.infer<typeof assinaturaClienteSchema>;
export type AprovarPropostaInput = z.infer<typeof aprovarPropostaSchema>;
export type CancelarPropostaInput = z.infer<typeof cancelarPropostaSchema>;
export type EnviarPropostaInput = z.infer<typeof enviarPropostaSchema>;
export type UploadAnexoInput = z.infer<typeof uploadAnexoSchema>;
export type PropostaResponse = z.infer<typeof propostaResponseSchema>;
export type InternalEstimate = z.infer<typeof internalEstimateSchema>;
export type MarcosPagamento = z.infer<typeof marcosPagamentoSchema>;
export type OpcoesAlternativas = z.infer<typeof opcoesAlternativasSchema>;
