/** @deprecated Use @/shared/lib/audit instead */
import { prisma } from '@/lib/prisma'

interface PrismaWithAudit {
  auditLog?: {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>
    findMany: (args: { where: Record<string, unknown>; orderBy?: Record<string, unknown>; take?: number; include?: Record<string, unknown> }) => Promise<Record<string, unknown>[]>
  }
}

/**
 * Service para operações de auditoria
 */
export class AuditService {
  static async logAction(
    userId: number,
    entidade: string,
    entidadeId: number | string,
    acao: string,
    diff?: Record<string, unknown>
  ) {
    try {
      const auditModel = (prisma as unknown as PrismaWithAudit)?.auditLog
      if (!auditModel || typeof auditModel.create !== 'function') {
        // Tabela/modelo de auditoria não disponível: não falhar
        return null
      }
      const auditLog = await auditModel.create({
        data: {
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          entidade,
          entidadeId: entidadeId.toString(),
          acao,
          diff: diff ? JSON.stringify(diff) : null,
          timestamp: new Date()
        }
      })
      return auditLog
    } catch (error) {
      console.error('Erro ao registrar audit log:', error)
      // Não falha a operação principal se o log der erro
      return null
    }
  }

  static async getEntityHistory(
    entidade: string,
    entidadeId: number | string,
    limit: number = 50
  ) {
    try {
      const auditModel = (prisma as unknown as PrismaWithAudit)?.auditLog
      if (!auditModel || typeof auditModel.findMany !== 'function') {
        return []
      }
      const history = await auditModel.findMany({
        where: {
          entidade,
          entidadeId: entidadeId.toString()
        },
        include: {
          usuario: {
            select: {
              id: true,
              nomeCompleto: true,
              email: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: limit
      })
      return history
    } catch (error) {
      console.error('Erro ao buscar histórico:', error)
      return []
    }
  }
}
