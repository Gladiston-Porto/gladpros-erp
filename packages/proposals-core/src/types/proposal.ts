// packages/proposals-core/src/types/proposal.ts
export type StatusProposta =
  | 'rascunho'
  | 'enviada'
  | 'visualizada'
  | 'aprovada'
  | 'rejeitada'
  | 'expirada'
  | 'cancelada';

export interface Proposta {
  id: string;
  numeroProposta: string;
  titulo: string;
  descricao?: string;
  status: StatusProposta;
  valorEstimado: number;
  precoPropostaCliente?: number;
  validadeProposta?: Date;
  criadoEm: Date;
  atualizadoEm: Date;
  assinadoEm?: Date;
  clienteId: string;
  contatoNome?: string;
  contatoEmail?: string;
  localExecucaoEndereco?: string;
  observacoes?: string;
  termosCondicoes?: string;
  token: string;
  versao: number;
}

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

export interface ItemProposta {
  id: string;
  propostaId: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  ordem: number;
}

export interface CreatePropostaData {
  titulo: string;
  descricao?: string;
  clienteId: string;
  contatoNome?: string;
  contatoEmail?: string;
  localExecucaoEndereco?: string;
  valorEstimado: number;
  validadeProposta?: Date;
  observacoes?: string;
  termosCondicoes?: string;
  itens?: Omit<ItemProposta, 'id' | 'propostaId'>[];
}

export interface UpdatePropostaData {
  titulo?: string;
  descricao?: string;
  status?: StatusProposta;
  valorEstimado?: number;
  precoPropostaCliente?: number;
  validadeProposta?: Date;
  contatoNome?: string;
  contatoEmail?: string;
  localExecucaoEndereco?: string;
  observacoes?: string;
  termosCondicoes?: string;
}

export interface PropostaFilters {
  status?: StatusProposta | 'all';
  clienteId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
  sortBy?: 'numeroProposta' | 'titulo' | 'cliente' | 'status' | 'valor' | 'criadoEm';
  sortDir?: 'asc' | 'desc';
}

export interface PropostaListResponse {
  data: (Proposta & { cliente: Cliente })[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PropostaStats {
  total: number;
  porStatus: Record<StatusProposta, number>;
  valorTotal: number;
  valorMedio: number;
  taxaConversao: number;
}
