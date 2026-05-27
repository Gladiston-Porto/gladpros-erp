import { withErrorHandler } from '@/lib/api/error-handler';
import { logger } from '@/lib/api/logger';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthJWT } from '@/shared/lib/jwt';
import { hasTokenVersionColumn } from '@/shared/lib/db-metadata';
import { revokeRefreshToken, revokeTokensForSession } from '@/lib/auth/token-service';

export const POST = withErrorHandler(async (request: Request) => {
  const payload: Record<string, unknown> = {
    message: 'Logout realizado com sucesso',
    success: true,
  };

  try {
    // Extrair cookies (Next.js Web API Request)
    const cookieHeader = (request.headers as { get?: (key: string) => string | undefined }).get?.(
      'cookie',
    ) as string | undefined;
    const sessionToken = cookieHeader
      ?.split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith('sessionToken='))
      ?.split('=')[1];
    const deviceTrustToken = cookieHeader
      ?.split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith('deviceTrust='))
      ?.split('=')[1];
    const cookieAuthToken = cookieHeader
      ?.split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith('authToken='))
      ?.split('=')[1];

    // Extrair refresh token do cookie
    const cookieRefreshToken = cookieHeader
      ?.split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith('refreshToken='))
      ?.split('=')[1];

    // Accept Authorization: Bearer <token> as alternative
    const authHeader = (request.headers as { get?: (key: string) => string | undefined }).get?.(
      'authorization',
    ) as string | undefined;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const authToken = cookieAuthToken ?? headerToken;

    const asyncTasks: Array<Promise<void>> = [];
    let currentSessionId: number | null = null;
    let currentUserId: number | null = null;

    if (sessionToken) {
      const sessionRows = await prisma.$queryRaw<Array<{ id: number; usuarioId: number }>>`
        SELECT id, usuarioId FROM SessaoAtiva
        WHERE token = ${sessionToken}
        LIMIT 1
      `;
      currentSessionId = Number(sessionRows[0]?.id ?? 0) || null;
      currentUserId = Number(sessionRows[0]?.usuarioId ?? 0) || null;
    }

    if (cookieRefreshToken) {
      asyncTasks.push(
        revokeRefreshToken(cookieRefreshToken, 'Logout do usuário').catch((e: unknown) => {
          logger.warn('[Logout] Falha ao revogar refresh token', { error: e });
        }),
      );
    }

    if (sessionToken) {
      asyncTasks.push(
        import('@/shared/lib/security')
          .then(({ SecurityService }) => SecurityService.revokeSessionByToken(sessionToken))
          .catch((e: unknown) => {
            logger.warn('[Logout] Falha ao revogar sessão por token', { error: e });
          }),
      );
    }

    if (currentSessionId) {
      asyncTasks.push(
        revokeTokensForSession(currentSessionId, 'Logout da sessão atual').catch((e: unknown) => {
          logger.warn('[Logout] Falha ao revogar refresh tokens da sessão', { error: e });
        }),
      );
    }

    // Fallback legado: se não há vínculo de sessão, usar tokenVersion para invalidar.
    if (authToken) {
      asyncTasks.push(
        (async () => {
          try {
            const claims = await verifyAuthJWT(authToken);
            const userId = Number(claims.sub);
            currentUserId = currentUserId ?? (!Number.isNaN(userId) ? userId : null);
            const hasCol = await hasTokenVersionColumn();
            if (!currentSessionId && !Number.isNaN(userId) && hasCol) {
              try {
                await prisma.$executeRaw`UPDATE Usuario SET tokenVersion = tokenVersion + 1 WHERE id = ${userId}`;
              } catch {
                // Falha transitória: ignore
              }
            }
          } catch {
            // token inválido, ignore
          }
        })(),
      );
    }

    if (deviceTrustToken) {
      asyncTasks.push(
        prisma.$executeRaw`
          DELETE FROM DispositivoConfiavel
          WHERE deviceToken = ${deviceTrustToken}
            ${currentUserId ? prisma.$queryRaw`AND usuarioId = ${currentUserId}` : prisma.$queryRaw``}
        `.catch((e: unknown) => {
          logger.warn('[Logout] Falha ao revogar deviceTrust', { error: e });
        }) as unknown as Promise<void>,
      );
    }

    if (asyncTasks.length > 0) {
      await Promise.all(asyncTasks);
    }
  } catch {
    logger.warn('[Logout] Falha ao processar cookies');
  }

  // Limpar todos os cookies de autenticação
  const res = NextResponse.json(payload);
  res.cookies.set('authToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  res.cookies.set('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
  });
  res.cookies.set('sessionToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  res.cookies.set('deviceTrust', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return res;
});
