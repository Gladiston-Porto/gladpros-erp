// Tipos globais compartilhados entre módulos
export * from './api';
export * from './global';
export * from './auditoria';

// Tipos específicos de cliente
export type { Cliente } from './cliente';

// Tipos específicos de proposta
export type {
  AnexoPropostaWithDetails,
  ETAPA_STATUS,
  ExportJob,
  MATERIAL_STATUS,
  PAGINATION_CONFIG,
  PERMITE_OPTIONS,
  PROPOSTA_STATUS,
  ProjetoWithDetails,
  PropostaEtapaWithDetails,
  PropostaFilters,
  PropostaForClient,
  PropostaListItem,
  PropostaLogEntry,
  PropostaLogWithDetails,
  PropostaMaterialWithDetails,
  PropostaPermissions,
  PropostaStats,
  PropostaWithDetails,
  PropostaWithRelations
} from './proposta';

// Tipos de propostas (arquivo separado)
export * from './propostas';

// Tipos específicos do sistema
export interface AppUser {
  id: number;
  email: string;
  nomeCompleto: string;
  role: 'ADMIN' | 'GERENTE' | 'USUARIO' | 'FINANCEIRO' | 'ESTOQUE' | 'CLIENTE';
  status: 'ATIVO' | 'INATIVO' | 'SUSPENSO';
  telefone?: string;
  dataNascimento?: string;
  endereco1?: string;
  endereco2?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  anotacoes?: string;
  ultimoLoginEm?: string;
  criadoEm: string;
  atualizadoEm: string;
  avatarUrl?: string;
}

 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}