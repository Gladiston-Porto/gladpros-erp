// Tipos temporários baseados no schema Prisma atual
import type {
  Proposta,
  PropostaEtapa,
  PropostaMaterial,
  AnexoProposta,
  PropostaLog,
  Cliente,
  Usuario,
  Projeto
} from '@prisma/client';

// Re-export types from Prisma
export type {
  Proposta,
  PropostaEtapa,
  PropostaMaterial,
  AnexoProposta,
  PropostaLog,
  Cliente,
  Usuario,
  Projeto
};

export type StatusProposta = 'RASCUNHO' | 'ENVIADA' | 'ASSINADA' | 'APROVADA' | 'CANCELADA' | 'PENDENTE_APROVACAO' | 'REJEITADA';
export type StatusPermite = 'SIM' | 'NAO' | 'NAO_NECESSARIO' | 'NECESSARIO' | 'OBTIDO';

// Enums como valores (não apenas tipos)
export const StatusPropostaValues = {
  RASCUNHO: 'RASCUNHO' as const,
  ENVIADA: 'ENVIADA' as const,
  ASSINADA: 'ASSINADA' as const,
  APROVADA: 'APROVADA' as const,
  CANCELADA: 'CANCELADA' as const,
  PENDENTE_APROVACAO: 'PENDENTE_APROVACAO' as const,
  REJEITADA: 'REJEITADA' as const,
};

export const StatusPermiteValues = {
  SIM: 'SIM' as const,
  NAO: 'NAO' as const,
  NAO_NECESSARIO: 'NAO_NECESSARIO' as const,
  NECESSARIO: 'NECESSARIO' as const,
  OBTIDO: 'OBTIDO' as const,
};

// Tipos de status para etapas e materiais
export type StatusEtapaProposta = 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA';
export type StatusMaterialProposta = 'PLANEJADO' | 'SUBSTITUIDO' | 'REMOVIDO';