export type TipoCliente = 'PF' | 'PJ'
export type TipoDocumentoPF = 'SSN' | 'ITIN'
export type StatusCliente = 'ATIVO' | 'INATIVO'

export interface Cliente {
  id: number
  tipo: TipoCliente
  nomeCompleto: string | null
  razaoSocial: string | null
  nomeFantasia: string | null
  email: string
  telefone: string
  nomeChave: string
  endereco: string | null
  apartamentoUnidade: string | null
  status: StatusCliente
  // Campos para mercado americano
  tipoDocumentoPF: TipoDocumentoPF | null // SSN ou ITIN para PF
  ssn: string | null // SSN para PF
  itin: string | null // ITIN para PF
  ein: string | null // EIN para PJ
  documentoEnc: string | null
  docLast4: string | null
  docHash: string | null
  observacoes: string | null
  ativo: boolean
  criadoEm: Date
  atualizadoEm: Date
}

export interface ClienteDTO {
  id: number
  tipo: TipoCliente
  nomeCompletoOuRazao: string
  email: string
  telefone: string
  endereco: string | null
  apartamentoUnidade: string | null
  addressStreet?: string | null
  addressUnit?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressZip?: string | null
  addressCounty?: string | null
  documentoMasked: string
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
  // Legacy / computed address fields
  cidade: string | null
  estado: string | null
  // Campos condicionais baseados no tipo
  nomeCompleto?: string | null
  razaoSocial?: string | null
  nomeFantasia?: string | null
  endereco1?: string | null
  endereco2?: string | null
  observacoes?: string | null
  // Campos para mercado americano
  tipoDocumentoPF?: TipoDocumentoPF | null
  ssn?: string | null
  itin?: string | null
  ein?: string | null
}

export interface ClienteCreateInput {
  tipo: TipoCliente
  nomeCompleto?: string | null
  razaoSocial?: string | null
  nomeFantasia?: string | null
  email: string
  telefone: string
  // Endereço Completo
  addressStreet?: string | null
  addressUnit?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressZip?: string | null
  addressCounty?: string | null

  // Deprecated / Legacy
  endereco?: string | null
  apartamentoUnidade?: string | null

  // Campos para mercado americano - condicionais
  tipoDocumentoPF?: TipoDocumentoPF | null // Para PF
  ssn?: string | null // Para PF quando tipoDocumentoPF = 'SSN'
  itin?: string | null // Para PF quando tipoDocumentoPF = 'ITIN'
  ein?: string | null // Para PJ
  observacoes?: string | null
}

export interface ClienteUpdateInput extends Partial<ClienteCreateInput> {
  ativo?: boolean
}

export interface ClienteFilters {
  q?: string
  tipo?: TipoCliente | 'all'
  ativo?: boolean | 'all'
  addressCity?: string
  addressState?: string
  addressCounty?: string
  page?: number
  pageSize?: number
  sortKey?: 'nome' | 'tipo' | 'email' | 'telefone' | 'documento' | 'cidadeEstado' | 'status' | 'criadoEm'
  sortDir?: 'asc' | 'desc'
}

export interface ClienteListResponse {
  data: ClienteDTO[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface AuditLogEntry {
  id: string
  userId: string
  entidade: string
  entidadeId: string
  acao: string
  diff: Record<string, unknown>
  createdAt: string
}
