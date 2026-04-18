import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import type { PropostaLog_action, Proposta_status, Auditoria_acao } from '@prisma/client'

// ===== TIPOS =====
// Interfaces serão definidas conforme necessário durante implementação

// ===== ESQUEMAS =====

export const CreatePropostaLogSchema = z.object({
  propostaId: z.number(),
  actorId: z.number().optional(),
  action: z.string(),
  oldJson: z.any().optional(),
  newJson: z.any().optional(),
  ip: z.string().optional(),
})

export const UpdatePropostaStatusSchema = z.object({
  propostaId: z.number(),
  status: z.string(),
  actorId: z.number(),
  ip: z.string().optional(),
})

// ===== SERVIÇO DE LOGS DE PROPOSTA =====

export class PropostaLogService {
  static async createLog(data: z.infer<typeof CreatePropostaLogSchema>) {
    const log = await prisma.propostaLog.create({
      data: {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        propostaId: data.propostaId,
        actorId: data.actorId || null,
        action: data.action as PropostaLog_action,
        oldJson: data.oldJson ? JSON.stringify(data.oldJson) : null,
        newJson: data.newJson ? JSON.stringify(data.newJson) : null,
        ip: data.ip || null,
      },
    })

    return log
  }

  static async getLogs(propostaId: number) {
    const logs = await prisma.propostaLog.findMany({
      where: { propostaId },
      include: {
        // Note: actor relation not defined in schema, using actorId directly
      },
      orderBy: { createdAt: 'desc' },
    })

    return logs
  }

  static async updatePropostaStatus(data: z.infer<typeof UpdatePropostaStatusSchema>) {
    // Buscar proposta atual para log
    const propostaAtual = await prisma.proposta.findUnique({
      where: { id: data.propostaId },
    })

    if (!propostaAtual) {
      throw new Error('Proposta não encontrada')
    }

    // Atualizar status
    const proposta = await prisma.proposta.update({
      where: { id: data.propostaId },
      data: { status: data.status as Proposta_status },
    })

    // Criar log da mudança
    await this.createLog({
      propostaId: data.propostaId,
      actorId: data.actorId,
      action: 'UPDATED',
      oldJson: { status: propostaAtual.status },
      newJson: { status: data.status },
      ip: data.ip,
    })

    return proposta
  }
}

// ===== SERVIÇO DE AUDITORIA =====

export class AuditService {
  static async logAction(
    userId: number,
    entidade: string,
    entidadeId: string,
    acao: string,
    diff?: Record<string, unknown>,
    ip?: string
  ) {
    const auditLog = await prisma.auditLog.create({
      data: {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        entidade,
        entidadeId,
        acao,
        diff: diff ? JSON.stringify(diff) : null,
      },
    })

    // Também criar entrada na tabela Auditoria se necessário
    if (ip) {
      await prisma.auditoria.create({
        data: {
          tabela: entidade,
          registroId: parseInt(entidadeId) || 0,
          acao: acao as Auditoria_acao,
          usuarioId: userId,
          ip,
          payload: diff ? JSON.stringify(diff) : null,
        },
      })
    }

    return auditLog
  }

  static async getAuditLogs(entidade: string, entidadeId: string) {
    const logs = await prisma.auditLog.findMany({
      where: { entidade, entidadeId },
      include: {
        Usuario: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    })

    return logs
  }
}

// ===== SERVIÇO DE SESSÕES =====

export class SessionService {
  static async getActiveSessions(userId: number) {
    const sessions = await prisma.sessaoAtiva.findMany({
      where: { usuarioId: userId },
      orderBy: { criadoEm: 'desc' },
    })

    return sessions
  }

  static async invalidateSession(sessionId: string) {
    await prisma.sessaoAtiva.delete({
      where: { id: Number(sessionId) },
    })

    return { success: true }
  }

  static async invalidateAllUserSessions(userId: number) {
    await prisma.sessaoAtiva.deleteMany({
      where: { usuarioId: userId },
    })

    return { success: true }
  }
}

// ===== SERVIÇO DE TENTATIVAS DE LOGIN =====

export class LoginAttemptService {
  static async logAttempt(
    email: string,
    sucesso: boolean,
    ip?: string,
    userAgent?: string,
    motivo?: string
  ) {
    // Encontrar usuário pelo email
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    })

    const attempt = await prisma.tentativaLogin.create({
      data: {
        email,
        usuarioId: usuario?.id || null,
        sucesso,
        ip: ip || null,
        userAgent: userAgent || null,
        motivo: motivo || null,
      },
    })

    return attempt
  }

  static async getRecentAttempts(email: string, limit = 10) {
    const attempts = await prisma.tentativaLogin.findMany({
      where: { email },
      orderBy: { criadaEm: 'desc' },
      take: limit,
    })

    return attempts
  }

  static async getFailedAttemptsCount(email: string, minutes = 15) {
    const since = new Date(Date.now() - minutes * 60 * 1000)

    const count = await prisma.tentativaLogin.count({
      where: {
        email,
        sucesso: false,
        criadaEm: { gte: since },
      },
    })

    return count
  }
}

// ===== UTILITÁRIOS =====

export class Fase3Utils {
  static async validatePropostaAccess(propostaId: number, userId: number) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // userId will be used when RBAC logic is implemented
    const proposta = await prisma.proposta.findUnique({
      where: { id: propostaId },
      select: { clienteId: true },
    })

    if (!proposta) {
      throw new Error('Proposta não encontrada')
    }

    // Verificar se o usuário tem acesso a esta proposta
    // Implementar lógica de RBAC aqui
    return { hasAccess: true, proposta }
  }

  static async getPropostaWithDetails(propostaId: number) {
    const proposta = await prisma.proposta.findUnique({
      where: { id: propostaId },
      include: {
        Cliente: true,
        PropostaEtapa: true,
        PropostaMaterial: true,
        AnexoProposta: true,
        PropostaLog: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return proposta
  }
}
