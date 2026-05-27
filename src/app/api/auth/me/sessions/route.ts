// src/app/api/auth/me/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { revokeAllUserTokens, revokeAllUserTokensExceptSession } from '@/lib/auth/token-service';

export const runtime = 'nodejs';

// GET /api/auth/me/sessions — lista sessões ativas do usuário logado
export const GET = withErrorHandler(async (req: NextRequest) => {
  const me = await requireUser(req);
  const userId = Number(me.id);
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const requestedPageSize = Number(url.searchParams.get('pageSize') || '20');
  const pageSize = Math.min(100, Math.max(1, requestedPageSize));
  const skip = (page - 1) * pageSize;

  // Ler token atual do cookie para identificar sessão corrente
  const currentToken = req.cookies.get('sessionToken')?.value ?? null;

  const countRows = await prisma.$queryRaw<Array<{ total: bigint | number }>>`
    SELECT COUNT(*) as total
    FROM SessaoAtiva
    WHERE usuarioId = ${userId}
  `;
  const total = Number(countRows[0]?.total ?? 0);

  const sessions = await prisma.$queryRaw<
    Array<{
      id: number;
      ip: string | null;
      userAgent: string | null;
      cidade: string | null;
      pais: string | null;
      ultimaAtividade: Date;
      criadoEm: Date;
      token: string;
    }>
  >`
    SELECT id, ip, userAgent, cidade, pais, ultimaAtividade, criadoEm, token
    FROM SessaoAtiva
    WHERE usuarioId = ${userId}
    ORDER BY ultimaAtividade DESC
    LIMIT ${pageSize}
    OFFSET ${skip}
  `;

  const result = sessions.map((s) => ({
    id: s.id,
    ip: s.ip ?? '—',
    userAgent: s.userAgent ?? null,
    cidade: s.cidade ?? null,
    pais: s.pais ?? null,
    ultimaAtividade:
      s.ultimaAtividade instanceof Date
        ? s.ultimaAtividade.toISOString()
        : String(s.ultimaAtividade),
    criadoEm: s.criadoEm instanceof Date ? s.criadoEm.toISOString() : String(s.criadoEm),
    isCurrent: currentToken !== null && s.token === currentToken,
  }));

  return NextResponse.json({
    data: result,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    success: true,
  });
});

// POST /api/auth/me/sessions/revoke-others — encerra todas as sessões exceto a atual
export const POST = withErrorHandler(async (req: NextRequest) => {
  const me = await requireUser(req);
  const userId = Number(me.id);

  const currentToken = req.cookies.get('sessionToken')?.value ?? null;
  let currentSessionId: number | null = null;

  if (currentToken) {
    const currentRows = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM SessaoAtiva
      WHERE usuarioId = ${userId}
        AND token = ${currentToken}
      LIMIT 1
    `;
    currentSessionId = Number(currentRows[0]?.id ?? 0) || null;
  }

  if (currentToken) {
    await prisma.$executeRaw`
      DELETE FROM SessaoAtiva
      WHERE usuarioId = ${userId}
      AND token != ${currentToken}
    `;
    if (currentSessionId) {
      await revokeAllUserTokensExceptSession(
        userId,
        currentSessionId,
        'Revogação de outras sessões pelo usuário',
      );
    }
  } else {
    await prisma.$executeRaw`
      DELETE FROM SessaoAtiva
      WHERE usuarioId = ${userId}
    `;
    await revokeAllUserTokens(userId, 'Revogação de todas as sessões pelo usuário');
  }

  await prisma.auditLog.create({
    data: {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      entidade: 'SessaoAtiva',
      entidadeId: String(userId),
      acao: 'REVOKE_ALL_SESSIONS',
      diff: JSON.stringify({ action: 'revoke-others' }),
    },
  });

  return NextResponse.json({ success: true, message: 'Sessões encerradas com sucesso' });
});
