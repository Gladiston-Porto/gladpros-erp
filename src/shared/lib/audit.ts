/**
 * Sistema Unificado de Auditoria (F4.5)
 *
 * Consolida três implementações anteriores:
 * - AuditLogger    (este arquivo — auth/login, auth/unlock)
 * - AuditoriaService (src/shared/lib/auditoria.ts — usuarios, first-access)
 * - AuditService     (src/services/auditService.ts — clientes)
 *
 * Grava na tabela `Auditoria` (Prisma Client, enum tipado, suporte a IP).
 * Exporta aliases backward-compatible para migração gradual.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

export interface AuditEvent {
  userId?: number;
  userEmail?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  timestamp?: Date;
}

export class AuditLogger {
  static async log(event: AuditEvent): Promise<void> {
    try {
      // Log no console para desenvolvimento
      console.log(`[AUDIT] ${event.status} - ${event.action}`, {
        user: event.userEmail || `ID:${event.userId}` || 'Anonymous',
        resource: event.resource ? `${event.resource}${event.resourceId ? `:${event.resourceId}` : ''}` : undefined,
        ip: event.ip,
        details: event.details,
        timestamp: event.timestamp || new Date()
      });

      // Mapear ação para enum do Prisma
      let acaoEnum: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' = 'LOGIN';
      
      switch (event.action) {
        case 'LOGIN_ATTEMPT':
        case 'LOGIN':
          acaoEnum = 'LOGIN';
          break;
        case 'LOGOUT':
          acaoEnum = 'LOGOUT';
          break;
        case 'CREATE':
        case 'CREATE_USER':
          acaoEnum = 'CREATE';
          break;
        case 'UPDATE':
        case 'UPDATE_USER':
          acaoEnum = 'UPDATE';
          break;
        case 'DELETE':
        case 'DELETE_USER':
          acaoEnum = 'DELETE';
          break;
        default:
          acaoEnum = 'LOGIN'; // Fallback
      }

      // Salvar usando o modelo Auditoria do Prisma
      await prisma.auditoria.create({
        data: {
          tabela: event.resource || 'system',
          registroId: event.resourceId ? parseInt(event.resourceId) : 0,
          acao: acaoEnum,
          usuarioId: event.userId || null,
          ip: event.ip || null,
          payload: event.details ? JSON.stringify({
            action: event.action,
            status: event.status,
            userAgent: event.userAgent,
            ...event.details
          }) : undefined
        }
      }).catch((error) => {
        console.error('[AUDIT] Erro ao salvar no modelo Auditoria:', error);
      });

    } catch (error) {
      console.error('[AUDIT] Erro no sistema de auditoria:', error);
    }
  }

  // Helpers para extrair informações da request
  static getClientInfo(req: NextRequest) {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               req.headers.get('x-real-ip') || 
               req.headers.get('cf-connecting-ip') || 
               'unknown';
    
    const userAgent = req.headers.get('user-agent') || 'unknown';

    return { ip, userAgent };
  }

  // Logs específicos para diferentes ações
  static async logLogin(userId: number, email: string, req: NextRequest, success: boolean, details?: Record<string, unknown>) {
    const { ip, userAgent } = this.getClientInfo(req);
    
    await this.log({
      userId,
      userEmail: email,
      action: 'LOGIN_ATTEMPT',
      details: {
        success,
        ...details
      },
      ip,
      userAgent,
      status: success ? 'SUCCESS' : 'FAILURE'
    });
  }

  static async logLogout(userId: number, email: string, req: NextRequest) {
    const { ip, userAgent } = this.getClientInfo(req);
    
    await this.log({
      userId,
      userEmail: email,
      action: 'LOGOUT',
      ip,
      userAgent,
      status: 'SUCCESS'
    });
  }

  static async logMFA(userId: number, email: string, req: NextRequest, success: boolean, attempts: number) {
    const { ip, userAgent } = this.getClientInfo(req);
    
    await this.log({
      userId,
      userEmail: email,
      action: 'MFA_VERIFICATION',
      details: {
        success,
        attempts,
        timestamp: new Date()
      },
      ip,
      userAgent,
      status: success ? 'SUCCESS' : 'FAILURE'
    });
  }

  static async logPasswordChange(userId: number, email: string, req: NextRequest, type: 'RESET' | 'CHANGE') {
    const { ip, userAgent } = this.getClientInfo(req);
    
    await this.log({
      userId,
      userEmail: email,
      action: 'PASSWORD_CHANGE',
      details: {
        type,
        timestamp: new Date()
      },
      ip,
      userAgent,
      status: 'SUCCESS'
    });
  }

  static async logFirstAccess(userId: number, email: string, req: NextRequest) {
    const { ip, userAgent } = this.getClientInfo(req);
    
    await this.log({
      userId,
      userEmail: email,
      action: 'FIRST_ACCESS_SETUP',
      details: {
        completedAt: new Date()
      },
      ip,
      userAgent,
      status: 'SUCCESS'
    });
  }

  static async logUnauthorizedAccess(req: NextRequest, resource: string) {
    const { ip, userAgent } = this.getClientInfo(req);
    
    await this.log({
      action: 'UNAUTHORIZED_ACCESS',
      resource,
      details: {
        attemptedUrl: req.url,
        method: req.method
      },
      ip,
      userAgent,
      status: 'WARNING'
    });
  }

  static async logDataAccess(userId: number, email: string, req: NextRequest, resource: string, resourceId?: string) {
    const { ip, userAgent } = this.getClientInfo(req);
    
    await this.log({
      userId,
      userEmail: email,
      action: 'DATA_ACCESS',
      resource,
      resourceId,
      details: {
        method: req.method,
        url: req.url
      },
      ip,
      userAgent,
      status: 'SUCCESS'
    });
  }

  static async logDataModification(userId: number, email: string, req: NextRequest, resource: string, resourceId: string, operation: 'CREATE' | 'UPDATE' | 'DELETE', changes?: Record<string, unknown>) {
    const { ip, userAgent } = this.getClientInfo(req);
    
    await this.log({
      userId,
      userEmail: email,
      action: 'DATA_MODIFICATION',
      resource,
      resourceId,
      details: {
        operation,
        changes,
        timestamp: new Date()
      },
      ip,
      userAgent,
      status: 'SUCCESS'
    });
  }

  // Buscar logs de auditoria
  static async getLogs(filters?: {
    userId?: number;
    action?: string;
    resource?: string;
    status?: 'SUCCESS' | 'FAILURE' | 'WARNING';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: Record<string, unknown> = {};
      if (filters?.userId) where.usuarioId = filters.userId;
      if (filters?.resource) where.tabela = filters.resource;

      const logs = await prisma.auditoria.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        take: filters?.limit ?? 100,
        skip: filters?.offset ?? 0,
        include: {
          Usuario: {
            select: { id: true, nomeCompleto: true, email: true },
          },
        },
      });

      return {
        logs,
        total: logs.length,
        hasMore: logs.length === (filters?.limit ?? 100),
      };
    } catch (error) {
      console.error('[AUDIT] Erro ao buscar logs:', error);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  // ─── Métodos de entidade genéricos (unificação com AuditService) ──────────

  /**
   * Registra ação de entidade genérica (substitui AuditService.logAction).
   */
  static async logAction(
    userId: number,
    entidade: string,
    entidadeId: number | string,
    acao: string,
    diff?: Record<string, unknown>
  ) {
    // Mapear ação string → enum
    const acaoEnum = this.mapAcaoEnum(acao);

    try {
      await prisma.auditoria.create({
        data: {
          tabela: entidade,
          registroId: typeof entidadeId === 'number' ? entidadeId : parseInt(String(entidadeId)) || 0,
          acao: acaoEnum,
          usuarioId: userId,
          payload: diff ? JSON.stringify(diff) : undefined,
        },
      });
    } catch (error) {
      console.error('[AUDIT] Erro ao registrar ação:', error);
    }
  }

  /**
   * Busca histórico de uma entidade (substitui AuditService.getEntityHistory).
   */
  static async getEntityHistory(
    entidade: string,
    entidadeId: number | string,
    limit = 50
  ) {
    try {
      return await prisma.auditoria.findMany({
        where: {
          tabela: entidade,
          registroId: typeof entidadeId === 'number' ? entidadeId : parseInt(String(entidadeId)) || 0,
        },
        include: {
          Usuario: {
            select: { id: true, nomeCompleto: true, email: true },
          },
        },
        orderBy: { criadoEm: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('[AUDIT] Erro ao buscar histórico:', error);
      return [];
    }
  }

  /**
   * Busca ações por usuário (substitui AuditoriaService.buscarPorUsuario).
   */
  static async getUserActions(userId: number, limit = 100) {
    try {
      return await prisma.auditoria.findMany({
        where: {
          OR: [
            { usuarioId: userId },
            { tabela: 'Usuario', registroId: userId },
          ],
        },
        include: {
          Usuario: {
            select: { id: true, nomeCompleto: true, email: true },
          },
        },
        orderBy: { criadoEm: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('[AUDIT] Erro ao buscar ações do usuário:', error);
      return [];
    }
  }

  // ─── Helpers privados ────────────────────────────────────────────────────

  private static mapAcaoEnum(action: string): AuditAction {
    const upper = action.toUpperCase();
    if (upper.includes('CREATE') || upper === 'FIRST_ACCESS_SETUP') return 'CREATE';
    if (upper.includes('UPDATE') || upper.includes('MODIFICATION')) return 'UPDATE';
    if (upper.includes('DELETE')) return 'DELETE';
    if (upper.includes('LOGOUT')) return 'LOGOUT';
    return 'LOGIN'; // Fallback para LOGIN, MFA, ACCESS etc.
  }
}

// ─── Backward-compatible exports ──────────────────────────────────────────────
// Permitem migração gradual: imports antigos continuam funcionando.

/**
 * @deprecated Use AuditLogger diretamente.
 * Alias para compatibilidade com src/services/auditService.ts
 */
export const AuditService = {
  logAction: AuditLogger.logAction.bind(AuditLogger),
  getEntityHistory: AuditLogger.getEntityHistory.bind(AuditLogger),
};

/**
 * @deprecated Use AuditLogger diretamente.
 * Alias para compatibilidade com src/shared/lib/auditoria.ts
 */
export const AuditoriaService = {
  registrar: async (data: {
    tabela: string;
    registroId: number;
    acao: AuditAction;
    usuarioId?: number;
    ip?: string;
    payload?: Record<string, unknown>;
  }) =>
    AuditLogger.log({
      userId: data.usuarioId,
      action: data.acao,
      resource: data.tabela,
      resourceId: String(data.registroId),
      ip: data.ip,
      details: data.payload,
      status: 'SUCCESS',
    }),
  registrarLogin: (userId: number, ip?: string, userAgent?: string) =>
    AuditLogger.log({
      userId,
      action: 'LOGIN',
      resource: 'Usuario',
      resourceId: String(userId),
      ip,
      userAgent,
      status: 'SUCCESS',
    }),
  registrarLogout: (userId: number, ip?: string, duration?: string) =>
    AuditLogger.log({
      userId,
      action: 'LOGOUT',
      resource: 'Usuario',
      resourceId: String(userId),
      ip,
      details: { duration },
      status: 'SUCCESS',
    }),
  registrarCriacaoUsuario: (userId: number, dados: Record<string, unknown>, adminId?: number, ip?: string) =>
    AuditLogger.log({
      userId: adminId ?? userId,
      action: 'CREATE_USER',
      resource: 'Usuario',
      resourceId: String(userId),
      ip,
      details: dados,
      status: 'SUCCESS',
    }),
  registrarAtualizacaoUsuario: (userId: number, before: Record<string, unknown>, after: Record<string, unknown>, adminId?: number, ip?: string) =>
    AuditLogger.log({
      userId: adminId ?? userId,
      action: 'UPDATE_USER',
      resource: 'Usuario',
      resourceId: String(userId),
      ip,
      details: { before, after },
      status: 'SUCCESS',
    }),
  registrarExclusaoUsuario: (userId: number, dados: Record<string, unknown>, adminId?: number, ip?: string) =>
    AuditLogger.log({
      userId: adminId ?? userId,
      action: 'DELETE_USER',
      resource: 'Usuario',
      resourceId: String(userId),
      ip,
      details: dados,
      status: 'SUCCESS',
    }),
  buscarPorUsuario: AuditLogger.getUserActions.bind(AuditLogger),
};
