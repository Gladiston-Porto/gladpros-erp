// src/lib/security.ts
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { hashAuthToken } from '@/shared/lib/auth-token-hash';

// Minimal Prisma delegate types we consume
type SessaoAtivaRow = {
  id: number;
  usuarioId: number;
  token: string;
  tokenHash: string;
  ip: string | null;
  userAgent: string | null;
  cidade: string | null;
  pais: string | null;
  ultimaAtividade: Date;
  criadoEm: Date;
};

type HistoricoSenhaRow = {
  id: number;
  usuarioId: number;
  senhaHash: string;
  criadaEm: Date;
};

type TentativaLoginRow = {
  id: number;
  email: string;
  ip: string | null;
  userAgent: string | null;
  sucesso: boolean;
  criadaEm: Date;
};

interface SessaoAtivaDelegate {
  create(args: {
    data: { usuarioId: number; token: string; ip?: string | null; userAgent?: string | null };
  }): Promise<SessaoAtivaRow>;
  update(args: {
    where: { token: string };
    data: { ultimaAtividade: Date };
  }): Promise<SessaoAtivaRow>;
  findMany(args: {
    where?: { usuarioId?: number; token?: string };
    include?: unknown;
    orderBy?: { ultimaAtividade: 'desc' | 'asc' };
  }): Promise<SessaoAtivaRow[]>;
  delete(args: { where: { id: number } }): Promise<SessaoAtivaRow>;
  deleteMany(args: {
    where?: { usuarioId?: number; token?: string; ultimaAtividade?: { lt?: Date } };
  }): Promise<{ count: number }>;
}

interface HistoricoSenhaDelegate {
  create(args: { data: { usuarioId: number; senhaHash: string } }): Promise<HistoricoSenhaRow>;
  findMany(args: {
    where: { usuarioId: number };
    orderBy: { criadaEm: 'desc' };
    skip?: number;
    take?: number;
    select?: { id?: true; senhaHash?: true };
  }): Promise<HistoricoSenhaRow[]>;
  deleteMany(args: { where: { id: { in: number[] } } }): Promise<{ count: number }>;
}

interface TentativaLoginDelegate {
  findMany(args: {
    where?: { sucesso?: boolean; criadaEm?: { gt?: Date } };
    orderBy: { criadaEm: 'desc' };
    take?: number;
    select: { id: true; email: true; ip: true; userAgent: true; sucesso: true; criadaEm: true };
  }): Promise<TentativaLoginRow[]>;
}

function sessaoAtiva(): SessaoAtivaDelegate {
  return (prisma as unknown as { sessaoAtiva: SessaoAtivaDelegate }).sessaoAtiva;
}
function historicoSenha(): HistoricoSenhaDelegate {
  return (prisma as unknown as { historicoSenha: HistoricoSenhaDelegate }).historicoSenha;
}
function tentativaLogin(): TentativaLoginDelegate {
  return (prisma as unknown as { tentativaLogin: TentativaLoginDelegate }).tentativaLogin;
}

export interface SessionInfo {
  id: number;
  token: string;
  ip?: string;
  userAgent?: string;
  cidade?: string;
  pais?: string;
  ultimaAtividade: Date;
  criadoEm: Date;
}

export interface LoginAttempt {
  id: number;
  email: string;
  ip?: string;
  userAgent?: string;
  sucesso: boolean;
  motivoFalha?: string;
  criadoEm: Date;
}

// Constantes de segurança
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas
const PASSWORD_HISTORY_LIMIT = 5;
const SESSION_CLEANUP_INTERVAL = 5 * 60 * 1000; // Evita sweep global a cada login

let lastSessionCleanupAt = Date.now(); // Inicializa com agora — evita DELETE global a cada HMR/restart

export class SecurityService {
  // === GESTÃO DE SESSÕES ATIVAS ===
  static async createSession(
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ): Promise<{ id: number; token: string }> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashAuthToken(token);

    // Cleanup de sessões expiradas (throttled).
    const cleanupPromise =
      Date.now() - lastSessionCleanupAt >= SESSION_CLEANUP_INTERVAL
        ? this.cleanExpiredSessions()
            .then(() => {
              lastSessionCleanupAt = Date.now();
            })
            .catch(() => {
              /* ok se tabela ainda não existir */
            })
        : Promise.resolve();

    await cleanupPromise;

    // INSERT direto via SQL — evita o SELECT de read-back que o delegate.create() força.
    await prisma.$executeRaw`
      INSERT INTO SessaoAtiva (usuarioId, token, tokenHash, ip, userAgent, ultimaAtividade, criadoEm)
      VALUES (${usuarioId}, ${tokenHash}, ${tokenHash}, ${ip || null}, ${userAgent || null}, NOW(), NOW())
    `;

    const rows = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM SessaoAtiva
      WHERE tokenHash = ${tokenHash}
      LIMIT 1
    `;

    return {
      id: Number(rows[0]?.id ?? 0),
      token,
    };
  }

  static async updateSessionActivity(token: string) {
    const tokenHash = hashAuthToken(token);
    const delegate = (prisma as unknown as { sessaoAtiva?: SessaoAtivaDelegate }).sessaoAtiva;
    if (delegate?.update) {
      await delegate
        .update({
          where: { token },
          data: { ultimaAtividade: new Date() },
        })
        .catch(() => {
          // Sessão pode não existir (expirada ou revogada)
        });
      return;
    }
    // Fallback SQL
    await prisma.$executeRaw`
      UPDATE SessaoAtiva SET ultimaAtividade = NOW() WHERE tokenHash = ${tokenHash}
    `;
    // Sessão pode não existir (expirada ou revogada)
  }

  static async getUserSessions(usuarioId: number): Promise<SessionInfo[]> {
    const delegate = (prisma as unknown as { sessaoAtiva?: SessaoAtivaDelegate }).sessaoAtiva;
    let sessions: SessaoAtivaRow[];
    if (delegate?.findMany) {
      sessions = await delegate.findMany({
        where: { usuarioId },
        orderBy: { ultimaAtividade: 'desc' },
      });
    } else {
      sessions = await prisma.$queryRaw<Array<SessaoAtivaRow>>`
        SELECT id, usuarioId, token, tokenHash, ip, userAgent, cidade, pais, ultimaAtividade, criadoEm
        FROM SessaoAtiva
        WHERE usuarioId = ${usuarioId}
        ORDER BY ultimaAtividade DESC
      `;
    }

    return sessions.map((s) => ({
      id: s.id,
      token: s.token,
      ip: s.ip || undefined,
      userAgent: s.userAgent || undefined,
      cidade: s.cidade || undefined,
      pais: s.pais || undefined,
      ultimaAtividade: s.ultimaAtividade,
      criadoEm: s.criadoEm,
    }));
  }

  static async revokeSession(sessionId: number) {
    const delegate = (prisma as unknown as { sessaoAtiva?: SessaoAtivaDelegate }).sessaoAtiva;
    if (delegate?.delete) {
      await delegate
        .delete({
          where: { id: sessionId },
        })
        .catch(() => {
          // Sessão pode já ter sido removida
        });
      return;
    }
    await prisma.$executeRaw`
      DELETE FROM SessaoAtiva WHERE id = ${sessionId}
    `;
  }

  static async revokeSessionByToken(token: string) {
    const tokenHash = hashAuthToken(token);
    const delegate = (prisma as unknown as { sessaoAtiva?: SessaoAtivaDelegate }).sessaoAtiva;
    if (delegate?.deleteMany) {
      await delegate.deleteMany({ where: { token } });
      return;
    }
    await prisma.$executeRaw`
      DELETE FROM SessaoAtiva WHERE tokenHash = ${tokenHash}
    `;
  }

  static async revokeAllUserSessions(usuarioId: number) {
    const delegate = (prisma as unknown as { sessaoAtiva?: SessaoAtivaDelegate }).sessaoAtiva;
    if (delegate?.deleteMany) {
      await delegate.deleteMany({ where: { usuarioId } });
      return;
    }
    await prisma.$executeRaw`
      DELETE FROM SessaoAtiva WHERE usuarioId = ${usuarioId}
    `;
  }

  static async cleanExpiredSessions() {
    const expiredTime = new Date(Date.now() - SESSION_TIMEOUT);
    const delegate = (prisma as unknown as { sessaoAtiva?: SessaoAtivaDelegate }).sessaoAtiva;
    if (delegate?.deleteMany) {
      await delegate.deleteMany({ where: { ultimaAtividade: { lt: expiredTime } } });
      return;
    }
    await prisma.$executeRaw`
      DELETE FROM SessaoAtiva WHERE ultimaAtividade < ${expiredTime}
    `;
  }

  // === GESTÃO DE HISTÓRICO DE SENHAS ===
  static async addPasswordToHistory(usuarioId: number, passwordHash: string) {
    await historicoSenha().create({
      data: {
        usuarioId,
        senhaHash: passwordHash,
      },
    });

    // Limitar histórico
    const oldPasswords = await historicoSenha().findMany({
      where: { usuarioId },
      orderBy: { criadaEm: 'desc' },
      skip: PASSWORD_HISTORY_LIMIT,
      select: { id: true },
    });

    if (oldPasswords.length > 0) {
      await historicoSenha().deleteMany({
        where: {
          id: { in: oldPasswords.map((p) => p.id) },
        },
      });
    }
  }

  static async isPasswordReused(usuarioId: number, newPassword: string): Promise<boolean> {
    const recentPasswords = await historicoSenha().findMany({
      where: { usuarioId },
      orderBy: { criadaEm: 'desc' },
      take: PASSWORD_HISTORY_LIMIT,
      select: { senhaHash: true },
    });

    for (const old of recentPasswords) {
      if (await bcrypt.compare(newPassword, old.senhaHash)) {
        return true;
      }
    }

    return false;
  }

  // === RELATÓRIOS DE SEGURANÇA ===
  static async getLoginAttempts(limit: number = 100): Promise<LoginAttempt[]> {
    const attempts = await tentativaLogin().findMany({
      orderBy: { criadaEm: 'desc' },
      take: limit,
      select: {
        id: true,
        email: true,
        ip: true,
        userAgent: true,
        sucesso: true,
        criadaEm: true,
      },
    });

    return attempts.map((a) => ({
      id: a.id,
      email: a.email,
      ip: a.ip || undefined,
      userAgent: a.userAgent || undefined,
      sucesso: a.sucesso,
      criadoEm: a.criadaEm,
    }));
  }

  static async getFailedLogins(hours: number = 24): Promise<LoginAttempt[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const attempts = await tentativaLogin().findMany({
      where: {
        sucesso: false,
        criadaEm: { gt: since },
      },
      orderBy: { criadaEm: 'desc' },
      select: {
        id: true,
        email: true,
        ip: true,
        userAgent: true,
        sucesso: true,
        criadaEm: true,
      },
    });

    return attempts.map((a) => ({
      id: a.id,
      email: a.email,
      ip: a.ip || undefined,
      userAgent: a.userAgent || undefined,
      sucesso: a.sucesso,
      criadoEm: a.criadaEm,
    }));
  }

  // Tentativas (sucesso e falha) de um usuário específico
  static async getLoginAttemptsByUser(
    userId: number,
    limit: number = 100,
  ): Promise<LoginAttempt[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        id: number;
        email: string;
        ip: string | null;
        userAgent: string | null;
        sucesso: boolean;
        motivo: string | null;
        criadaEm: Date;
      }>
    >`
      SELECT id, email, ip, userAgent, sucesso, motivo, criadaEm
      FROM TentativaLogin
      WHERE usuarioId = ${userId}
      ORDER BY criadaEm DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      ip: r.ip || undefined,
      userAgent: r.userAgent || undefined,
      sucesso: r.sucesso,
      motivoFalha: r.motivo || undefined,
      criadoEm: r.criadaEm,
    }));
  }

  static async getActiveSessions(): Promise<SessionInfo[]> {
    const sessions = await sessaoAtiva().findMany({
      include: {
        usuario: {
          select: {
            nomeCompleto: true,
            email: true,
          },
        },
      },
      orderBy: { ultimaAtividade: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      token: s.token,
      ip: s.ip || undefined,
      userAgent: s.userAgent || undefined,
      cidade: s.cidade || undefined,
      pais: s.pais || undefined,
      ultimaAtividade: s.ultimaAtividade,
      criadoEm: s.criadoEm,
    }));
  }
}
