// src/lib/services/proposta-rbac.ts

import { can, type Role } from "@/shared/lib/rbac-core"

export interface UserPermissions {
  canViewInternalValues: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canViewAllPropostas: boolean;
  isAdmin: boolean;
  userId?: number;
}

export interface PropostaContext {
  isClientView: boolean; // Visualização pelo cliente (token público)
  isAfterSignature: boolean; // Após assinatura (valores devem ser mascarados)
  userPermissions: UserPermissions;
}

const MASKED_NUMBER = "***.**";

/**
 * Determina permissões do usuário baseado no role real do sistema RBAC.
 * @param role - Role do usuário (ex: 'ADMIN', 'GERENTE', 'FINANCEIRO', 'CLIENTE')
 * @param userId - ID do usuário (opcional, para filtros futuros)
 */
export function getUserPermissions(role: string, userId?: number): UserPermissions {
  const r = role as Role;
  const isAdmin = role === 'ADMIN';

  // Apenas usuários internos com acesso a propostas veem valores e dados internos
  const hasPropostaAccess = can(r, 'propostas', 'read');

  return {
    canViewInternalValues: hasPropostaAccess,
    canEdit: can(r, 'propostas', 'update'),
    canApprove: can(r, 'propostas', 'update'),
    canViewAllPropostas: hasPropostaAccess,
    isAdmin,
    userId
  };
}

/**
 * Determina contexto da visualização da proposta
 */
export function getPropostaContext(
  proposta: { status: string },
  isClientView: boolean,
  userPermissions: UserPermissions
): PropostaContext {
  const isAfterSignature = proposta.status === 'ASSINADA' || proposta.status === 'APROVADA';
  
  return {
    isClientView,
    isAfterSignature,
    userPermissions
  };
}

/**
 * Determina se um valor deve ser mascarado
 */
function shouldMaskValue(context: PropostaContext): boolean {
  // Cliente sempre tem valores mascarados após assinatura
  if (context.isClientView && context.isAfterSignature) {
    return true;
  }
  
  // Cliente nunca vê valores internos
  if (context.isClientView) {
    return false; // Durante assinatura, cliente vê valores
  }
  
  // Usuários internos: apenas mascarar se não tiver permissão
  return !context.userPermissions.canViewInternalValues;
}

/**
 * Determina se valores internos devem ser incluídos
 */
function shouldIncludeInternalValues(context: PropostaContext): boolean {
  if (context.isClientView) {
    return false; // Cliente nunca vê valores internos
  }
  
  return context.userPermissions.canViewInternalValues;
}

/**
 * Mascara um valor numérico
 */
function maskNumericValue(value: number | null | undefined): string | number | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }
  return MASKED_NUMBER;
}

/**
 * Mascara uma etapa conforme contexto
 */
function maskEtapa(etapa: { custoMaoObraEstimado?: number | null }, context: PropostaContext): { custoMaoObraEstimado?: unknown } {
  const shouldMask = shouldMaskValue(context);

  return {
    ...etapa,
    custoMaoObraEstimado: shouldMask
      ? maskNumericValue(etapa.custoMaoObraEstimado)
      : etapa.custoMaoObraEstimado
  };
}

/**
 * Mascara um material conforme contexto
 */
function maskMaterial(material: { precoUnitario?: number | null; totalItem?: number | null }, context: PropostaContext): { precoUnitario?: unknown; totalItem?: unknown } {
  const shouldMask = shouldMaskValue(context);

  return {
    ...material,
    precoUnitario: shouldMask
      ? maskNumericValue(material.precoUnitario)
      : material.precoUnitario,
    totalItem: shouldMask
      ? maskNumericValue(material.totalItem)
      : material.totalItem
  };
}

/**
 * Aplica mascaramento RBAC a uma proposta completa
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyRBACMasking(proposta: any, context: PropostaContext): any {
  const shouldMask = shouldMaskValue(context);
  const includeInternal = shouldIncludeInternalValues(context);
  
  const masked = {
    ...proposta,
    
    // Valores principais
    valorEstimado: shouldMask 
      ? maskNumericValue(proposta.valorEstimado)
      : proposta.valorEstimado,
    precoPropostaCliente: shouldMask 
      ? maskNumericValue(proposta.precoPropostaCliente)
      : proposta.precoPropostaCliente,
    
    // Estimativas internas - remover completamente se não tiver permissão
    internalEstimate: includeInternal ? proposta.internalEstimate : undefined,
    
    // Observações internas
    observacoesInternas: includeInternal ? proposta.observacoesInternas : undefined,
    
    // Campos de auditoria interna
    criadoPor: includeInternal ? proposta.criadoPor : undefined,
    atualizadoPor: includeInternal ? proposta.atualizadoPor : undefined,
    
    // Etapas com mascaramento
    etapas: proposta.etapas?.map((etapa: Record<string, unknown>) => maskEtapa(etapa, context)),
    
    // Materiais com mascaramento  
    materiais: proposta.materiais?.map((material: Record<string, unknown>) => maskMaterial(material, context)),
    
    // Anexos - filtrar privados para cliente
    anexos: context.isClientView 
      ? proposta.anexos?.filter((anexo: Record<string, unknown>) => typeof anexo.privado === 'boolean' && !anexo.privado)
      : proposta.anexos,
    
    // Metadados de permissão para a UI
    canViewInternalValues: context.userPermissions.canViewInternalValues,
    canEdit: context.userPermissions.canEdit,
    canApprove: context.userPermissions.canApprove,
  };
  
  return masked;
}

/**
 * Filtra lista de propostas por permissões do usuário
 */
export function filterPropostasByPermissions(
  propostas: Record<string, unknown>[],
  userPermissions: UserPermissions
): Record<string, unknown>[] {
  if (userPermissions.canViewAllPropostas) {
    return propostas;
  }
  
  // Filtrar apenas propostas do usuário (se implementado)
  // Por enquanto, retorna todas - implementar filtro por criador/responsável depois
  return propostas;
}

/**
 * Valida se usuário pode acessar uma proposta específica
 */
export function canAccessProposta(
  proposta: Record<string, unknown>,
  userPermissions: UserPermissions
): boolean {
  if (userPermissions.canViewAllPropostas) {
    return true;
  }
  
  // Implementar lógica específica:
  // - Criador pode ver
  // - Responsável pode ver  
  // - Proposta do cliente do usuário pode ver
  
  return true; // Por enquanto, permite acesso
}

/**
 * Valida se usuário pode editar uma proposta
 */
export function canEditProposta(
  proposta: Record<string, unknown>,
  userPermissions: UserPermissions
): boolean {
  if (!userPermissions.canEdit) {
    return false;
  }
  
  // Não pode editar se já foi assinada/aprovada
  if (typeof proposta.status === 'string' && ['ASSINADA', 'APROVADA'].includes(proposta.status)) {
    return false;
  }
  
  return true;
}

/**
 * Valida se usuário pode aprovar uma proposta
 */
export function canApproveProposta(
  proposta: Record<string, unknown>,
  userPermissions: UserPermissions
): boolean {
  if (!userPermissions.canApprove) {
    return false;
  }
  
  // Só pode aprovar se estiver assinada
  return typeof proposta.status === 'string' && proposta.status === 'ASSINADA';
}
