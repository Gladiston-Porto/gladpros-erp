/**
 * API Authentication Helpers
 * 
 * @deprecated New code should use requireUser from @/shared/lib/rbac directly.
 * These wrappers delegate to requireUser internally and exist for backward
 * compatibility with the dict-return pattern used by existing routes.
 * 
 * Benefits of delegation:
 * - Single source of truth: jose JWT verification via requireUser
 * - DB-backed: token version check + user status check
 * - Consistent role from DB (not stale token claims)
 */

import { NextRequest } from 'next/server';
import { unauthorizedResponse, forbiddenResponse } from './responses';
import { requireUser } from '@/shared/lib/rbac';

/**
 * Payload do JWT (interface de compatibilidade)
 * @deprecated Use the return type of requireUser instead
 */
export interface JWTPayload {
  id: number;
  email: string;
  nome: string;
  papel: string;
  iat: number;
  exp: number;
}

/**
 * Extrai o usuário autenticado da requisição.
 * @deprecated Use requireUser from @/shared/lib/rbac directly.
 * Delegates to requireUser for DB-backed auth with token version check.
 */
export async function getAuthUser(request: NextRequest): Promise<JWTPayload | null> {
  try {
    const user = await requireUser(request);
    return {
      id: Number(user.id),
      email: user.email ?? '',
      nome: user.nome ?? '',
      papel: user.role,
      iat: 0,
      exp: 0,
    };
  } catch {
    return null;
  }
}

/**
 * Middleware de autenticação
 * Retorna usuário ou NextResponse de erro
 */
export async function requireAuth(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    return {
      error: unauthorizedResponse('Token inválido ou expirado'),
      user: null
    };
  }

  return { user, error: null };
}

/**
 * Verifica se usuário tem papel específico
 */
export function hasRole(user: JWTPayload, roles: string[]): boolean {
  return roles.includes(user.papel);
}

/**
 * Middleware de autorização por papel
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
) {
  const { user, error } = await requireAuth(request);

  if (error) {
    return { user: null, error };
  }

  if (!user || !hasRole(user, allowedRoles)) {
    return {
      user: null,
      error: forbiddenResponse(
        'Você não tem permissão para acessar este recurso'
      )
    };
  }

  return { user, error: null };
}

/**
 * Middleware de autorização por papéis (versão que lança exceção)
 * Usado em APIs onde queremos abortar imediatamente se não autorizado
 */
export async function requireRoles(
  request: NextRequest,
  allowedRoles: string[]
): Promise<void> {
  const user = await getAuthUser(request);

  if (!user) {
    throw new Error('Não autenticado');
  }

  if (!hasRole(user, allowedRoles)) {
    throw new Error('Sem permissão para este recurso');
  }
}

/**
 * Papéis de usuário (valores consistentes com o banco de dados)
 */
export const UserRoles = {
  ADMIN: 'ADMIN',           // DB: nivel = 'ADMIN'
  GERENTE: 'GERENTE',       // DB: nivel = 'GERENTE'
  USUARIO: 'USUARIO',       // DB: nivel = 'USUARIO'
  FINANCEIRO: 'FINANCEIRO', // DB: nivel = 'FINANCEIRO'
  ESTOQUE: 'ESTOQUE',       // DB: nivel = 'ESTOQUE'
  CLIENTE: 'CLIENTE',       // DB: nivel = 'CLIENTE'
} as const;

export type UserRole = typeof UserRoles[keyof typeof UserRoles];

/**
 * Permissões por módulo
 */
export const EstoquePermissions = {
  // Geral (usado por várias rotas)
  VIEW: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE, UserRoles.USUARIO],
  MANAGE: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE],

  // Materiais
  VIEW_MATERIAIS: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE, UserRoles.USUARIO],
  CREATE_MATERIAIS: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE],
  EDIT_MATERIAIS: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE],
  DELETE_MATERIAIS: [UserRoles.ADMIN, UserRoles.GERENTE],

  // Equipamentos
  VIEW_EQUIPAMENTOS: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE, UserRoles.USUARIO],
  CREATE_EQUIPAMENTOS: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE],
  EDIT_EQUIPAMENTOS: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE],
  DELETE_EQUIPAMENTOS: [UserRoles.ADMIN, UserRoles.GERENTE],

  // Movimentações
  VIEW_MOVIMENTACOES: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE, UserRoles.USUARIO],
  CREATE_MOVIMENTACOES: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE],
  MOVE: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE], // Alias for CREATE_MOVIMENTACOES

  // Compras
  VIEW_COMPRAS: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE, UserRoles.FINANCEIRO],
  CREATE_COMPRAS: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE],
  EDIT_COMPRAS: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE],
  DELETE_COMPRAS: [UserRoles.ADMIN, UserRoles.GERENTE],
  RECEIVE_COMPRAS: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE],
  PURCHASE: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE], // Alias for RECEIVE_COMPRAS

  // Relatórios
  VIEW_RELATORIOS: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE, UserRoles.FINANCEIRO],
  EXPORT_RELATORIOS: [UserRoles.ADMIN, UserRoles.GERENTE],

  // Alertas
  VIEW_ALERTAS: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE],
  RESOLVE_ALERTAS: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE],

  // Dashboard
  VIEW_DASHBOARD: [UserRoles.ADMIN, UserRoles.GERENTE, UserRoles.ESTOQUE],
} as const;

/**
 * Verifica permissão específica
 */
export function hasPermission(
  user: JWTPayload,
  permission: UserRole[]
): boolean {
  return permission.includes(user.papel as UserRole);
}

/**
 * Middleware de autorização por permissão
 */
export async function requirePermission(
  request: NextRequest,
  permission: UserRole[]
) {
  const { user, error } = await requireAuth(request);

  if (error) {
    return { user: null, error };
  }

  if (!user || !hasPermission(user, permission)) {
    return {
      user: null,
      error: forbiddenResponse(
        'Você não tem permissão para realizar esta ação'
      )
    };
  }

  return { user, error: null };
}

/**
 * Wrapper para fetch autenticado (client-side)
 * Útil para autocompletar imports em client.ts
 */
export async function authenticatedFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  // Em Next.js com cookies, o browser envia cookies automaticamente.
  // Apenas garantimos passagem dos parâmetros.
  return fetch(input, init);
}
