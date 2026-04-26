// src/app/api/auth/me/audit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/shared/lib/rbac";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api/error-handler";

export const runtime = "nodejs";

// GET /api/auth/me/audit — eventos de auditoria do próprio usuário logado
export const GET = withErrorHandler(async (req: NextRequest) => {
  const me = await requireUser(req);
  const userId = Number(me.id);

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get("pageSize") ?? 20)));
  const skip = (page - 1) * pageSize;

  // Buscar AuditLog e TentativaLogin em paralelo
  const [auditLogs, tentativas, totalAudit, totalTentativas] = await Promise.all([
    prisma.$queryRaw<Array<{
      id: string;
      acao: string;
      entidade: string;
      entidadeId: string;
      diff: string | null;
      timestamp: Date;
    }>>`
      SELECT id, acao, entidade, entidadeId, diff, timestamp
      FROM AuditLog
      WHERE userId = ${userId}
      ORDER BY timestamp DESC
      LIMIT ${pageSize} OFFSET ${skip}
    `,
    prisma.$queryRaw<Array<{
      id: number;
      sucesso: boolean;
      motivo: string | null;
      ip: string | null;
      criadaEm: Date;
    }>>`
      SELECT id, sucesso, motivo, ip, criadaEm
      FROM TentativaLogin
      WHERE usuarioId = ${userId}
      ORDER BY criadaEm DESC
      LIMIT ${pageSize} OFFSET ${skip}
    `,
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) as total FROM AuditLog WHERE userId = ${userId}
    `,
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) as total FROM TentativaLogin WHERE usuarioId = ${userId}
    `,
  ]);

  const normalizedAudit = auditLogs.map((log) => ({
    tipo: "audit" as const,
    id: log.id,
    acao: log.acao,
    entidade: log.entidade,
    entidadeId: log.entidadeId,
    timestamp: log.timestamp instanceof Date
      ? log.timestamp.toISOString()
      : String(log.timestamp),
  }));

  const normalizedTentativas = tentativas.map((t) => ({
    tipo: "login_attempt" as const,
    id: String(t.id),
    sucesso: Boolean(t.sucesso),
    motivo: t.motivo ?? null,
    ip: t.ip ?? null,
    timestamp: t.criadaEm instanceof Date
      ? t.criadaEm.toISOString()
      : String(t.criadaEm),
  }));

  return NextResponse.json({
    data: {
      auditLogs: normalizedAudit,
      tentativasLogin: normalizedTentativas,
    },
    pagination: {
      page,
      pageSize,
      totalAudit: Number(totalAudit[0]?.total ?? 0),
      totalTentativas: Number(totalTentativas[0]?.total ?? 0),
    },
    success: true,
  });
});
