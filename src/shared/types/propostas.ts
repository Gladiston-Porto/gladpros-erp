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
  StatusProposta,
  StatusPermite,
  StatusEtapaProposta,
  StatusMaterialProposta
} from "./prisma-temp";

import { StatusPropostaValues, StatusPermiteValues } from "./prisma-temp";

// Re-export values for convenience
export { StatusPropostaValues, StatusPermiteValues };

// Main types with relations for UI components
export type PropostaWithRelations = Proposta & {
  cliente: Pick<Cliente, 'id' | 'nomeCompleto' | 'email' | 'razaoSocial'>;
  etapas: PropostaEtapa[];
  materiais: PropostaMaterial[];
  anexos: AnexoProposta[];
  logs?: (PropostaLog & {
      usuario?: Pick<Usuario, 'id' | 'nomeCompleto' | 'email'>
  })[];
  projeto?: Projeto & {
    cliente: Pick<Cliente, 'id' | 'nomeCompleto'>
  };
};

export type PropostaWithDetails = PropostaWithRelations;

// Form types for create/update operations
export interface CreatePropostaRequest {
  clienteId: string;
  descricao: string;
  detalhes?: string;
  valorEstimado: number;
  permite?: StatusPermite;
  quaisPermites?: string;
  etapas: CreateEtapaRequest[];
  materiais: CreateMaterialRequest[];
}

export interface UpdatePropostaRequest extends Partial<CreatePropostaRequest> {
  status?: StatusProposta;
}

export interface CreateEtapaRequest {
  titulo: string;
  descricao?: string;
  valorEstimado: number;
  ordem: number;
  status?: StatusEtapaProposta;
  dataInicio?: Date;
  dataFim?: Date;
}

export interface CreateMaterialRequest {
  nome: string;
  descricao?: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  fornecedor?: string;
  observacoes?: string;
  status?: StatusMaterialProposta;
}

// Filter types
export interface PropostaFilters {
  busca?: string;
  status?: StatusProposta;
  clienteId?: string;
  dataInicio?: string;
  dataFim?: string;
  valorMin?: number;
  valorMax?: number;
}

// Pagination types
export interface PropostaPagination {
  cursor?: string;
  limit?: number;
}

export interface PropostaListResponse {
  propostas: PropostaWithRelations[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

// Signature types
export interface PropostaSignature {
  canvas: string; // Base64 canvas data
  confirmed: boolean; // Checkbox confirmation
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface SignatureRequest {
  propostaId: string;
  signature: PropostaSignature;
  responsavelNome: string;
  responsavelCargo: string;
  responsavelEmail?: string;
}

// Approval types
export interface ApprovalRequest {
  propostaId: string;
  observacoes?: string;
  criarProjeto: boolean;
  manterEstoque: boolean;
}

export interface ProjetoFromPropostaData {
  nome: string;
  descricao: string;
  clienteId: string;
  valorOrcado: number;
  dataInicio: Date;
  prazoEstimado?: Date;
}

// Export types
export interface ExportJob {
  id: string;
  type: 'sync' | 'async';
  format: 'csv' | 'excel' | 'pdf';
  filters: PropostaFilters;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// RBAC types
export interface PropostaPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSend: boolean;
  canApprove: boolean;
  canViewValue: boolean; // Permissão para ver valorEstimado
  canSignAsResponsible: boolean;
}

// Configuration constants
export const PAGINATION_CONFIG = {
  DEFAULT_LIMIT: parseInt(process.env.PAGINATION_LIMIT || '20'),
  MAX_LIMIT: parseInt(process.env.PAGINATION_MAX_LIMIT || '100'),
  MAX_EXPORT_SYNC: parseInt(process.env.EXPORT_MAX_SYNC || '5000'),
  MAX_EXPORT_ASYNC: parseInt(process.env.EXPORT_MAX_ASYNC || '50000'),
  MAX_EXPORT_FILTERED: parseInt(process.env.EXPORT_MAX_FILTERED || '1000000'),
} as const;

// Storage configuration
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

// Status mappings
export const STATUS_LABELS: Record<StatusProposta, string> = {
  RASCUNHO: 'Rascunho',
  PENDENTE_APROVACAO: 'Pendente Aprovação',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
  ENVIADA: 'Enviada',
  ASSINADA: 'Assinada'
} as const;

export const STATUS_COLORS: Record<StatusProposta, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-800',
  PENDENTE_APROVACAO: 'bg-orange-100 text-orange-800',
  APROVADA: 'bg-green-100 text-green-800',
  REJEITADA: 'bg-red-100 text-red-800',
  CANCELADA: 'bg-red-100 text-red-800',
  ENVIADA: 'bg-blue-100 text-blue-800',
  ASSINADA: 'bg-yellow-100 text-yellow-800'
} as const;

// Re-export Prisma types
export type {
  Proposta,
  PropostaEtapa,
  PropostaMaterial,
  AnexoProposta,
  PropostaLog,
  Cliente,
  Usuario,
  Projeto,
  StatusProposta,
  StatusPermite,
  StatusEtapaProposta,
  StatusMaterialProposta
};

// Additional types from proposta.ts (non-duplicates)
export type PropostaListItem = Proposta & {
  cliente: Pick<Cliente, 'id' | 'nomeCompleto' | 'razaoSocial' | 'email'>;
  _count?: {
    etapas: number;
    materiais: number;
    anexos: number;
  };
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

export type PropostaForClient = Omit<PropostaWithDetails, 'valorEstimado'> & {
  valorEstimado?: string;
  canViewValue?: boolean;
};

export type PropostaLogEntry = {
  action: string;
  actor: string;
  timestamp: Date;
  changes?: Record<string, { from: unknown; to: unknown }>;
  ip?: string;
  userAgent?: string;
};

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

export interface PropostaEtapaWithDetails extends PropostaEtapa {
  materiais: PropostaMaterialWithDetails[]
}

export type PropostaMaterialWithDetails = PropostaMaterial;

export type AnexoPropostaWithDetails = AnexoProposta;

export interface PropostaLogWithDetails extends PropostaLog {
  usuario: Usuario
}

export interface ProjetoWithDetails extends Projeto {
  cliente: Cliente
  proposta: Proposta
}

// Tipos adicionais do arquivo propostas.ts para compatibilidade
export enum AcaoPropostaLog {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  SENT = 'SENT',
  SIGNED = 'SIGNED',
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED',
  ATTACH_ADDED = 'ATTACH_ADDED',
  ATTACH_REMOVED = 'ATTACH_REMOVED'
}
