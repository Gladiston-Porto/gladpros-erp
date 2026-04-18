// src/lib/blocking.ts
import { prisma } from "@/lib/prisma";

type TentativaDelegate = {
  create?: (args: { data: { usuarioId: number | null; email: string; sucesso: boolean; ip: string | null; userAgent: string | null; motivo?: string | null } }) => Promise<void>;
  deleteMany?: (args: { where: { usuarioId: number; sucesso?: boolean } }) => Promise<{ count: number }>;
  count?: (args: { where: { usuarioId: number; sucesso: boolean; criadaEm: { gt: Date } } }) => Promise<number>;
};

type UsuarioDelegate = {
  update?: (args: { where: { id: number }; data: { bloqueado?: boolean; bloqueadoEm?: Date | null } }) => Promise<void>;
  findUnique?: (args: { where: { id: number }; select: Record<string, boolean> }) => Promise<unknown>;
};

export interface BlockInfo {
  blocked: boolean;
  unlockAt?: Date;
  requiresPinUnlock?: boolean;
  requiresSecurityQuestion?: boolean;
  attemptCount?: number;
}

export interface FailedAttemptData {
  userId?: number;
  email?: string;
  ip?: string;
  userAgent?: string;
}

export class BlockingService {
  private static get tentativaDelegate(): TentativaDelegate | undefined {
    return (prisma as unknown as { tentativaLogin?: TentativaDelegate }).tentativaLogin;
  }

  private static get usuarioDelegate(): UsuarioDelegate | undefined {
    // Temporariamente desativa o uso do delegate Prisma para Usuario para evitar
    // erros de validação quando o client está desatualizado em relação ao schema
    // (ex.: campos bloqueado/bloqueadoEm ainda não gerados). Usa SQL bruto como fallback.
    // Reative definindo USE_PRISMA_DELEGATES=1 quando o Prisma Client estiver gerado.
    if (process.env.USE_PRISMA_DELEGATES === "1") {
      return (prisma as unknown as { usuario?: UsuarioDelegate }).usuario;
    }
    return undefined;
  }
  // Configuração do sistema de bloqueio
  private static readonly BLOCK_THRESHOLDS = [
    { attempts: 5, blockMinutes: 1 },    // 5 tentativas = 1 minuto
    { attempts: 8, blockMinutes: 5 },    // 8 tentativas = 5 minutos
    { attempts: 12, blockMinutes: 30 },  // 12 tentativas = 30 minutos
    { attempts: 15, blockMinutes: 120 }, // 15 tentativas = 2 horas
    { attempts: 20, blockMinutes: 0 }    // 20 tentativas = bloqueio permanente
  ];

  // Registrar tentativa de login falhada
  static async recordFailedAttempt({
    userId,
    email,
    ip,
    userAgent,
    motivo
  }: FailedAttemptData & { motivo?: 'INVALID_EMAIL' | 'INVALID_PASSWORD' | 'BLOCKED' | 'RATE_LIMIT' }): Promise<void> {
    if (this.tentativaDelegate?.create) {
      await this.tentativaDelegate.create({
        data: {
          usuarioId: userId ?? null,
          email: email ?? 'unknown',
          sucesso: false,
          ip: ip ?? null,
          userAgent: userAgent ?? null,
          motivo: motivo || null
        }
      });
    } else {
      await prisma.$executeRaw`
        INSERT INTO TentativaLogin (usuarioId, email, sucesso, ip, userAgent, motivo)
        VALUES (${userId || null}, ${email || 'unknown'}, FALSE, ${ip || null}, ${userAgent || null}, ${motivo || null})
      `;
    }

    if (userId) {
      await this.updateUserBlockStatus(userId);
    }
  }

  // Desbloquear usuário após autenticação bem-sucedida, mantendo o histórico de tentativas
  static async clearFailedAttempts(usuarioId: number): Promise<void> {
    // Não apagamos tentativas falhas para manter auditoria. Apenas desbloqueia a conta.
    if (this.usuarioDelegate?.update) {
      await this.usuarioDelegate.update({ where: { id: usuarioId }, data: { bloqueado: false, bloqueadoEm: null } });
    } else {
      await prisma.$executeRaw`
        UPDATE Usuario 
        SET bloqueado = FALSE, bloqueadoEm = NULL 
        WHERE id = ${usuarioId}
      `;
    }
  }

  // Verificar se usuário está bloqueado
  static async checkUserBlock(usuarioId: number): Promise<BlockInfo> {
    type UserBlockRow = { bloqueado: boolean; bloqueadoEm: Date | null; pinSeguranca: string | null; perguntaSecreta: string | null };
    const user: UserBlockRow | undefined = this.usuarioDelegate?.findUnique
      ? (await this.usuarioDelegate.findUnique({ where: { id: usuarioId }, select: { bloqueado: true, bloqueadoEm: true, pinSeguranca: true, perguntaSecreta: true } }) as unknown as UserBlockRow | undefined)
      : (await prisma.$queryRaw<Array<UserBlockRow>>`
          SELECT bloqueado, bloqueadoEm, pinSeguranca, perguntaSecreta
          FROM Usuario 
          WHERE id = ${usuarioId}
        `)[0];
    if (!user || !user.bloqueado || !user.bloqueadoEm) {
      return { blocked: false };
    }

    const userData = user;
  const failedCount = await this.getFailedAttemptCount(usuarioId);
    const blockThreshold = this.getBlockThreshold(failedCount);
    
    if (blockThreshold.blockMinutes === 0) {
      // Bloqueio permanente
      return {
        blocked: true,
        requiresPinUnlock: !!userData.pinSeguranca,
        requiresSecurityQuestion: !!userData.perguntaSecreta,
        attemptCount: failedCount
      };
    }

    // Verificar se o tempo de bloqueio expirou
    if (!userData.bloqueadoEm) {
      return { blocked: false };
    }
    
    const unlockAt = new Date(userData.bloqueadoEm.getTime() + blockThreshold.blockMinutes * 60 * 1000);
    const now = new Date();

    if (now >= unlockAt) {
      // Tempo expirado, desbloquear automaticamente
      if (this.usuarioDelegate?.update) {
        await this.usuarioDelegate.update({ where: { id: usuarioId }, data: { bloqueado: false, bloqueadoEm: null } });
      } else {
        await prisma.$executeRaw`
          UPDATE Usuario 
          SET bloqueado = FALSE, bloqueadoEm = NULL 
          WHERE id = ${usuarioId}
        `;
      }
      return { blocked: false };
    }

    return {
      blocked: true,
      unlockAt,
      requiresPinUnlock: !!userData.pinSeguranca,
      requiresSecurityQuestion: !!userData.perguntaSecreta,
      attemptCount: failedCount
    };
  }

  // Atualizar status de bloqueio do usuário
  private static async updateUserBlockStatus(usuarioId: number): Promise<void> {
    const failedCount = await this.getFailedAttemptCount(usuarioId);
    const shouldBlock = failedCount >= 5; // Primeira threshold

    if (shouldBlock) {
      if (this.usuarioDelegate?.update) {
        await this.usuarioDelegate.update({ where: { id: usuarioId }, data: { bloqueado: true, bloqueadoEm: new Date() } });
      } else {
        await prisma.$executeRaw`
          UPDATE Usuario 
          SET bloqueado = TRUE, bloqueadoEm = NOW() 
          WHERE id = ${usuarioId}
        `;
      }
    }
  }

  // Contar tentativas falhadas recentes
  private static async getFailedAttemptCount(usuarioId: number): Promise<number> {
    // Conta falhas desde o último sucesso (ou últimas 24h se não houver sucesso)
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM TentativaLogin 
      WHERE usuarioId = ${usuarioId}
        AND sucesso = FALSE
        AND criadaEm > COALESCE(
          (SELECT MAX(criadaEm) FROM TentativaLogin WHERE usuarioId = ${usuarioId} AND sucesso = TRUE),
          DATE_SUB(NOW(), INTERVAL 24 HOUR)
        )
        AND criadaEm > DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `;

    return rows[0]?.count || 0;
  }

  // Obter configuração de bloqueio baseada no número de tentativas
  private static getBlockThreshold(attemptCount: number): { attempts: number; blockMinutes: number } {
    for (const threshold of this.BLOCK_THRESHOLDS) {
      if (attemptCount <= threshold.attempts) {
        return threshold;
      }
    }
    // Se exceder todas as thresholds, usar a última (bloqueio permanente)
    return this.BLOCK_THRESHOLDS[this.BLOCK_THRESHOLDS.length - 1];
  }

  // Desbloquear usuário usando PIN
  static async unlockWithPin(usuarioId: number, pin: string): Promise<{ success: boolean; error?: string }> {
    type UserPinRow = { pinSeguranca: string | null; bloqueado: boolean };
    const user: UserPinRow | undefined = this.usuarioDelegate?.findUnique
      ? (await this.usuarioDelegate.findUnique({ where: { id: usuarioId }, select: { pinSeguranca: true, bloqueado: true } }) as unknown as UserPinRow | undefined)
      : (await prisma.$queryRaw<Array<UserPinRow>>`
          SELECT pinSeguranca, bloqueado
          FROM Usuario 
          WHERE id = ${usuarioId}
        `)[0];
  if (!user) {
      return { success: false, error: "Usuário não encontrado" };
    }
  if (!user.bloqueado) {
      return { success: false, error: "Usuário não está bloqueado" };
    }
  if (!user.pinSeguranca) {
      return { success: false, error: "PIN de segurança não cadastrado" };
    }

    // Verificar PIN (assumindo que está hasheado)
    const bcrypt = await import("bcryptjs");
  const isValidPin = await bcrypt.compare(pin, user.pinSeguranca);

    if (!isValidPin) {
      return { success: false, error: "PIN inválido" };
    }

  // Desbloquear usuário
  await this.clearFailedAttempts(usuarioId);

    return { success: true };
  }

  // Desbloquear usuário usando pergunta de segurança
  static async unlockWithSecurityQuestion(
    usuarioId: number, 
    answer: string
  ): Promise<{ success: boolean; error?: string }> {
    type UserSecRow = { respostaSecreta: string | null; bloqueado: boolean };
    const user: UserSecRow | undefined = this.usuarioDelegate?.findUnique
      ? (await this.usuarioDelegate.findUnique({ where: { id: usuarioId }, select: { respostaSecreta: true, bloqueado: true } }) as unknown as UserSecRow | undefined)
      : (await prisma.$queryRaw<Array<UserSecRow>>`
          SELECT respostaSecreta, bloqueado
          FROM Usuario 
          WHERE id = ${usuarioId}
        `)[0];

  if (!user) {
      return { success: false, error: "Usuário não encontrado" };
    }
  if (!user.bloqueado) {
      return { success: false, error: "Usuário não está bloqueado" };
    }
  if (!user.respostaSecreta) {
      return { success: false, error: "Resposta de segurança não cadastrada" };
    }

    // Verificar resposta (assumindo que está hasheada)
    const bcrypt = await import("bcryptjs");
  const isValidAnswer = await bcrypt.compare(answer.toLowerCase().trim(), user.respostaSecreta);

    if (!isValidAnswer) {
      return { success: false, error: "Resposta inválida" };
    }

    // Desbloquear usuário
    await this.clearFailedAttempts(usuarioId);

    return { success: true };
  }
}
