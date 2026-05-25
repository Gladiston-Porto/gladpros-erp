// src/lib/mfa.ts
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export interface MFACodeData {
  id: number;
  usuarioId: number;
  codigo: string;
  tipoAcao: 'LOGIN' | 'RESET' | 'PRIMEIRO_ACESSO' | 'DESBLOQUEIO';
  expiresAt: Date;
  usado: boolean;
  criadoEm: Date;
  ip?: string;
  userAgent?: string;
}

type MFATableDelegate = {
  deleteMany?: (args: { where: Record<string, unknown> }) => Promise<{ count: number }>;
  create?: (args: {
    data: Record<string, unknown>;
    select: { id: true };
  }) => Promise<{ id: number }>;
  findFirst?: (args: {
    where: Record<string, unknown>;
    orderBy: { criadoEm: 'desc' };
    select: { id: true; expiresAt: true; usado: true };
  }) => Promise<{ id: number; expiresAt: Date; usado: boolean } | null>;
  update?: (args: { where: { id: number }; data: { usado: boolean } }) => Promise<void>;
  count?: (args: { where: { usuarioId: number; criadoEm: { gt: Date } } }) => Promise<number>;
};

export class MFAService {
  private static get delegate(): MFATableDelegate | undefined {
    // Delegate é gerado em runtime; em ambientes HMR pode não estar pronto ainda
    // Usa typeof para inferir o tipo do delegate existente sem recorrer a any
    try {
      const d = (prisma as unknown as { codigoMFA?: MFATableDelegate }).codigoMFA;
      return d;
    } catch {
      return undefined;
    }
  }
  // Gera código de 6 dígitos (criptograficamente seguro)
  static generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Hash do código para armazenamento seguro
  static hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  // Cria e armazena código MFA
  static async createMFACode({
    usuarioId,
    tipoAcao = 'LOGIN',
    ip,
    userAgent,
  }: {
    usuarioId: number;
    tipoAcao?: 'LOGIN' | 'RESET' | 'PRIMEIRO_ACESSO' | 'DESBLOQUEIO';
    ip?: string;
    userAgent?: string;
  }): Promise<{ code: string; id: number }> {
    // Limpar códigos antigos usados ou expirados do usuário
    if (this.delegate?.deleteMany) {
      await this.delegate.deleteMany({
        where: {
          usuarioId,
          tipoAcao: tipoAcao,
          OR: [{ usado: true }, { expiresAt: { lt: new Date() } }],
        },
      });
    } else {
      await prisma.$executeRaw`
        DELETE FROM CodigoMFA
        WHERE usuarioId = ${usuarioId}
        AND tipoAcao = ${tipoAcao}
        AND (usado = TRUE OR expiresAt < NOW())
      `;
    }

    const code = this.generateCode();
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    if (this.delegate?.create) {
      const created = await this.delegate.create({
        data: {
          usuarioId,
          codigo: codeHash,
          tipoAcao: tipoAcao,
          expiresAt,
          usado: false,
          ip,
          userAgent,
        },
        select: { id: true },
      });
      // In development or explicit test mode, also keep last code in-memory for E2E helper routes
      if (
        process.env.NODE_ENV === 'development' ||
        process.env.TEST_MODE === 'true' ||
        process.env.E2E_MODE === '1'
      ) {
        const g = global as unknown as {
          __lastMFA?: { usuarioId: number; code: string; id: number; tipoAcao: string };
          __lastMFAByUser?: Record<
            number,
            { usuarioId: number; code: string; id: number; tipoAcao: string }
          >;
        };
        const entry = { usuarioId, code, id: created.id, tipoAcao };
        g.__lastMFA = entry; // backward compat — single-slot
        if (!g.__lastMFAByUser) g.__lastMFAByUser = {};
        g.__lastMFAByUser[usuarioId] = entry; // per-userId — prevents cross-worker interference
      }
      return { code, id: created.id };
    } else {
      await prisma.$executeRaw`
        INSERT INTO CodigoMFA (usuarioId, codigo, tipoAcao, expiresAt, ip, userAgent)
        VALUES (${usuarioId}, ${codeHash}, ${tipoAcao}, ${expiresAt}, ${ip}, ${userAgent})
      `;
      const rows: Array<{ id: number }> = await prisma.$queryRaw`
        SELECT id FROM CodigoMFA
        WHERE usuarioId = ${usuarioId}
        AND tipoAcao = ${tipoAcao}
        AND usado = FALSE
        ORDER BY criadoEm DESC
        LIMIT 1
      `;
      return { code, id: rows[0]?.id || 0 };
    }
  }

  // Verifica se código é válido
  static async verifyMFACode({
    usuarioId,
    code,
    tipoAcao = 'LOGIN',
  }: {
    usuarioId: number;
    code: string;
    tipoAcao?: 'LOGIN' | 'RESET' | 'PRIMEIRO_ACESSO' | 'DESBLOQUEIO';
  }): Promise<{ valid: boolean; error?: string; codeId?: number }> {
    const codeHash = this.hashCode(code);

    const mfaCode = this.delegate?.findFirst
      ? await this.delegate.findFirst({
          where: {
            usuarioId,
            codigo: codeHash,
            tipoAcao: tipoAcao,
          },
          orderBy: { criadoEm: 'desc' },
          select: { id: true, expiresAt: true, usado: true },
        })
      : (
          await prisma.$queryRaw<Array<{ id: number; expiresAt: Date; usado: boolean }>>`
          SELECT id, expiresAt, usado
          FROM CodigoMFA
          WHERE usuarioId = ${usuarioId}
          AND codigo = ${codeHash}
          AND tipoAcao = ${tipoAcao}
          ORDER BY criadoEm DESC
          LIMIT 1
        `
        )[0];
    if (!mfaCode) {
      return { valid: false, error: 'Código inválido' };
    }

    if (mfaCode.usado) {
      return { valid: false, error: 'Código já foi utilizado' };
    }

    if (new Date() > mfaCode.expiresAt) {
      return { valid: false, error: 'Código expirado' };
    }

    // Marcação atômica para evitar race condition (duas verificações concorrentes).
    const updated = await prisma.$executeRaw`
      UPDATE CodigoMFA
      SET usado = TRUE
      WHERE id = ${mfaCode.id}
        AND usado = FALSE
        AND expiresAt > NOW()
    `;

    if (Number(updated) === 0) {
      return { valid: false, error: 'Código já foi utilizado' };
    }

    return { valid: true, codeId: mfaCode.id };
  }

  // Limpar códigos expirados (pode ser executado periodicamente)
  static async cleanupExpiredCodes(): Promise<number> {
    if (this.delegate?.deleteMany) {
      const res = await this.delegate.deleteMany({
        where: {
          OR: [{ usado: true }, { expiresAt: { lt: new Date() } }],
        },
      });
      return res.count;
    } else {
      const result = await prisma.$executeRaw`
        DELETE FROM CodigoMFA 
        WHERE expiresAt < NOW() OR usado = TRUE
      `;
      return Number(result);
    }
  }

  // Contar tentativas MFA recentes para rate limiting
  static async countRecentAttempts(usuarioId: number, minutes = 15): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    if (this.delegate?.count) {
      return await this.delegate.count({ where: { usuarioId, criadoEm: { gt: since } } });
    } else {
      const rows: Array<{ count: number }> = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM CodigoMFA
        WHERE usuarioId = ${usuarioId}
        AND criadoEm > ${since}
      `;
      return rows[0]?.count || 0;
    }
  }
}
