// src/types/proposta.ts
import type { 
  Proposta, 
  PropostaEtapa, 
  PropostaMaterial, 
  AnexoProposta, 
  PropostaLog, 
  Cliente,
  Usuario,
  Projeto,
} from "./prisma-temp";

export type PropostaWithDetails = Proposta & {
  cliente: Pick<Cliente, 'id' | 'nomeCompleto' | 'razaoSocial' | 'email'>;
  etapas: PropostaEtapa[];
  materiais: PropostaMaterial[];
  anexos: AnexoProposta[];
  logs?: PropostaLog[];
};

export type PropostaListItem = Proposta & {
  cliente: Pick<Cliente, 'id' | 'nomeCompleto' | 'razaoSocial' | 'email'>;
  _count?: {
    etapas: number;
    materiais: number;
    anexos: number;
  };
};

export type PropostaFilters = {
  status?: string;
  clienteId?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
  sortKey?: 'dataCriacao' | 'numeroProposta' | 'status' | 'valorEstimado';
  sortDir?: 'asc' | 'desc';
};

export type PropostaStats = {
  total: number;
  rascunho: number;
  enviada: number;
  assinada: number;
  aprovada: number;
  cancelada: number;
  valorTotalEstimado: number;
};

export type ExportJob = {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  format: 'csv' | 'xlsx' | 'pdf';
  filters: PropostaFilters;
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
};

// Tipos para mascaramento de valores
export type PropostaForClient = Omit<PropostaWithDetails, 'valorEstimado'> & {
  valorEstimado?: string; // Mascarado como "xxxx.xx" após assinatura
  canViewValue?: boolean; // Se o cliente pode ver o valor não mascarado
};

// Tipos para auditoria e logs
export type PropostaLogEntry = {
  action: string;
  actor: string;
  timestamp: Date;
  // Use `unknown` for change payloads; callers should narrow before use
  changes?: Record<string, { from: unknown; to: unknown }>;
  ip?: string;
  userAgent?: string;
};

// Constantes do módulo
export const PROPOSTA_STATUS = {
  RASCUNHO: 'RASCUNHO',
  ENVIADA: 'ENVIADA', 
  ASSINADA: 'ASSINADA',
  APROVADA: 'APROVADA',
  CANCELADA: 'CANCELADA'
} as const;

export const PERMITE_OPTIONS = {
  SIM: 'SIM',
  NAO: 'NAO'
} as const;

export const ETAPA_STATUS = {
  PLANEJADA: 'PLANEJADA',
  EM_ANDAMENTO: 'EM_ANDAMENTO',
  CONCLUIDA: 'CONCLUIDA'
} as const;

export const MATERIAL_STATUS = {
  PLANEJADO: 'PLANEJADO',
  SUBSTITUIDO: 'SUBSTITUIDO',
  REMOVIDO: 'REMOVIDO'
} as const;

// Configurações de paginação e exportação
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: parseInt(process.env.PAGE_SIZE_DEFAULT || '25'),
  MAX_PAGE_SIZE: parseInt(process.env.PAGE_SIZE_MAX || '100'),
  EXPORT_SYNC_MAX_ROWS: parseInt(process.env.EXPORT_SYNC_MAX_ROWS || '5000'),
  EXPORT_ASYNC_MAX_ROWS: parseInt(process.env.EXPORT_ASYNC_MAX_ROWS || '50000'),
  EXPORT_TIMEOUT_MS: parseInt(process.env.EXPORT_TIMEOUT_MS || '120000')
} as const;

// Tipos para RBAC e permissões
export type PropostaPermissions = {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSend: boolean;
  canApprove: boolean;
  canViewValue: boolean; // Permissão para ver valorEstimado
  canSignAsResponsible: boolean;
};

// Configurações de storage
export const STORAGE_CONFIG = {
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads/propostas',
  EXPORT_DIR: process.env.EXPORT_DIR || 'exports',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
} as const;

// Alias for components compatibility
export type PropostaWithRelations = PropostaWithDetails

export interface PropostaEtapaWithDetails extends PropostaEtapa {
  materiais: PropostaMaterialWithDetails[]
}

export interface PropostaMaterialWithDetails extends PropostaMaterial {
  // Add any additional fields needed for detailed views
}

export interface AnexoPropostaWithDetails extends AnexoProposta {
  // Add any additional fields needed for detailed views
}

export interface PropostaLogWithDetails extends PropostaLog {
  usuario: Usuario
}

export interface ProjetoWithDetails extends Projeto {
  cliente: Cliente
  proposta: Proposta
}
